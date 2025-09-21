import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { api } from "../api";

/* helpers */
function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  const num = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${num} ${u[i]}`;
}
function toList(d) {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.results)) return d.results;
  return [];
}
function exportCsv(filename, columns, rows) {
  const esc = (s) => {
    const s2 = s == null ? "" : String(s);
    return /[",\n;\t]/.test(s2) ? `"${s2.replace(/"/g, '""')}"` : s2;
  };
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) =>
      columns.map((c) => esc(typeof c.value === "function" ? c.value(r) : r[c.value])).join(",")
    )
    .join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminUserFiles() {
  const { id } = useParams();
  const userId = String(id || "").trim();
  const token = useSelector((s) => s.auth.token);
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [toast, setToast] = useState("");

  const [sortKey, setSortKey] = useState("uploaded_at");
  const [sortDir, setSortDir] = useState("desc");

  const header = (label, key) => {
    const active = sortKey === key;
    const arrow = active ? (sortDir === "asc" ? "↑" : "↓") : "";
    return (
      <th onClick={() => sortBy(key)} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
        {label} {arrow}
      </th>
    );
  };
  const sortBy = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const keyExtract = (row, key) => {
    switch (key) {
      case "original_name": return (row.original_name || "").toLowerCase();
      case "size": return row.size ?? 0;
      case "uploaded_at":
      case "created_at": return new Date(row.uploaded_at || row.created_at || 0).getTime();
      case "description": return (row.description || "").toLowerCase();
      default: return row[key];
    }
  };
  const getSorted = (arr) => {
    const data = Array.isArray(arr) ? [...arr] : toList(arr);
    return data.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      const va = keyExtract(a, sortKey);
      const vb = keyExtract(b, sortKey);
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
  };
  const filesSorted = useMemo(() => getSorted(files), [files, sortKey, sortDir]);

  useEffect(() => {
    if (!token || !userId) return;
    loadUser();
    loadFiles();
  }, [token, userId]);

  const loadUser = async () => {
    try {
      const { data } = await api(token).get(`/admin/users/${userId}/`);
      setUser(data);
    } catch {
      setToast("Пользователь не найден");
      setTimeout(() => setToast(""), 1500);
      nav("/admin");
    }
  };

  const loadFiles = async () => {
    try {
      // пробуем ?user= и ?user_id= — поддержка обоих вариантов бэка
      let { data } = await api(token).get(`/admin/files/?user=${encodeURIComponent(userId)}`);
      let list = toList(data);
      if (list.length === 0) {
        const r2 = await api(token).get(`/admin/files/?user_id=${encodeURIComponent(userId)}`);
        list = toList(r2.data);
      }
      setFiles(list);
    } catch {
      setToast("Не удалось загрузить файлы");
      setTimeout(() => setToast(""), 1600);
    }
  };

  const download = async (f) => {
    try {
      const r = await api(token).get(`/admin/files/${f.id}/download/`, { responseType: "blob" });
      const blob = new Blob([r.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = r.headers?.["content-disposition"];
      const suggested = cd && /filename="(.+?)"/.exec(cd)?.[1];
      a.href = url;
      a.download = suggested || f.original_name || "file";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setToast("Ошибка скачивания");
      setTimeout(() => setToast(""), 1600);
    }
  };

  const editDescription = async (f) => {
    const d = prompt("Описание файла:", f.description || "");
    if (d === null) return;
    try {
      await api(token).patch(`/files/${f.id}/`, { description: d });
      setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, description: d } : x)));
    } catch {
      setToast("Не удалось сохранить");
      setTimeout(() => setToast(""), 1500);
    }
  };

  const removeFile = async (f) => {
    if (!confirm("Удалить файл?")) return;
    try {
      await api(token).delete(`/files/${f.id}/`);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
    } catch {
      setToast("Не удалось удалить");
      setTimeout(() => setToast(""), 1500);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: 60, maxWidth: "1400px" }}>
      <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ marginBottom: 6 }}>
            <Link to="/admin" className="btn">← К списку пользователей</Link>
          </div>
          <h2 style={{ margin: 0 }}>
            Хранилище пользователя {user ? <b>{user.username}</b> : `id:${userId}`}
          </h2>
          {user && (
            <div style={{ marginTop: 6, color: "var(--muted)" }}>
              Email: {user.email || "—"} • Роль: {user.is_staff ? "Админ" : "Пользователь"} •{" "}
              Файлов: {user.files_count ?? 0} • Объём: {formatBytes(user.files_total_size)}
            </div>
          )}
        </div>
        <div>
          <button
            className="btn"
            onClick={() =>
              exportCsv(
                `user_${userId}_files_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
                [
                  { label: "id", value: (f) => f.id },
                  { label: "original_name", value: (f) => f.original_name || "" },
                  { label: "size", value: (f) => f.size ?? 0 },
                  { label: "uploaded_at", value: (f) => f.uploaded_at || f.created_at || "" },
                  { label: "description", value: (f) => f.description || "" },
                ],
                filesSorted
              )
            }
          >
            Экспорт файлов (CSV)
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", tableLayout: "fixed", minWidth: 1200 }}>
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "42%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "18%", minWidth: 260 }} />
            </colgroup>
            <thead>
              <tr>
                {header("ID", "id")}
                {header("Имя файла", "original_name")}
                {header("Размер", "size")}
                {header("Дата", "uploaded_at")}
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filesSorted.map((f) => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.original_name || "—"}
                  </td>
                  <td>{formatBytes(f.size)}</td>
                  <td>{new Date(f.uploaded_at || f.created_at).toLocaleString()}</td>
                  <td style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}>
                      <button className="btn" onClick={() => download(f)}>Скачать</button>
                      <button className="btn" onClick={() => editDescription(f)} title="Описание">✎</button>
                      <button className="btn danger" onClick={() => removeFile(f)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filesSorted.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>
                    У пользователя нет файлов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
