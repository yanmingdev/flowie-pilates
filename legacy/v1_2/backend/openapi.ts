const uuid = { type: 'string', format: 'uuid' };
const auth = [{ bearerAuth: [] }];
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Flowie Studio API',
    version: '1.2.0',
    description: '以 Supabase JWT 作身分驗證；資料讀寫受到 RLS 保護。',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              request_id: { type: 'string' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': { get: { summary: '服務狀態', responses: { 200: { description: '可用' } } } },
    '/studios': {
      get: { summary: '公開品牌列表', responses: { 200: { description: '品牌資料' } } },
    },
    '/auth/me': {
      get: {
        summary: '目前使用者與角色',
        security: auth,
        responses: { 200: { description: '目前身分' }, 401: { description: '未登入' } },
      },
    },
    '/sessions': {
      get: {
        summary: '公開場次與剩餘名額',
        parameters: [
          { name: 'studio_id', in: 'query', required: true, schema: uuid },
          {
            name: 'from',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'to',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: { 200: { description: '場次清單' } },
      },
      post: {
        summary: '建立場次或每週排課',
        security: auth,
        responses: { 201: { description: '已建立' }, 400: { description: '輸入或排課衝突' } },
      },
    },
    '/bookings': {
      get: {
        summary: '查詢可見預約',
        security: auth,
        responses: { 200: { description: '預約清單' } },
      },
      post: {
        summary: '安全預約並扣堂',
        security: auth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['session_id', 'idempotency_key'],
                properties: { session_id: uuid, idempotency_key: { type: 'string' } },
              },
              example: {
                session_id: '00000000-0000-4000-8000-000000000001',
                idempotency_key: 'your-unique-request-key',
              },
            },
          },
        },
        responses: { 201: { description: '預約成功' }, 400: { description: '額滿或無有效堂數' } },
      },
    },
    '/bookings/{id}/cancel': {
      post: {
        summary: '取消並依規則返還堂數',
        security: auth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }],
        responses: { 200: { description: '已取消' }, 400: { description: '不可取消' } },
      },
    },
    '/attendance': {
      post: {
        summary: '授權老師或管理員登記出勤',
        security: auth,
        responses: { 200: { description: '已更新' } },
      },
    },
    '/student-packages': {
      get: { summary: '查詢方案', security: auth, responses: { 200: { description: '可見方案' } } },
      post: {
        summary: '管理員指派方案',
        security: auth,
        responses: { 201: { description: '已指派' } },
      },
    },
    '/reports': {
      get: {
        summary: '品牌管理報表',
        security: auth,
        responses: { 200: { description: '統計結果' }, 403: { description: '無權限' } },
      },
    },
  },
};
// Resource operations are listed explicitly from the route whitelist.
import { resources } from './validators/resources.js';
const paths = openapi.paths as Record<string, any>;
const studioParam = { name: 'studio_id', in: 'query', required: true, schema: uuid };
const idParam = { name: 'id', in: 'path', required: true, schema: uuid };
const ok = {
  200: { description: '成功' },
  400: { description: '資料驗證失敗' },
  401: { description: '未登入' },
  403: { description: '無權限' },
};
for (const name of Object.keys(resources)) {
  paths[`/${name}`] = {
    get: {
      summary: `查詢 ${name}`,
      parameters: [
        studioParam,
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
        { name: 'q', in: 'query', schema: { type: 'string' } },
      ],
      responses: ok,
    },
    post: {
      summary: `新增 ${name}（品牌管理員）`,
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['studio_id'], properties: { studio_id: uuid } },
            example:
              name === 'branches'
                ? {
                    studio_id: '10000000-0000-4000-8000-000000000001',
                    name: '南港館',
                    address: '台北市南港區',
                    is_active: true,
                  }
                : { studio_id: '10000000-0000-4000-8000-000000000001' },
          },
        },
      },
      responses: { ...ok, 201: { description: '已建立' } },
    },
  };
  paths[`/${name}/{id}`] = {
    patch: {
      summary: `修改 ${name}（品牌管理員）`,
      security: auth,
      parameters: [idParam, studioParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' },
            example:
              name === 'branches' ? { name: '南港館', is_active: true } : { is_active: true },
          },
        },
      },
      responses: ok,
    },
  };
}
for (const name of ['teacher-branches', 'teacher-courses', 'package-courses'])
  paths[`/${name}/{id}`].delete = {
    summary: `移除 ${name} 關聯`,
    security: auth,
    parameters: [idParam, studioParam],
    responses: ok,
  };
