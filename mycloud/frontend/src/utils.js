export function humanSize(bytes) {
  const b = Number(bytes || 0);
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  const val = b / Math.pow(k, i);
  return `${(i === 0 ? Math.round(val) : val.toFixed(1))} ${sizes[i]}`;
}

export function humanDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}
