import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, apiAll, apiPage, patch, post, qs } from '../services/api';
import { useApp } from '../services/context';
import { Empty, ErrorNote, Modal } from '../components/Ui';
import { resources, type Field } from './manage-config';
function localDate(v: string) {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
              ? new Date(v).toISOString()
              : v;
      }
      return row
        ? patch(`/${resource}/${row.id}?studio_id=${studio!.id}`, body)
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
function StudentEdit({ student, onClose }: { student: any; onClose: () => void }) {
  const { studio } = useApp();
  const qc = useQueryClient();
  const [name, setName] = useState(student.full_name || '');
  const [phone, setPhone] = useState(student.phone || '');
  const [birthday, setBirthday] = useState(student.birthday || '');
  const [notes, setNotes] = useState(student.notes || '');
  const save = useMutation({
    mutationFn: () =>
      patch(`/students/${student.student_id}/profile`, {
        studio_id: studio!.id,
        full_name: name,
        phone: phone || null,
        birthday: birthday || null,
        notes: notes || null,
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
        save.mutate();
      }}
    >
      <label>
        姓名
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        手機
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        生日
        <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
      </label>
      <label>
        備註
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {save.isError && <ErrorNote error={save.error} />}
      <button className="button" disabled={save.isPending}>
        儲存學生資料
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
      <p className="helper">{student.full_name || student.email} 的預約、出勤與堂數紀錄。</p>
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
            <span>{b.attendance?.status || '未確認'}</span>
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
                {new Date(l.created_at).toLocaleDateString('zh-TW')} · {l.note || ''}
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
  const [editing, setEditing] = useState<any>(null);
  const [adjusting, setAdjusting] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [enrollId, setEnrollId] = useState('');
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
  const enroll = useMutation({
    mutationFn: () => post('/students', { studio_id: studio!.id, student_id: enrollId }),
    onSuccess: () => {
      setEnrollId('');
      qc.invalidateQueries({ queryKey: ['students'] });
      setNotice('已將使用者加入此品牌。');
    },
  });
  return (
    <>
      <div className="panel">
        <h3>加入已註冊的學生</h3>
        <p className="helper">請學生先註冊，再提供「我的資料」中的 User ID。</p>
        <div className="form-two">
          <label>
            學生 User ID
            <input
              value={enrollId}
              onChange={(e) => setEnrollId(e.target.value)}
              placeholder="UUID"
            />
          </label>
          <button
            className="button"
            disabled={!enrollId || enroll.isPending}
            onClick={() => enroll.mutate()}
          >
            加入學生
          </button>
        </div>
        {enroll.isError && <ErrorNote error={enroll.error} />}
      </div>
      <div className="panel">
        <h3>指派學生方案</h3>
        <p className="helper">
          學生須先註冊並加入此品牌。選單顯示目前學生頁的資料，可用下方搜尋或換頁；方案不包含線上付款。
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
                    {s.full_name || s.email || s.student_id}
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
            <div key={s.id} className="student-row">
              <div>
                <strong>{s.full_name || '未填姓名'}</strong>
                <p>
                  {s.email} · {s.phone || '未填手機'}
                </p>
                <small>
                  {s.is_active ? '啟用' : '停用'} · ID {s.student_id}
                </small>
                <div className="button-row">
                  <button className="text-link" onClick={() => setEditing(s)}>
                    編輯資料
                  </button>
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
                      {new Date(p.expires_at).toLocaleDateString('zh-TW')}{' '}
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
      {editing && (
        <Modal title="編輯學生資料" onClose={() => setEditing(null)}>
          <StudentEdit student={editing} onClose={() => setEditing(null)} />
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
function Platform() {
  const { studio, studios } = useApp();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [user_id, setUserId] = useState('');
  const [notice, setNotice] = useState('');
  const create = useMutation({
    mutationFn: () => post('/studios', { name, slug }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studios'] });
      setName('');
      setSlug('');
      setNotice('品牌已建立。請切換品牌並建立網站設定。');
    },
  });
  const assign = useMutation({
    mutationFn: (is_active: boolean) =>
      post(`/studios/${studio!.id}/admins`, { user_id, is_active }),
    onSuccess: () => setNotice('品牌管理員權限已更新。'),
  });
  const activate = useMutation({
    mutationFn: (is_active: boolean) => patch(`/studios/${studio!.id}`, { is_active: is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studios'] }),
  });
  return (
    <>
      <section className="panel">
        <h3>建立品牌</h3>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label>
            品牌名稱
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            品牌代碼（小寫英文、數字、連字號）
            <input
              required
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          {create.isError && <ErrorNote error={create.error} />}
          <button className="button" disabled={create.isPending}>
            建立品牌
          </button>
        </form>
      </section>
      <section className="panel">
        <h3>設定目前品牌的管理員</h3>
        <p className="helper">
          切換上方品牌，並輸入已註冊使用者的 User ID。此操作只開放平台管理員。
        </p>
        <label>
          使用者 User ID
          <input value={user_id} onChange={(e) => setUserId(e.target.value)} placeholder="UUID" />
        </label>
        <div className="button-row">
          <button
            className="button"
            disabled={!user_id || assign.isPending}
            onClick={() => assign.mutate(true)}
          >
            指派管理員
          </button>
          <button
            className="button secondary"
            disabled={!user_id || assign.isPending}
            onClick={() => assign.mutate(false)}
          >
            停用管理員
          </button>
        </div>
        {assign.isError && <ErrorNote error={assign.error} />}
        <div className="button-row">
          <button
            className="button secondary"
            disabled={!studio || activate.isPending}
            onClick={() => activate.mutate(!(studio as any)?.is_active)}
          >
            {(studio as any)?.is_active ? '停用目前品牌' : '啟用目前品牌'}
          </button>
        </div>
        <p className="helper">目前共有 {studios.length} 個品牌。</p>
        {activate.isError && <ErrorNote error={activate.error} />}{' '}
        {notice && <div className="success-note">{notice}</div>}
      </section>
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
  const admin =
    me?.is_super_admin ||
    me?.memberships.some((m) => m.studio_id === studio?.id && m.role === 'admin' && m.is_active);
  const query = useQuery({
    queryKey: [resource, studio?.id, page, search],
    queryFn: () =>
      apiPage<any>(
        `/${resource}?${qs({ studio_id: studio!.id, page: String(page), limit: '20', q: search })}`,
      ),
    enabled: !!studio && resource !== 'students' && resource !== 'platform' && !!admin,
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
            'banners',
            'announcements',
          ].includes(resource) || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
      ),
    [query.data, search, resource],
  );
  const config = resources[resource];
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`/${resource}/${id}?studio_id=${studio!.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries(),
  });
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
            {me?.is_super_admin && <option value="platform">平台與品牌管理</option>}
            {Object.entries(resources).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {resource !== 'students' && resource !== 'platform' && (
          <>
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="搜尋"
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
                    'banners',
                    'announcements',
                  ].includes(resource)
                    ? `搜尋${config.label}`
                    : '搜尋目前頁面'
                }
              />
            </label>
            <button
              className="button"
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              <Plus size={17} />
              新增{config.label}
            </button>
          </>
        )}
      </div>
      {resource === 'students' ? (
        <Students />
      ) : resource === 'platform' ? (
        <Platform />
      ) : (
        <>
          {query.isError && <ErrorNote error={query.error} />}{' '}
          {remove.isError && <ErrorNote error={remove.error} />}{' '}
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
                    <tr key={row.id}>
                      {config.fields.slice(0, 4).map((f) => (
                        <td key={f.key}>
                          {typeof row[f.key] === 'boolean'
                            ? row[f.key]
                              ? '是'
                              : '否'
                            : String(row[f.key] ?? '—')}
                        </td>
                      ))}
                      <td>{row.is_active === false ? '停用' : '啟用'}</td>
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
                        {['teacher-branches', 'teacher-courses', 'package-courses'].includes(
                          resource,
                        ) && (
                          <button
                            className="text-link"
                            onClick={() => {
                              if (window.confirm('確定移除此項資格？')) remove.mutate(row.id);
                            }}
                          >
                            移除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && !query.isLoading && <Empty title={`尚無${config.label}資料`} />}
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