for (const [route, method, summary] of [
  ['/auth/join', 'post', '加入品牌成為學生'],
  ['/auth/profile', 'patch', '更新自己的基本資料'],
  ['/studios', 'post', '新增品牌（平台管理員）'],
  ['/studios/{id}', 'patch', '更新品牌（平台管理員）'],
  ['/studios/{id}/admins', 'post', '設定品牌管理員（平台管理員）'],
  ['/sessions/manage', 'get', '查詢授權管理的場次'],
  ['/sessions/{id}', 'patch', '修改單一場次'],
  ['/sessions/{id}/future', 'patch', '修改同規則後續場次'],
  ['/sessions/{id}/cancel', 'post', '取消單一場次並退堂'],
  ['/sessions/{id}/cancel-future', 'post', '取消同規則後續場次並退堂'],
  ['/sessions/{id}/students', 'get', '查看授權場次學生名單'],
  ['/students', 'get', '查詢品牌學生'],
  ['/students/{id}/status', 'patch', '更新學生啟用狀態'],
  ['/students/{id}/profile', 'patch', '更新學生基本資料'],
  ['/student-packages/{id}/adjust', 'post', '調整堂數並寫入帳本'],
  ['/credit-ledger', 'get', '查詢堂數帳本'],
] as const) {
  paths[route] ??= {};
  paths[route][method] = {
    summary,
    security: auth,
    parameters: [
      ...(route.includes('{id}') ? [idParam] : []),
      ...(['get'].includes(method) && !route.includes('{id}') ? [studioParam] : []),
    ],
    responses: ok,
  };
}
paths['/teachers/public'] = {
  get: { summary: '公開老師資料（不含聯絡資訊）', parameters: [studioParam], responses: ok },
};
paths['/sessions'].post.requestBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: [
          'studio_id',
          'branch_id',
          'room_id',
          'course_id',
          'teacher_id',
          'starts_at',
          'ends_at',
          'capacity',
          'booking_opens_at',
          'cancellation_deadline',
        ],
        properties: {
          studio_id: uuid,
          branch_id: uuid,
          room_id: uuid,
          course_id: uuid,
          teacher_id: uuid,
          starts_at: { type: 'string', format: 'date-time' },
          ends_at: { type: 'string', format: 'date-time' },
          capacity: { type: 'integer', minimum: 1 },
          booking_opens_at: { type: 'string', format: 'date-time', nullable: true },
          booking_closes_at: { type: 'string', format: 'date-time', nullable: true },
          cancellation_deadline: { type: 'string', format: 'date-time', nullable: true },
          until_date: { type: 'string', format: 'date', nullable: true },
        },
      },
      example: {
        studio_id: '10000000-0000-4000-8000-000000000001',
        branch_id: '20000000-0000-4000-8000-000000000001',
        room_id: '30000000-0000-4000-8000-000000000001',
        course_id: '60000000-0000-4000-8000-000000000001',
        teacher_id: '40000000-0000-4000-8000-000000000001',
        starts_at: '2027-01-08T02:00:00Z',
        ends_at: '2027-01-08T03:00:00Z',
        capacity: 8,
        booking_opens_at: null,
        cancellation_deadline: null,
        until_date: null,
      },
    },
  },
};
paths['/student-packages'].post.requestBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['studio_id', 'student_id', 'package_id', 'idempotency_key'],
        properties: {
          studio_id: uuid,
          student_id: uuid,
          package_id: uuid,
          idempotency_key: { type: 'string' },
        },
      },
    },
  },
};
paths['/attendance'].post.requestBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['booking_id', 'status'],
        properties: {
          booking_id: uuid,
          status: { type: 'string', enum: ['present', 'absent', 'unconfirmed'] },
        },
      },
    },
  },
};
paths['/reports'].get.parameters = [
  studioParam,
  { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } },
  { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } },
  { name: 'branch_id', in: 'query', schema: uuid },
  {
    name: 'status',
    in: 'query',
    schema: { type: 'string', enum: ['scheduled', 'cancelled', 'completed'] },
  },
];

paths['/teaching-records'] = {
  get: { summary: '老師授課紀錄（管理員或授課老師）', security: auth, responses: ok },
};
paths['/students'].post = {
  summary: '將已註冊使用者加入品牌',
  security: auth,
  responses: { ...ok, 201: { description: '已加入' } },
};

paths['/favorites'] = {
  get: { summary: '自己的收藏課程', security: auth, responses: ok },
  post: { summary: '收藏或移除課程', security: auth, responses: ok },
};

paths['/reports/metrics'] = {
  get: { summary: '預約率、出席率、取消率及教室使用率', security: auth, responses: ok },
};
