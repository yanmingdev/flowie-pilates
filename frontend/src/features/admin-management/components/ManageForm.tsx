import { toTaipeiDateTimeInput as localDate } from '../../../shared/utils/date-time';
import { useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { apiAll, patch, post } from '../../../shared/api/http-client';
import { useApp } from '../../../shared/state/AppContext';
import { ErrorNote } from '../../../shared/ui/ErrorNote';
import { resources, type Field } from '../config/resource-fields';

/** 呈現依欄位白名單組合資源維護表單；維持現有角色與互動規則。 */ export function ManageForm({
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
  const [values, setValues] = useState<Record<string, any>>(
    /** 建立此元件的初始狀態，避免每次重新渲染重建。 */ () =>
      Object.fromEntries(
        config.fields.map(
          /** 將每個項目轉換為本次清單需要的資料或元件。 */ (f) => [
            f.key,
            row?.[f.key] === undefined
              ? (f.defaultValue ?? (f.type === 'checkbox' ? false : ''))
              : f.type === 'datetime-local' && row[f.key]
                ? localDate(row[f.key])
                : (row[f.key] ?? ''),
          ],
        ),
      ),
  );
  const sources = Array.from(
    new Set(
      config.fields
        .map(/** 將每個項目轉換為本次清單需要的資料或元件。 */ (f) => f.source)
        .filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (x): x is string => !!x),
    ),
  );
  const lookups = useQueries({
    queries: sources.map(
      /** 將每個項目轉換為本次清單需要的資料或元件。 */ (s) => ({
        queryKey: [s, studio?.id],

        queryFn: /** 載入目前查詢需要的資料；查詢狀態與錯誤交由 React Query 管理。 */ () =>
          apiAll<any>(s, studio!.id),
        enabled: !!studio,
      }),
    ),
  });
  const options = /** 組合目前欄位可選的啟用資料，保留外鍵選單關聯。 */ (
    f: Field,
  ): [string, string][] => {
    if (f.options) return f.options;
    if (!f.source) return [];
    const data = lookups[sources.indexOf(f.source)]?.data || [];
    return data
      .filter(/** 依目前條件保留符合的項目，不修改原始清單。 */ (x: any) => x.is_active !== false)
      .map(
        /** 將每個項目轉換為本次清單需要的資料或元件。 */ (x: any) => [
          x.id,
          x.name || x.title || x.id,
        ],
      );
  };
  const mutation = useMutation({
    mutationFn: /** 送出這次表單或交易請求；成功後才進行快取更新。 */ async () => {
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

    onSuccess: /** 操作成功後刷新相關查詢或關閉表單，避免顯示過期資料。 */ () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  return (
    <form
      className="form-stack"
      onSubmit={
        /** 處理表單送出及非同步結果，保留現有驗證與錯誤提示。 */ (e) => {
          e.preventDefault();
          mutation.mutate();
        }
      }
    >
      {config.fields.map(
        /** 將每個項目轉換為本次清單需要的資料或元件。 */ (f) => (
          <label key={f.key} className={f.type === 'checkbox' ? 'check-label' : ''}>
            {f.type === 'checkbox' ? (
              <>
                <input
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={
                    /** 同步輸入值與對應的表單狀態。 */ (e) =>
                      setValues({ ...values, [f.key]: e.target.checked })
                  }
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
                    onChange={
                      /** 同步輸入值與對應的表單狀態。 */ (e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                ) : f.type === 'select' ? (
                  <select
                    required={f.required}
                    disabled={!!row && f.key === 'section_type'}
                    value={values[f.key]}
                    onChange={
                      /** 同步輸入值與對應的表單狀態。 */ (e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                    }
                  >
                    <option value="">請選擇</option>
                    {options(f).map(
                      /** 將每個項目轉換為本次清單需要的資料或元件。 */ ([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    required={f.required}
                    disabled={f.readOnly || (!!row && f.key === 'id')}
                    value={values[f.key]}
                    onChange={
                      /** 同步輸入值與對應的表單狀態。 */ (e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                )}
              </>
            )}
          </label>
        ),
      )}
      {mutation.isError && <ErrorNote error={mutation.error} />}
      <button className="button button-full" disabled={mutation.isPending}>
        {mutation.isPending ? '儲存中…' : '儲存'}
      </button>
    </form>
  );
}
