import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const fixtures = vi.hoisted(() => ({
  brand: { id:'flowie', name:'Flowie 芙洛', slug:'flowie' } as any,
  loading:false, error:null as Error | null, retry:vi.fn(),
}));
vi.mock('../src/services/context',()=>({
  useApp:()=>({studio:fixtures.brand,brandLoading:fixtures.loading,brandError:fixtures.error,retryBrand:fixtures.retry}),
  useStudioQuery:(resource:string)=>({data:!fixtures.brand?undefined:resource==='homepage-sections'?[{section_type:'hero',title:'找到自己的節奏',subtitle:'一起練習',image_url:null,link_url:'/classes',sort_order:1,is_active:true},{section_type:'courses',title:'近期課程',subtitle:'一起練習',sort_order:2,is_active:true},{section_type:'teachers',title:'認識老師',subtitle:'',sort_order:3,is_active:true},{section_type:'announcements',title:'最新消息',subtitle:'',sort_order:4,is_active:true}]:resource==='announcements'?[{id:'notice',title:'歡迎來到 Flowie',content:'示範公告',is_active:true}]:[],isError:false,isLoading:false}),
}));
vi.mock('../src/services/api',()=>({
  qs:(x:Record<string,string>)=>new URLSearchParams(x).toString(),
  api:async (url:string)=>url.startsWith('/teachers/public')?[{id:'teacher',name:'示範老師',photo_url:null}]:[{id:'session',course_id:'course',course_name:'初晨墊上皮拉提斯',teacher_name:'示範老師',teacher_id:'teacher',branch_name:'南港館',room_name:'晨光教室',starts_at:'2026-12-01T02:00:00Z',ends_at:'2026-12-01T03:00:00Z',capacity:8,booked_count:0,credit_cost:1}],
}));
vi.mock('../src/components/FavoriteButton',()=>({FavoriteButton:()=>null}));
import { Home } from '../src/pages/Home';
function mount(){const client=new QueryClient({defaultOptions:{queries:{retry:false}}});return render(<QueryClientProvider client={client}><MemoryRouter><Home /></MemoryRouter></QueryClientProvider>)}
beforeEach(()=>{fixtures.brand={id:'flowie',name:'Flowie 芙洛',slug:'flowie'};fixtures.loading=false;fixtures.error=null;fixtures.retry.mockClear()});
afterEach(()=>cleanup());
describe('V1 homepage states',()=>{
  it('displays sections, teacher, class and announcement from the API data',async()=>{
    mount();
    expect(screen.getByText('找到自己的節奏')).toBeTruthy();
    expect(await screen.findByText('初晨墊上皮拉提斯')).toBeTruthy();
    expect((await screen.findAllByText('示範老師')).length).toBeGreaterThan(0);
    expect(screen.getByText('歡迎來到 Flowie')).toBeTruthy();
    expect(screen.queryByText('正在連線 Flowie')).toBeNull();
  });
  it('shows loading only while brand query is loading',()=>{
    fixtures.brand=null;fixtures.loading=true;mount();expect(screen.getByText('正在連線 Flowie')).toBeTruthy();
  });
  it('shows an actionable connection error instead of endless loading',()=>{
    fixtures.brand=null;fixtures.error=new Error('offline');mount();
    expect(screen.getByText(/無法連線至 Flowie/)).toBeTruthy();
    expect(screen.queryByText('正在連線 Flowie')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'重新載入'}));expect(fixtures.retry).toHaveBeenCalledOnce();
  });
  it('distinguishes empty brand data from a loading state',()=>{
    fixtures.brand=null;mount();expect(screen.getByText('尚未設定品牌資料')).toBeTruthy();
    expect(screen.queryByText('正在連線 Flowie')).toBeNull();
  });
});
