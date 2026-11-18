import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(
  /** 為隔離測試建立 fixture、接收本機服務結果或核對斷言；不接觸正式資料。 */ () => ({
    rpc: vi.fn(),
    rpcSingle: vi.fn(),
  }),
);
vi.mock(
  '../../backend/src/infrastructure/database/rpc.js',
  /** 提供此測試專用的模組替身，避免連線至正式環境。 */ () => mocks,
);
import * as bookings from '../../backend/src/modules/bookings/bookings.service';
import * as credits from '../../backend/src/modules/credits/credits.service';
import * as scheduling from '../../backend/src/modules/scheduling/scheduling.service';
import * as reports from '../../backend/src/modules/reports/reports.service';
import { type ServiceContext } from '../../backend/src/shared/types/service-context';
const ctx = { db: {}, user: { id: 'student-id' } } as ServiceContext;
beforeEach(
  /** 重設每個案例的初始狀態，避免測試互相影響。 */ () => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue([]);
    mocks.rpcSingle.mockResolvedValue({ id: 'booking-id' });
  },
);
describe(
  'V1 service parameter contracts',
  /** 組織同一功能的測試案例，不接觸正式資料。 */ () => {
    it(
      'preserves booking identity, request key, cancellation and feedback RPCs',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        await bookings.create(ctx, 'session-id', 'request-key');
        expect(mocks.rpcSingle).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_book', {
          p_session: 'session-id',
          p_key: 'request-key',
        });
        await bookings.cancel(ctx, 'booking-id');
        expect(mocks.rpcSingle).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_cancel_booking', {
          p_booking: 'booking-id',
        });
        await bookings.feedback(ctx, 'booking-id', '保持呼吸');
        expect(mocks.rpcSingle).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_set_teacher_feedback', {
          p_booking: 'booking-id',
          p_feedback: '保持呼吸',
        });
      },
    );
    it(
      'preserves package issuing and audit-note adjustment parameters',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        await credits.issue(ctx, {
          student_id: 'student-id',
          package_id: 'package-id',
          idempotency_key: 'request-key',
        });
        expect(mocks.rpcSingle).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_issue_package', {
          p_student: 'student-id',
          p_package: 'package-id',
          p_key: 'request-key',
          p_starts: null,
        });
        await credits.adjust(ctx, 'held-package', {
          delta: -1,
          note: '測試原因',
          idempotency_key: 'adjust-key',
        });
        expect(mocks.rpcSingle).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_adjust_credits', {
          p_package: 'held-package',
          p_delta: -1,
          p_note: '測試原因',
          p_key: 'adjust-key',
        });
      },
    );
    it(
      'preserves session RPC optional defaults without changing timezone values',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        const v = {
          room_id: 'room-id',
          course_id: 'course-id',
          teacher_id: 'teacher-id',
          starts_at: '2026-12-01T10:00:00+08:00',
          ends_at: '2026-12-01T11:00:00+08:00',
          capacity: 6,
          booking_opens_at: null,
          cancellation_deadline: null,
        };
        await scheduling.schedule(ctx, v, null);
        expect(mocks.rpc).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_schedule', {
          p_session: null,
          p_room: 'room-id',
          p_course: 'course-id',
          p_teacher: 'teacher-id',
          p_starts: v.starts_at,
          p_ends: v.ends_at,
          p_capacity: 6,
          p_opens: null,
          p_closes: null,
          p_deadline: null,
          p_until: null,
        });
      },
    );
    it(
      'preserves member-only reads and report filters',
      /** 驗證目前測試案例的預期行為與錯誤邊界。 */ async () => {
        await bookings.list(ctx, true);
        expect(mocks.rpc).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_bookings', {
          p_student: 'student-id',
        });
        await reports.report(ctx, { from: '2026-12-01T00:00:00Z', to: '2027-01-01T00:00:00Z' });
        expect(mocks.rpc).toHaveBeenLastCalledWith(ctx.db, 'flowie_v1_report', {
          p_from: '2026-12-01T00:00:00Z',
          p_to: '2027-01-01T00:00:00Z',
          p_branch: null,
          p_status: null,
        });
      },
    );
  },
);
