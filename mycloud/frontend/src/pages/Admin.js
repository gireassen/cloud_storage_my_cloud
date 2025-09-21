import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
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

export default function Admin() {
  const token = useSelector((s) => s.auth.token);

  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [toast, setToast] = useState("");

  const [busyUserId, setBusyUserId] = useState(null);
  const [filterUserId, setFilterUserId] = useState(null);

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
      case "uploaded_at":
      case "created_at":
        return new Date(row.uploaded_at || row.created_at || 0).getTime();
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
      loadFiles(null);
    }
  }, [token]);

  const loadUsers = async () => {
    const { data } = await api(token).get("/admin/users/");
    setUsers(toList(data));
  };

  const loadFiles = async (userId) => {
    const url = userId ? `/admin/files/?user=${encodeURIComponent(userId)}` : `/admin/files/`;
    const { data } = await api(token).get(url);
    setFiles(toList(data));
  };

  const sendResetLink = async (userId, email) => {
    if (!confirm(`Отправить ссылку для сброса пароля пользователю ${email || "(без email)"}?`)) return;
    try {
      setBusyUserId(userId);
      await api(token).post(`/admin/users/${userId}/send_reset_link/`);
      setToast("Ссылка для сброса отправлена (если SMTP сконфигурирован)");
    } catch {
      setToast("Не удалось отправить ссылку");
    } finally {
      setBusyUserId(null);
      setTimeout(() => setToast(""), 1800);
    }
  };

  const toggleAdmin = async (u) => {
    if (!confirm(`${u.is_staff ? "Снять" : "Назначить"} права администратора у ${u.username}?`)) return;
    try {
      try {
        await api(token).patch(`/admin/users/${u.id}/`, { is_staff: !u.is_staff });
      } catch {
        await api(token).post(`/admin/users/${u.id}/toggle_staff/`);
      }
      await loadUsers();
      setToast("Роль обновлена");
    } catch {
      setToast("Не удалось изменить роль");
    } finally {
      setTimeout(() => setToast(""), 1600);
    }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Удалить пользователя ${u.username}? Это действие необратимо.`)) return;
    try {
      await api(token).delete(`/admin/users/${u.id}/`);
      await loadUsers();
      if (filterUserId === u.id) {
        setFilterUserId(null);
        await loadFiles(null);
      }
      setToast("Пользователь удалён");
    } catch {
      setToast("Не удалось удалить пользователя");
    } finally {
      setTimeout(() => setToast(""), 1600);
    }
  };

  const filesSorted = useMemo(() => getSorted(files), [files, sortKey, sortDir]);

  return (
    <div className="container" style={{ paddingBottom: 60, maxWidth: "1400px" }}>
      {/* Пользователи */}
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ marginTop: 0 }}>Пользователи</h3>
          <button
            className="btn"
            onClick={() =>
              exportCsv(
                `users_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
                [
                  { label: "id", value: (u) => u.id },
                  { label: "username", value: (u) => u.username },
                  { label: "email", value: (u) => u.email || "" },
                  { label: "is_staff", value: (u) => (u.is_staff ? "1" : "0") },
                  { label: "is_active", value: (u) => (u.is_active ? "1" : "0") },
                  { label: "files_count", value: (u) => u.files_count ?? 0 },
                  { label: "files_total_size", value: (u) => u.files_total_size ?? 0 },
                  { label: "date_joined", value: (u) => u.date_joined || "" },
                ],
                users
              )
            }
          >
            Экспорт пользователей (CSV)
          </button>
        </div>

        <div className="table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", tableLayout: "fixed", minWidth: 1300 }}>
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "26%", minWidth: 260 }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%", minWidth: 320 }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Логин</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Активен</th>
                <th>Файлов</th>
                <th>Объём</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</td>
                  <td>{u.is_staff ? "Админ" : "Пользователь"}</td>
                  <td>{u.is_active ? "Да" : "Нет"}</td>
                  <td>{u.files_count ?? 0}</td>
                  <td>{formatBytes(u.files_total_size)}</td>
                  <td style={{ minWidth: 320 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {/* Переход на отдельную страницу хранилища пользователя */}
                      <Link className="btn" to={`/admin/users/${u.id}`}>Файлы</Link>

                      <button
                        className="btn"
                        onClick={() => sendResetLink(u.id, u.email)}
                        disabled={busyUserId === u.id}
                      >
                        {busyUserId === u.id ? "Отправка…" : "Сброс пароля"}
                      </button>

                      <button className="btn" onClick={() => toggleAdmin(u)}>
                        {u.is_staff ? "Снять админа" : "Назначить админа"}
                      </button>

                      <button className="btn danger" onClick={() => deleteUser(u)}>
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Файлы (общий список, можно оставить как обзор) */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ marginTop: 0 }}>Файлы пользователей</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn"
              onClick={() =>
                exportCsv(
                  `files_${filterUserId ? `user_${filterUserId}_` : ""}${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
                  [
                    { label: "id", value: (f) => f.id },
                    { label: "original_name", value: (f) => f.original_name || "" },
                    { label: "size", value: (f) => f.size ?? 0 },
                    { label: "uploaded_at", value: (f) => f.uploaded_at || f.created_at || "" },
                    { label: "user_id", value: (f) => f.user?.id ?? "" },
                    { label: "username", value: (f) => f.user?.username ?? "" },
                    { label: "description", value: (f) => f.description || "" },
                  ],
                  filesSorted
                )
              }
            >
              Экспорт файлов (CSV)
            </button>

            {filterUserId ? (
              <>
                <div style={{ color: "var(--muted)" }}>Фильтр по пользователю ID: {filterUserId}</div>
                <button
                  className="btn"
                  onClick={async () => {
                    setFilterUserId(null);
                    await loadFiles(null);
                  }}
                >
                  Сбросить фильтр
                </button>
              </>
            ) : (
              <div style={{ color: "var(--muted)" }}>Показываются файлы всех пользователей</div>
            )}
          </div>
        </div>

        <div className="table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", tableLayout: "fixed", minWidth: 1400 }}>
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%", minWidth: 280 }} />
            </colgroup>
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
              {filesSorted.map((f) => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.original_name || "—"}
                  </td>
                  <td>{formatBytes(f.size)}</td>
                  <td>{new Date(f.uploaded_at || f.created_at).toLocaleString()}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.user ? `${f.user.username} (id:${f.user.id})` : "—"}
                  </td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.description || "—"}
                  </td>
                  <td style={{ minWidth: 280 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}>
                      <button
                        className="btn"
                        onClick={async () => {
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
                        }}
                      >
                        Скачать
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          const d = prompt("Описание файла:", f.description || "");
                          if (d === null) return;
                          api(token)
                            .patch(`/files/${f.id}/`, { description: d })
                            .then(() => setFiles((p) => p.map((x) => (x.id === f.id ? { ...x, description: d } : x))));
                        }}
                        title="Редактировать описание"
                      >
                        ✎
                      </button>
                      <button
                        className="btn danger"
                        onClick={async () => {
                          if (!confirm("Удалить файл?")) return;
                          await api(token).delete(`/files/${f.id}/`);
                          setFiles((p) => p.filter((x) => x.id !== f.id));
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filesSorted.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>
                    Нет файлов
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
