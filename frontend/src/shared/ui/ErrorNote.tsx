/** 呈現可重試的錯誤訊息；維持現有角色與互動規則。 */ export function ErrorNote({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="error-note">
      {error instanceof Error ? error.message : '資料載入失敗，請稍後再試。'}
      {retry && (
        <button type="button" onClick={retry}>
          重新載入
        </button>
      )}
    </div>
  );
}
