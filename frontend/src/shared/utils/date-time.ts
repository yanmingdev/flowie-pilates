export const dateTime = /** 以 Asia/Taipei 顯示場次日期、星期與時間。 */ (v: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));
export const shortTime = /** 以 Asia/Taipei 顯示小時及分鐘，不採用瀏覽器所在地時區。 */ (
  v: string,
) =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));
export const range = /** 以目前時間建立查詢起迄範圍；輸出為帶 UTC 時區的 ISO 字串。 */ (
  daysBack = 0,
  daysForward = 45,
) => ({
  from: new Date(Date.now() - daysBack * 86400000).toISOString(),
  to: new Date(Date.now() + daysForward * 86400000).toISOString(),
});

/** 把時間轉成台灣時區的 datetime-local 欄位值，避免依執行主機時區偏移。 */ export function toTaipeiDateTimeInput(
  value: string | Date,
) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date(value))
    .replace(' ', 'T');
}

/** 把使用者輸入的台灣當地時間補上 +08:00，轉為後端接受的 ISO 時間。 */ export function taipeiToIso(
  value: string,
) {
  return new Date(`${value}+08:00`).toISOString();
}
