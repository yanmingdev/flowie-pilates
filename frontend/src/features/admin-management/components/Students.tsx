import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiAll, apiPage, patch, post, qs } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { Modal } from '../../../shared/ui/Modal';
import { StudentHistory } from './StudentHistory';
import { CreditAdjust } from './CreditAdjust';

/** 呈現學生清單、狀態與方案發放；維持現有角色與互動規則。 */ export function Students() {
  const { studio } = useApp();
  const qc = useQueryClient();
  const [student, setStudent] = useState('');
  const [package_id, setPackageId] = useState('');
  const [notice, setNotice] = useState('');
  const [adjusting, setAdjusting] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const grantKey = useRef(crypto.randomUUID());
  const students = useQuery({
    queryKey: ['students', studio?.id, studentPage, search],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      apiPage<any>(
        `/students?${qs({ studio_id: studio!.id, page: String(studentPage), limit: '20', q: search })}`,
      ),
    enabled: !!studio,
  });
  const packages = useQuery({
    queryKey: ['packages', studio?.id],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      apiAll<any>('packages', studio!.id),
    enabled: !!studio,
  });
  const assigned = useQuery({
    queryKey: ['student-packages', studio?.id],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      api<any[]>(`/student-packages?studio_id=${studio!.id}`),
    enabled: !!studio,
  });
  const issue = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ () =>
      post('/student-packages', {
        studio_id: studio!.id,
        student_id: student,
        package_id,
        idempotency_key: grantKey.current,
      }),

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () => {
      qc.invalidateQueries();
      grantKey.current = crypto.randomUUID();
      setNotice('方案已指派並建立授予紀錄。');
    },
  });
  const toggle = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ (s: any) =>
      patch(`/students/${s.student_id}/status`, { studio_id: studio!.id, is_active: !s.is_active }),

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () =>
      qc.invalidateQueries(),
  });
  return (
    <>
      <div className="panel">
        <h3>已註冊的帳號</h3>
        <p className="helper">
          V1 沒有獨立的學生身分表，此清單顯示非管理員帳號。註冊後會自動建立資料，請先填寫姓名。
        </p>
      </div>
      <div className="panel">
        <h3>指派學生方案</h3>
        <p className="helper">
          學生須先註冊並填寫姓名。選單顯示目前學生頁的資料，可用下方搜尋或換頁；方案不包含線上付款。
        </p>
        <div className="filter-grid">
          <label>
            學生
            <select
              value={student}
              onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setStudent(e.target.value)}
            >
              <option value="">請選擇</option>
              {students.data?.data
                ?.filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (s) => s.is_active)
                .map(
                  /** 將每個項目轉換為本次清單需要的資料或元件。 */ (s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.display_name || s.student_id}
                    </option>
                  ),
                )}
            </select>
          </label>
          <label>
            課程方案
            <select
              value={package_id}
              onChange={/** 同步輸入值與對應的表單狀態。 */ (e) => setPackageId(e.target.value)}
            >
              <option value="">請選擇</option>
              {packages.data
                ?.filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (p) => p.is_active)
                .map(
                  /** 將每個項目轉換為本次清單需要的資料或元件。 */ (p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ),
                )}
            </select>
          </label>
          <button
            className="button"
            disabled={!student || !package_id || issue.isPending}
            onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => issue.mutate()}
          >
            指派方案
          </button>
        </div>
        {issue.isError && <ErrorNote error={issue.error} />}{' '}
        {notice && <p className="success-note">{notice}</p>}
      </div>
      <div className="panel">
        <h3>學生與持有方案</h3>
        {(assigned.data?.length ?? 0) >= 1000 && (
          <p className="helper">
            方案清單已達 1000 筆，請使用個別學生的「查看紀錄」以確認完整資料。
          </p>
        )}
        <label>
          搜尋學生
          <input
            value={search}
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) => {
                setSearch(e.target.value);
                setStudentPage(1);
              }
            }
            placeholder="姓名或 Email"
          />
        </label>
        {students.isError && <ErrorNote error={students.error} />}{' '}
        {toggle.isError && <ErrorNote error={toggle.error} />}{' '}
        {students.data?.data.length ? (
          students.data.data.map(
            /** 將每個項目轉換為本次清單需要的資料或元件。 */ (s) => (
              <div key={s.student_id} className="student-row">
                <div>
                  <strong>{s.display_name || '未填姓名'}</strong>
                  <small>
                    {s.is_active ? '啟用' : '停用'} · ID {s.student_id}
                  </small>
                  <div className="button-row">
                    <span className="helper">姓名由使用者在「我的資料」維護。</span>
                    <button
                      className="text-link"
                      onClick={
                        /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => setHistory(s)
                      }
                    >
                      查看紀錄
                    </button>
                    <button
                      className="text-link"
                      disabled={toggle.isPending}
                      onClick={
                        /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => toggle.mutate(s)
                      }
                    >
                      {s.is_active ? '停用學生' : '啟用學生'}
                    </button>
                  </div>
                </div>
                <div>
                  {assigned.data
                    ?.filter(
                      /** 依目前條件保留符合的項目，不修改原始清單。 */ (p) =>
                        p.student_id === s.student_id,
                    )
                    .map(
                      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (p) => (
                        <p key={p.id}>
                          {p.course_packages?.name}：{p.balance} 堂 ·{' '}
                          {new Date(p.expires_at).toLocaleDateString('zh-TW', {
                            timeZone: 'Asia/Taipei',
                          })}{' '}
                          <button
                            className="text-link"
                            onClick={
                              /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () =>
                                setAdjusting(p)
                            }
                          >
                            調整堂數
                          </button>
                        </p>
                      ),
                    )}
                </div>
              </div>
            ),
          )
        ) : (
          <Empty title={search ? '查無符合的學生' : '尚無學生'} />
        )}
        <div className="pagination">
          <button
            className="button secondary"
            disabled={studentPage <= 1}
            onClick={
              /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () =>
                setStudentPage(studentPage - 1)
            }
          >
            上一頁
          </button>
          <span>
            第 {studentPage} 頁 · 共 {students.data?.meta.total ?? 0} 筆
          </span>
          <button
            className="button secondary"
            disabled={studentPage * 20 >= (students.data?.meta.total ?? 0)}
            onClick={
              /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () =>
                setStudentPage(studentPage + 1)
            }
          >
            下一頁
          </button>
        </div>
      </div>
      {history && (
        <Modal
          title="學生紀錄"
          onClose={/** 關閉目前介面並清理選取狀態。 */ () => setHistory(null)}
        >
          <StudentHistory student={history} />
        </Modal>
      )}
      {adjusting && (
        <Modal
          title="調整堂數"
          onClose={/** 關閉目前介面並清理選取狀態。 */ () => setAdjusting(null)}
        >
          <CreditAdjust
            item={adjusting}
            onClose={/** 關閉目前介面並清理選取狀態。 */ () => setAdjusting(null)}
          />
        </Modal>
      )}
    </>
  );
}
