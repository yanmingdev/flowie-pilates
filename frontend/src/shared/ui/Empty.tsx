/** 呈現有意義的空資料狀態；維持現有角色與互動規則。 */ export function Empty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-flower">✳</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
