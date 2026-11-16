import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, apiAll, apiPage, patch, post, qs } from '../services/api';
import { useApp } from '../services/context';
import { Empty, ErrorNote, Modal } from '../components/Ui';
import { resources, type Field } from './manage-config';
function localDate(v: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(v)).replace(' ', 'T');
}
function ManageForm({
  resource,
  row,
  onClose,
}: {
  resource: string;
  row: any;
  onClose: () => void;
}) {
  const { studio } = useApp();
  const config = resources[resource];
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, any>>(() =>
    Object.fromEntries(
      config.fields.map((f) => [
        f.key,
        row?.[f.key] === undefined
          ? (f.defaultValue ?? (f.type === 'checkbox' ? false : ''))
          : f.type === 'datetime-local' && row[f.key]
            ? localDate(row[f.key])
            : (row[f.key] ?? ''),
      ]),
    ),
  );
  const sources = Array.from(
    new Set(config.fields.map((f) => f.source).filter((x): x is string => !!x)),
  );
  const lookups = useQueries({
    queries: sources.map((s) => ({
      queryKey: [s, studio?.id],
      queryFn: () => apiAll<any>(s, studio!.id),
      enabled: !!studio,
    })),
  });
  const options = (f: Field): [string, string][] => {
    if (f.options) return f.options;
    if (!f.source) return [];
    const data = lookups[sources.indexOf(f.source)]?.data || [];
    return data
      .filter((x: any) => x.is_active !== false)
      .map((x: any) => [x.id, x.name || x.title || x.id]);
  };
  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      for (const f of config.fields) {
        if (f.readOnly) continue;
        const v = values[f.key];
        if (v === '' || v === null) {
          if (
            row &&
            (f.type === 'text' ||
              f.type === 'textarea' ||
              f.type === 'datetime-local' ||
              (f.type === 'select' && !f.required) ||
              !f.type)
          )
            body[f.key] = null;
          continue;
        }
        body[f.key] =
          f.type === 'number' || f.key === 'weekday'
            ? Number(v)
            : f.type === 'datetime-local'
              ? new Date(`${v}+08:00`).toISOString()
              : v;
      }
      return row
        ? patch(`/${resource}/${row.id ?? row.section_type}?studio_id=${studio!.id}`, body)
        : post(`/${resource}`, { ...body, studio_id: studio!.id });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      {config.fields.map((f) => (
        <label key={f.key} className={f.type === 'checkbox' ? 'check-label' : ''}>
          {f.type === 'checkbox' ? (
            <>
              <input
                type="checkbox"
                checked={!!values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })}
              />
              {f.label}
            </>
          ) : (
            <>
              {f.label}
              {f.type === 'textarea' ? (
                <textarea
                  required={f.required}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : f.type === 'select' ? (
                <select
                  required={f.required}
                  disabled={!!row && f.key === 'section_type'}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                >
                  <option value="">請選擇</option>
                  {options(f).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  required={f.required}
                  disabled={f.readOnly || (!!row && f.key === 'id')}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </>
          )}
        </label>
      ))}
      {mutation.isError && <ErrorNote error={mutation.error} />}
      <button className="button button-full" disabled={mutation.isPending}>
        {mutation.isPending ? '儲存中…' : '儲存'}
      </button>
    </form>
  );
}
function CreditAdjust({ item, onClose }: { item: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState('');
  const key = useRef(crypto.randomUUID());
  const mutation = useMutation({
    mutationFn: () =>
      post(`/student-packages/${item.id}/adjust`, {
        delta: Number(delta),
        note,
        idempotency_key: key.current,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <p>目前餘額 {item.balance} 堂；正數為增加，負數為扣除。</p>
      <label>
        調整堂數
        <input
          type="number"
          required
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
      </label>
      <label>
        調整原因
        <input required value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {mutation.isError && <ErrorNote error={mutation.error} />}
      <button className="button" disabled={mutation.isPending || delta === 0}>
        確認調整
      </button>
    </form>
  );
}
function StudentHistory({ student }: { student: any }) {
  const { studio } = useApp();
  const result = useQuery({
    queryKey: ['student-history', studio?.id, student.student_id],
    queryFn: () => api<any>(`/students/${student.student_id}/history?studio_id=${studio!.id}`),
    enabled: !!studio,
  });
  return (
    <div>
      <p className="helper">{student.display_name || student.student_id} 的預約、出勤與堂數紀錄。</p>
      {result.isError && <ErrorNote error={result.error} />}
      <h3>預約與出勤</h3>
      {result.data?.bookings?.length ? (
        result.data.bookings.map((b: any) => (
          <div className="ledger-row" key={b.id}>
            <div>
              <strong>{b.class_sessions?.courses?.name}</strong>
              <p>
                {new Date(b.class_sessions?.starts_at).toLocaleString('zh-TW', {
                  timeZone: 'Asia/Taipei',
                })}{' '}
                · {b.status}
              </p>
            </div>
            <span>{b.attendance_status || '未確認'}</span>
          </div>
        ))
      ) : (
        <p className="helper">尚無預約紀錄。</p>
      )}
      <h3>堂數紀錄</h3>
      {result.data?.ledger?.length ? (
        result.data.ledger.map((l: any) => (
          <div className="ledger-row" key={l.id}>
            <div>
              <strong>{l.entry_type}</strong>
              <p>
                {new Date(l.created_at).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })} · {l.note || ''}
              </p>
            </div>
            <strong>
              {l.delta > 0 ? '+' : ''}
              {l.delta}
            </strong>
          </div>
        ))
      ) : (
        <p className="helper">尚無堂數紀錄。</p>
      )}
    </div>
  );
}
function Students() {
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
    queryFn: () =>
      apiPage<any>(
        `/students?${qs({ studio_id: studio!.id, page: String(studentPage), limit: '20', q: search })}`,
      ),
    enabled: !!studio,
  });
  const packages = useQuery({
    queryKey: ['packages', studio?.id],
    queryFn: () => apiAll<any>('packages', studio!.id),
    enabled: !!studio,
  });
  const assigned = useQuery({
    queryKey: ['student-packages', studio?.id],
    queryFn: () => api<any[]>(`/student-packages?studio_id=${studio!.id}`),
    enabled: !!studio,
  });
  const issue = useMutation({
    mutationFn: () =>
      post('/student-packages', {
        studio_id: studio!.id,
        student_id: student,
        package_id,
        idempotency_key: grantKey.current,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      grantKey.current = crypto.randomUUID();
      setNotice('方案已指派並建立授予紀錄。');
    },
  });
  const toggle = useMutation({
    mutationFn: (s: any) =>
      patch(`/students/${s.student_id}/status`, { studio_id: studio!.id, is_active: !s.is_active }),
    onSuccess: () => qc.invalidateQueries(),
  });
  return (
    <>
      <div className="panel"><h3>已註冊的帳號</h3><p className="helper">V1 沒有獨立的學生身分表，此清單顯示非管理員帳號。註冊後會自動建立資料，請先填寫姓名。</p></div>
      <div className="panel">
        <h3>指派學生方案</h3>
        <p className="helper">
          學生須先註冊並填寫姓名。選單顯示目前學生頁的資料，可用下方搜尋或換頁；方案不包含線上付款。
        </p>
        <div className="filter-grid">
          <label>
            學生
            <select value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="">請選擇</option>
              {students.data?.data
                ?.filter((s) => s.is_active)
                .map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.display_name || s.student_id}
                  </option>
                ))}
            </select>
          </label>
          <label>
            課程方案
            <select value={package_id} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">請選擇</option>
              {packages.data
                ?.filter((p) => p.is_active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="button"
            disabled={!student || !package_id || issue.isPending}
            onClick={() => issue.mutate()}
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
            onChange={(e) => {
              setSearch(e.target.value);
              setStudentPage(1);
            }}
            placeholder="姓名或 Email"
          />
        </label>
        {students.isError && <ErrorNote error={students.error} />}{' '}
        {toggle.isError && <ErrorNote error={toggle.error} />}{' '}
        {students.data?.data.length ? (
          students.data.data.map((s) => (
            <div key={s.student_id} className="student-row">
              <div>
                <strong>{s.display_name || '未填姓名'}</strong>
                <small>
                  {s.is_active ? '啟用' : '停用'} · ID {s.student_id}
                </small>
                <div className="button-row">
                  <span className="helper">姓名由使用者在「我的資料」維護。</span>
                  <button className="text-link" onClick={() => setHistory(s)}>
                    查看紀錄
                  </button>
                  <button
                    className="text-link"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(s)}
                  >
                    {s.is_active ? '停用學生' : '啟用學生'}
                  </button>
                </div>
              </div>
              <div>
                {assigned.data
                  ?.filter((p) => p.student_id === s.student_id)
                  .map((p) => (
                    <p key={p.id}>
                      {p.course_packages?.name}：{p.balance} 堂 ·{' '}
                      {new Date(p.expires_at).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}{' '}
                      <button className="text-link" onClick={() => setAdjusting(p)}>
                        調整堂數
                      </button>
                    </p>
                  ))}
              </div>
            </div>
          ))
        ) : (
          <Empty title={search ? '查無符合的學生' : '尚無學生'} />
        )}
        <div className="pagination">
          <button
            className="button secondary"
            disabled={studentPage <= 1}
            onClick={() => setStudentPage(studentPage - 1)}
          >
            上一頁
          </button>
          <span>
            第 {studentPage} 頁 · 共 {students.data?.meta.total ?? 0} 筆
          </span>
          <button
            className="button secondary"
            disabled={studentPage * 20 >= (students.data?.meta.total ?? 0)}
            onClick={() => setStudentPage(studentPage + 1)}
          >
            下一頁
          </button>
        </div>
      </div>
      {history && (
        <Modal title="學生紀錄" onClose={() => setHistory(null)}>
          <StudentHistory student={history} />
        </Modal>
      )}
      {adjusting && (
        <Modal title="調整堂數" onClose={() => setAdjusting(null)}>
          <CreditAdjust item={adjusting} onClose={() => setAdjusting(null)} />
        </Modal>
      )}
    </>
  );
}
export function Manage() {
  const { studio, me } = useApp();
  const [resource, setResource] = useState('branches');
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const admin = !!me?.profile.is_admin && !!me.profile.is_active;
  const query = useQuery({
    queryKey: [resource, studio?.id, page, search],
    queryFn: () =>
      apiPage<any>(
        `/${resource}?${qs({ studio_id: studio!.id, page: String(page), limit: '20', q: search })}`,
      ),
    enabled: !!studio && resource !== 'students' && !!admin,
  });
  const rows = useMemo(
    () =>
      (query.data?.data || []).filter(
        (r) =>
          [
            'branches',
            'rooms',
            'teachers',
            'course-categories',
            'courses',
            'packages',
            'announcements',
          ].includes(resource) || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
      ),
    [query.data, search, resource],
  );
  const config = resources[resource];
  if (!admin) return <Empty title="資料管理僅限管理員" />;
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">STUDIO SETTINGS</span>
          <h1>資料管理</h1>
          <p>維護品牌資料與日常營運設定。</p>
        </div>
      </div>
      <div className="manage-toolbar">
        <label className="resource-select">
          管理項目
          <select
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
              setSearch('');
              setPage(1);
            }}
          >
            <option value="students">學生與方案指派</option>
            {Object.entries(resources).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {resource !== 'students' && (
          <>
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="搜尋"
                disabled={resource === 'teachers'}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  [
                    'branches',
                    'rooms',
                    'teachers',
                    'course-categories',
                    'courses',
                    'packages',
                    'announcements',
                  ].includes(resource)
                    ? `搜尋${config.label}`
                    : '搜尋目前頁面'
                }
              />
            </label>
            {!(resource === 'site-settings' && rows.length > 0) && <button
              className="button"
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              <Plus size={17} />
              新增{config.label}
            </button>}
          </>
        )}
      </div>
      {resource === 'students' ? (
        <Students />
      ) : (
        <>
          {query.isError && <ErrorNote error={query.error} retry={() => { void query.refetch(); }} />}{' '}
          <div className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {config.fields.slice(0, 4).map((f) => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                    <th>狀態</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id ?? row.section_type}>
                      {config.fields.slice(0, 4).map((f) => (
                        <td key={f.key}>
                          {typeof row[f.key] === 'boolean'
                            ? row[f.key]
                              ? '是'
                              : '否'
                            : String(row[f.key] ?? '—')}
                        </td>
                      ))}
                      <td>{row.is_active === undefined ? '—' : row.is_active ? '啟用' : '停用'}</td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => {
                            setEditing(row);
                            setModal(true);
                          }}
                        >
                          編輯
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && !query.isLoading && !query.isError && <Empty title={`尚無${config.label}資料`} />}
            <div className="pagination">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一頁
              </button>
              <span>
                第 {page} 頁 · 共 {query.data?.meta.total ?? 0} 筆
              </span>
              <button
                className="button secondary"
                disabled={page * 20 >= (query.data?.meta.total ?? 0)}
                onClick={() => setPage(page + 1)}
              >
                下一頁
              </button>
            </div>
          </div>
        </>
      )}
      {modal && (
        <Modal
          title={`${editing ? '編輯' : '新增'}${config.label}`}
          onClose={() => setModal(false)}
        >
          <ManageForm
            key={`${resource}-${editing?.id || 'new'}`}
            resource={resource}
            row={editing}
            onClose={() => setModal(false)}
          />
        </Modal>
      )}
    </>
  );
}
