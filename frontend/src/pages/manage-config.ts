export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'time' | 'datetime-local';
  required?: boolean;
  readOnly?: boolean;
  options?: [string, string][];
  source?: string;
  foreignLabel?: string;
  defaultValue?: string | number | boolean;
};
export type Resource = { label: string; fields: Field[] };
const active: Field = { key: 'is_active', label: '啟用', type: 'checkbox', defaultValue: true };
const foreign = (key: string, label: string, source: string): Field => ({ key, label, type: 'select', source, required: true });
export const resources: Record<string, Resource> = {
  branches: { label: '分店', fields: [{ key:'name',label:'分店名稱',required:true },{ key:'address',label:'地址' },active] },
  rooms: { label: '教室', fields: [foreign('branch_id','所屬分店','branches'),{key:'name',label:'教室名稱',required:true},{key:'capacity',label:'容納人數',type:'number',required:true},active] },
  teachers: { label: '老師', fields: [{key:'id',label:'已註冊帳號 User ID',required:true},{key:'name',label:'姓名（由個人資料維護）',readOnly:true},{key:'photo_url',label:'照片網址'},active] },
  'course-categories': { label:'課程分類',fields:[{key:'name',label:'分類名稱',required:true},{key:'sort_order',label:'排序',type:'number',defaultValue:0},active] },
  courses: { label:'課程',fields:[{key:'name',label:'課程名稱',required:true},foreign('category_id','課程分類','course-categories'),{key:'description',label:'課程說明',type:'textarea'},{key:'image_url',label:'圖片網址'},{key:'default_duration_minutes',label:'預設時長（分鐘）',type:'number',required:true,defaultValue:60},{key:'difficulty',label:'難度',required:true,defaultValue:'入門'},{key:'credit_cost',label:'消耗堂數',type:'number',required:true,defaultValue:1},active] },
  packages: { label:'課程方案',fields:[{key:'name',label:'方案名稱',required:true},{key:'total_credits',label:'總堂數',type:'number',required:true},{key:'validity_days',label:'有效天數',type:'number',required:true},active] },
  'homepage-sections': { label:'首頁區塊',fields:[
    {key:'section_type',label:'區塊',type:'select',required:true,options:[['hero','主視覺'],['quick_booking','快速預約'],['courses','近期課程'],['teachers','老師'],['announcements','公告']]},
    {key:'title',label:'標題'},{key:'subtitle',label:'副標題'},{key:'image_url',label:'圖片網址'},{key:'link_url',label:'連結'},{key:'sort_order',label:'排序',type:'number',defaultValue:0},active] },
  'site-settings': { label:'網站設定',fields:[{key:'brand_name',label:'品牌名稱',required:true},{key:'logo_url',label:'Logo 路徑或網址'},{key:'brand_tagline',label:'品牌標語'},{key:'contact_email',label:'聯絡信箱'},{key:'contact_phone',label:'聯絡電話'},{key:'cancellation_hours',label:'開課前取消期限（小時）',type:'number',required:true,defaultValue:12}] },
  announcements: { label:'公告',fields:[{key:'title',label:'標題',required:true},{key:'content',label:'內容',type:'textarea',required:true},{key:'starts_at',label:'開始顯示',type:'datetime-local'},{key:'ends_at',label:'結束顯示',type:'datetime-local'},active] },
};
