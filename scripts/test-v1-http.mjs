// Optional end-to-end test using disposable local PostgreSQL, PostgREST and simulated Supabase Auth.
// Set POSTGREST_BINARY. Set FLOWIE_UI_TEST=1 and optionally CHROMIUM_PATH for browser checks.
import EmbeddedPostgres from 'embedded-postgres';
import { readFile,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID,createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
const binary=process.env.POSTGREST_BINARY;
if(!binary) throw Error('請設定 POSTGREST_BINARY 為本機 PostgREST 執行檔。');
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const [dbPort,restPort,proxyPort,apiPort,webPort]=await Promise.all([port(),port(),port(),port(),port()]);
const temp=await mkdtemp(path.join(tmpdir(),'flowie-http-'));
const pg=new EmbeddedPostgres({databaseDir:path.join(temp,'db'),user:'postgres',password:'localtest',port:dbPort,persistent:false,postgresFlags:['-c','unix_socket_directories='],onLog:()=>{},onError:()=>{}});
const secret='local-test-jwt-secret-not-for-production-123456789';
const uid={admin:randomUUID(),teacher:randomUUID(),student:randomUUID()};
const jwt=(id)=>{const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const a=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600});return a+'.'+createHmac('sha256',secret).update(a).digest('base64url')};
const tokens=Object.fromEntries(Object.entries(uid).map(([k,v])=>[k,jwt(v)]));
const user=(name)=>({id:uid[name],aud:'authenticated',role:'authenticated',email:name+'@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()});
let db,rest,backend,web,proxy,browser;let errors='';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.status<500)return}catch{}await sleep(100)}throw Error('服務啟動逾時 '+url+' '+errors.slice(-1000))}
async function call(route,{method='GET',who,body,expected=200}={}) {
 const r=await fetch('http://127.0.0.1:'+apiPort+'/api/v1'+route,{method,headers:{'content-type':'application/json',...(who?{authorization:'Bearer '+tokens[who]}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const payload=await r.json();assert.equal(r.status,expected,method+' '+route+' '+JSON.stringify(payload));return payload;
}
try {
 await pg.initialise();await pg.start();db=pg.getPgClient();await db.connect();
 await db.query(`create role anon;create role authenticated;create role authenticator noinherit login password 'localtest';grant anon,authenticated to authenticator;create schema extensions;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const f of ['Flowie_V1_Supabase_SQL_和設定說明/01_Flowie_建立資料表.sql','Flowie_V1_Supabase_SQL_和設定說明/02_Flowie_新增示範資料.sql','supabase/v1_incremental/05_flowie_v1_api_and_transactions.sql','supabase/v1_incremental/06_flowie_v1_report_session_count.sql'])await db.query(await readFile(f,'utf8'));
 for(const [name,id] of Object.entries(uid)){await db.query('insert into auth.users(id,email) values($1,$2)',[id,name+'@example.test']);await db.query('update public.profiles set display_name=$2 where id=$1',[id,name==='teacher'?'示範老師':name]);}
 const adminScript=(await readFile('Flowie_V1_Supabase_SQL_和設定說明/03_Flowie_指定第一位管理員.sql','utf8')).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,uid.admin);
 await db.query(adminScript);
 const demo=(await readFile('Flowie_V1_Supabase_SQL_和設定說明/04_Flowie_建立示範老師與場次.sql','utf8')).replace(/teacher_user_id uuid := '[^']+'(?:::uuid)?;/,"teacher_user_id uuid := '"+uid.teacher+"'::uuid;");
 if(!demo.includes(uid.teacher))throw Error('無法替換示範老師 UID');
 await db.query(demo);
 const session='90000000-0000-4000-8000-000000000001';
 await db.query("update public.class_sessions set capacity=1,cancellation_deadline_override_at=starts_at-interval '1 hour' where id=$1",[session]);
 rest=spawn(binary,[],{env:{...process.env,PGRST_DB_URI:'postgresql://authenticator:localtest@127.0.0.1:'+dbPort+'/postgres',PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:String(restPort)},stdio:['ignore','ignore','pipe']});rest.stderr.on('data',d=>errors+=String(d));
 await wait('http://127.0.0.1:'+restPort+'/');
 proxy=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  if(req.url.startsWith('/auth/v1/user')){
   const name=Object.keys(tokens).find(k=>req.headers.authorization==='Bearer '+tokens[k]);res.writeHead(name?200:401,{'content-type':'application/json'});res.end(JSON.stringify(name?user(name):{msg:'bad token'}));return;
  }
  if(req.url.startsWith('/auth/v1/token')){
   let raw='';req.on('data',x=>raw+=x);req.on('end',()=>{let data={};try{data=JSON.parse(raw)}catch{}const name=Object.keys(uid).find(k=>data.email===k+'@example.test');if(!name||data.password!=='test-pass-123'){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({msg:'bad login'}));return}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({access_token:tokens[name],token_type:'bearer',expires_in:3600,refresh_token:'local-refresh',user:user(name)}))});return;
  }
  const headers={...req.headers,host:'127.0.0.1:'+restPort};if(headers.authorization==='Bearer local-public-key')delete headers.authorization;
  const p=http.request({host:'127.0.0.1',port:restPort,path:req.url.replace(/^\/rest\/v1/,''),method:req.method,headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});p.on('error',()=>{res.writeHead(502);res.end()});req.pipe(p);
 });await new Promise(r=>proxy.listen(proxyPort,'127.0.0.1',r));
 const env={...process.env,PORT:String(apiPort),FRONTEND_URL:'http://127.0.0.1:'+webPort,SUPABASE_URL:'http://127.0.0.1:'+proxyPort,SUPABASE_ANON_KEY:'local-public-key'};
 backend=spawn(process.execPath,['--import','tsx','backend/src/index.ts'],{env,stdio:['ignore','ignore','pipe']});backend.stderr.on('data',d=>errors+=String(d));
 await wait('http://127.0.0.1:'+apiPort+'/api/v1/health');
 assert.equal((await call('/studios')).data[0].name,'Flowie 芙洛');
 assert.equal((await call('/branches')).data.length,2);assert.equal((await call('/rooms')).data.length,4);assert.equal((await call('/courses')).data.length,6);
 assert.equal((await call('/teachers/public')).data[0].name,'示範老師');
 const from=new Date().toISOString(),to=new Date(Date.now()+7*86400000).toISOString(),range='?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to);
 assert.equal((await call('/sessions'+range)).data.length,6);
 assert.equal((await call('/announcements')).data.length,1);
 assert.equal((await call('/auth/me',{who:'admin'})).data.profile.is_admin,true);
 assert.equal((await call('/auth/me',{who:'student'})).data.profile.is_admin,false);
 await call('/branches',{method:'POST',who:'student',body:{name:'拒絕'},expected:403});
 await call('/branches',{method:'POST',body:{name:'拒絕'},expected:401});
 const direct=await fetch('http://127.0.0.1:'+proxyPort+'/rest/v1/branches',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tokens.student},body:JSON.stringify({name:'越權分店'})});
 assert.equal(direct.status,403,'RLS must prevent direct student writes');
 await call('/branches',{method:'POST',who:'admin',body:{name:'測試分店'},expected:201});
 await call('/homepage-sections/hero',{method:'PATCH',who:'admin',body:{title:'找到自己的節奏'}});
 const course='60000000-0000-4000-8000-000000000001';
 const spoof=await fetch('http://127.0.0.1:'+proxyPort+'/rest/v1/course_favorites',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tokens.student},body:JSON.stringify({student_id:uid.admin,course_id:course})});
 assert.equal(spoof.status,403,'RLS must prevent adding another user favorite');
 await call('/favorites',{method:'POST',who:'student',body:{course_id:course,is_favorite:true}});
 assert.equal((await call('/favorites',{who:'student'})).data.length,1);
 await call('/favorites',{method:'POST',who:'student',body:{course_id:course,is_favorite:false}});
 assert.equal((await call('/favorites',{who:'student'})).data.length,0);
 const pack='70000000-0000-4000-8000-000000000002';
 await call('/student-packages',{method:'POST',who:'admin',body:{student_id:uid.student,package_id:pack,idempotency_key:'local-grant-0001'},expected:201});
 assert.equal((await call('/student-packages?scope=mine',{who:'student'})).data[0].balance,5);
 const booking=await call('/bookings',{method:'POST',who:'student',body:{session_id:session,idempotency_key:'local-booking-0001'},expected:201});
 const repeat=await call('/bookings',{method:'POST',who:'student',body:{session_id:session,idempotency_key:'local-booking-0001'},expected:201});
 assert.equal(repeat.data.id,booking.data.id,'same request must not debit twice');
 assert.equal((await call('/sessions'+range)).data.find(x=>x.id===session).booked_count,1);
 await call('/bookings/'+booking.data.id+'/cancel',{method:'POST',who:'student'});
 assert.equal((await call('/student-packages?scope=mine',{who:'student'})).data[0].balance,5);
 assert.equal((await call('/bookings?scope=mine',{who:'student'})).data[0].status,'cancelled');
 assert.equal((await call('/sessions/manage'+range,{who:'admin'})).data.find(x=>x.id===session).teachers.name,'示範老師');
 assert.equal((await call('/teaching-records'+range,{who:'teacher'})).data.length,6);
 assert.equal((await call('/reports'+range,{who:'admin'})).data.session_count,6);
 const start=new Date(Date.now()+9*86400000),end=new Date(+start+3600000);
 const scheduled=await call('/sessions',{method:'POST',who:'admin',expected:201,body:{room_id:'30000000-0000-4000-8000-000000000001',course_id:course,teacher_id:uid.teacher,starts_at:start.toISOString(),ends_at:end.toISOString(),capacity:4,booking_opens_at:null,cancellation_deadline:null}});
 await call('/sessions/'+scheduled.data[0]+'/cancel',{method:'POST',who:'admin'});
 const wideRange='?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(new Date(Date.now()+14*86400000).toISOString());
 const metrics=(await call('/reports'+wideRange,{who:'admin'})).data;
 assert.equal(metrics.session_count,7);
 assert.equal(metrics.teacher_session_count,6,'cancelled session must not count as an active scheduled session');
 assert.equal((await call('/reports'+wideRange+'&status=cancelled',{who:'admin'})).data.teacher_session_count,0);
 console.log('PASS local HTTP: real PostgREST + Express + simulated Auth; public data, admin, favorites, booking, cancellation, ledger');
 if(process.env.FLOWIE_UI_TEST==='1'||process.env.FLOWIE_UI_MANUAL==='1'){
  web=spawn(path.resolve('node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort)],{cwd:'frontend',env:{...process.env,VITE_API_BASE_URL:'http://127.0.0.1:'+apiPort+'/api/v1',VITE_SUPABASE_URL:'http://127.0.0.1:'+proxyPort,VITE_SUPABASE_ANON_KEY:'local-public-key'},stdio:['ignore','ignore','pipe']});web.stderr.on('data',d=>errors+=String(d));
  await wait('http://127.0.0.1:'+webPort+'/');
  if(process.env.FLOWIE_UI_MANUAL==='1'){
    console.log('UI_READY http://127.0.0.1:'+webPort+'/');
    await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve)});
  }else{
  const {chromium}=await import('playwright');browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://127.0.0.1:'+webPort+'/');
  await page.getByText('找到自己的節奏').first().waitFor({timeout:15000});await page.getByText('示範老師').first().waitFor({timeout:10000});
  await page.goto('http://127.0.0.1:'+webPort+'/classes');await page.getByText('初晨墊上皮拉提斯').first().waitFor({timeout:10000});
  await page.goto('http://127.0.0.1:'+webPort+'/login');await page.locator('input[type=email]').fill('student@example.test');await page.locator('input[type=password]').fill('test-pass-123');await page.getByRole('button',{name:'登入',exact:true}).click();
  await page.waitForURL('http://127.0.0.1:'+webPort+'/',{timeout:15000});await page.goto('http://127.0.0.1:'+webPort+'/account');await page.getByText('帳號 User ID').first().waitFor({timeout:10000});
  const mobile=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:1});await mobile.goto('http://127.0.0.1:'+webPort+'/');await mobile.getByText('找到自己的節奏').first().waitFor({timeout:15000});
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'mobile horizontal overflow');
  await mobile.route('**/api/v1/studios',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'test error'}})}));
  await mobile.goto('http://127.0.0.1:'+webPort+'/',{waitUntil:'domcontentloaded'});await mobile.getByText('無法連線至 Flowie').first().waitFor({timeout:15000});
  console.log('PASS UI: desktop and mobile, homepage, classes, simulated login, account and connection error state');
  }
 }
 console.log('LIMITATION disposable local Auth/PostgREST emulator, not the user’s hosted Supabase project.');
}catch(e){console.error('FAIL',e.stack,'\n',errors.slice(-3000));process.exitCode=1}finally{
 if(browser)await browser.close().catch(()=>{});for(const p of [web,backend,rest])if(p)p.kill('SIGTERM');if(proxy)await new Promise(r=>proxy.close(r));if(db)await db.end().catch(()=>{});await pg.stop().catch(()=>{});await rm(temp,{recursive:true,force:true});
}
