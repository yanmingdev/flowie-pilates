import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { apiPage, qs } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { Modal } from '../../../shared/ui/Modal';
import { resources } from '../config/resource-fields';
import { Students } from '../components/Students';
import { ManageForm } from '../components/ManageForm';

/** 呈現管理後台的資源切換與表單入口；維持現有角色與互動規則。 */ export function Manage() {
  const { studio, me } = useApp();
  const [resource, setResource] = useState('branches');
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const admin = !!me?.profile.is_admin && !!me.profile.is_active;
  const query = useQuery({
    queryKey: [resource, studio?.id, page, search],

    queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
      apiPage<any>(
        `/${resource}?${qs({ studio_id: studio!.id, page: String(page), limit: '20', q: search })}`,
      ),
    enabled: !!studio && resource !== 'students' && !!admin,
  });
  const rows = useMemo(
    /** 依相依值計算可重用的衍生資料，避免重複計算。 */ () =>
      (query.data?.data || []).filter(
        /** 依目前條件保留符合的項目，不修改原始清單。 */ (r) =>
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
            onChange={
              /** 同步輸入值與對應的表單狀態。 */ (e) => {
                setResource(e.target.value);
                setSearch('');
                setPage(1);
              }
            }
          >
            <option value="students">學生與方案指派</option>
            {Object.entries(resources).map(
              /** 將每個項目轉換為本次清單需要的資料或元件。 */ ([key, c]) => (
                <option key={key} value={key}>
                  {c.label}
                </option>
              ),
            )}
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
                onChange={
                  /** 同步輸入值與對應的表單狀態。 */ (e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }
                }
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
            {!(resource === 'site-settings' && rows.length > 0) && (
              <button
                className="button"
                onClick={
                  /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => {
                    setEditing(null);
                    setModal(true);
                  }
                }
              >
                <Plus size={17} />
                新增{config.label}
              </button>
            )}
          </>
        )}
      </div>
      {resource === 'students' ? (
        <Students />
      ) : (
        <>
          {query.isError && (
            <ErrorNote
              error={query.error}
              retry={
                /** 重新載入本區塊查詢，提供連線失敗後的重試入口。 */ () => {
                  void query.refetch();
                }
              }
            />
          )}{' '}
          <div className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {config.fields.slice(0, 4).map(
                      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (f) => (
                        <th key={f.key}>{f.label}</th>
                      ),
                    )}
                    <th>狀態</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(
                    /** 將每個項目轉換為本次清單需要的資料或元件。 */ (row) => (
                      <tr key={row.id ?? row.section_type}>
                        {config.fields.slice(0, 4).map(
                          /** 將每個項目轉換為本次清單需要的資料或元件。 */ (f) => (
                            <td key={f.key}>
                              {typeof row[f.key] === 'boolean'
                                ? row[f.key]
                                  ? '是'
                                  : '否'
                                : String(row[f.key] ?? '—')}
                            </td>
                          ),
                        )}
                        <td>
                          {row.is_active === undefined ? '—' : row.is_active ? '啟用' : '停用'}
                        </td>
                        <td>
                          <button
                            className="text-link"
                            onClick={
                              /** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => {
                                setEditing(row);
                                setModal(true);
                              }
                            }
                          >
                            編輯
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            {!rows.length && !query.isLoading && !query.isError && (
              <Empty title={`尚無${config.label}資料`} />
            )}
            <div className="pagination">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => setPage(page - 1)}
              >
                上一頁
              </button>
              <span>
                第 {page} 頁 · 共 {query.data?.meta.total ?? 0} 筆
              </span>
              <button
                className="button secondary"
                disabled={page * 20 >= (query.data?.meta.total ?? 0)}
                onClick={/** 處理目前按鈕操作，依元件狀態執行對應動作。 */ () => setPage(page + 1)}
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
          onClose={/** 關閉目前介面並清理選取狀態。 */ () => setModal(false)}
        >
          <ManageForm
            key={`${resource}-${editing?.id || 'new'}`}
            resource={resource}
            row={editing}
            onClose={/** 關閉目前介面並清理選取狀態。 */ () => setModal(false)}
          />
        </Modal>
      )}
    </>
  );
}
