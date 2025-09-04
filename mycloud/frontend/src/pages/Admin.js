import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../api";

// ——— helpers ———
function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  const num = val >= 10 ? Math.round(val) : Math.round(val * 10) / 10;
  return `${num} ${units[i]}`;
}
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}
function toList(data) {
  // DRF: может прийти массив или {count, next, previous, results:[...]}
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function Admin() {
  const token = useSelector((s) => s.auth.token);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);

  // сортировка
  const [sortKey, setSortKey] = useState("id");
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
      case "original_name":
        return (row.original_name || "").toLowerCase();
      case "size":
        return row.size ?? 0;
      case "created_at":
      case "uploaded_at":
        return new Date(row.created_at || row.uploaded_at || 0).getTime();
      case "user":
        return (row.user?.username || "").toLowerCase();
      case "description":
        return (row.description || "").toLowerCase();
      default:
        return row[key];
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

  useEffect(() => {
    if (token) {
      loadUsers();
      loadFiles();
    }
  }, [token]);

  const loadUsers = async () => {
    try {
      const { data } = await api(token).get("/admin/users/");
      setUsers(toList(data));
    } catch {
      alert("Недостаточно прав или требуется вход.");
    }
  };

  const loadFiles = async () => {
    try {
      const { data } = await api(token).get("/admin/files/");
      setFiles(toList(data));
    } catch (e) {
      console.error(e);
    }
  };

  const dl = async (id, name) => {
    const res = await api(token).get(`/admin/files/${id}/download/`, { responseType: "blob" });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const cd = res.headers?.["content-disposition"];
    const suggested = cd && /filename="(.+?)"/.exec(cd)?.[1];
    a.href = url;
    a.download = suggested || name || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const del = async (id) => {
    if (!confirm("Удалить файл?")) return;
    await api(token).delete(`/files/${id}/`);
    await loadFiles();
  };

  return (
    <div className="grid">
      <section className="card">
        <div className="card-header">Пользователи</div>
        <div className="card-body">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th><th>Логин</th><th>Email</th><th>Роль</th><th>Активен</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.is_active ? "Да" : "Нет"}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="5" style={{ color: "var(--muted)" }}>Нет данных</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Файлы пользователей</div>
        <div className="card-body">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  {header("ID", "id")}
                  {header("Имя файла", "original_name")}
                  {header("Размер", "size")}
                  {header("Дата", "uploaded_at")}
                  {header("Пользователь", "user")}
                  {header("Описание", "description")}
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {getSorted(files).map((f) => (
                  <tr key={f.id}>
                    <td>{f.id}</td>
                    <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.original_name || "—"}
                    </td>
                    <td>{formatBytes(f.size)}</td>
                    <td>{formatDate(f.uploaded_at || f.created_at)}</td>
                    <td>{f.user ? `${f.user.username} (id:${f.user.id})` : "—"}</td>
                    <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.description || "—"}
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => dl(f.id, f.original_name)}>Скачать</button>
                      <button className="btn danger" onClick={() => del(f.id)}>Удалить</button>
                    </td>
                  </tr>
                ))}
                {getSorted(files).length === 0 && (
                  <tr><td colSpan="7" style={{ color: "var(--muted)" }}>Нет файлов</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
