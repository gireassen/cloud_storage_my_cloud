import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../api";

// ===== helpers =====
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
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

// ===== простая модалка =====
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="card"
        style={{ width: "min(720px, 96vw)", maxHeight: "90vh", overflow: "auto" }}
      >
        {title && <div className="card-header">{title}</div>}
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}

export default function Admin() {
  const token = useSelector((s) => s.auth.token);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [toast, setToast] = useState("");

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

  // модалка редактирования
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editText, setEditText] = useState("");

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

  // ==== admin: временный пароль + сброс по email ====
  const setTempPassword = async (userId) => {
    if (!confirm("Выдать пользователю временный пароль?")) return;
    try {
      const { data } = await api(token).post(`/admin/users/${userId}/set_temp_password/`);
      const pwd = data?.temporary_password;
      if (pwd) {
        await navigator.clipboard?.writeText(pwd);
        setToast("Временный пароль скопирован в буфер");
        setTimeout(() => setToast(""), 1600);
        alert(`Временный пароль: ${pwd}\n(он уже в буфере обмена)`);
      } else {
        setToast("Пароль выдан");
        setTimeout(() => setToast(""), 1600);
      }
    } catch (e) {
      console.error(e);
      setToast("Не удалось выдать временный пароль");
      setTimeout(() => setToast(""), 1600);
    }
  };

  const sendResetLink = async (userId) => {
    try {
      const { data } = await api(token).post(`/admin/users/${userId}/send_reset_link/`);
      const link = data?.link;
      if (link) {
        await navigator.clipboard?.writeText(link);
        setToast("Ссылка для сброса скопирована");
      } else {
        setToast("Если настроен email, письмо отправлено");
      }
      setTimeout(() => setToast(""), 1600);
    } catch (e) {
      console.error(e);
      setToast("Не удалось отправить ссылку");
      setTimeout(() => setToast(""), 1600);
    }
  };

  const openEdit = (f) => {
    setEditTarget(f);
    setEditText(f.description || "");
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditTarget(null);
    setEditText("");
  };
  const saveEdit = async () => {
    if (!editTarget) return;
    await api(token).patch(`/files/${editTarget.id}/`, { description: editText });
    setFiles((prev) => prev.map((x) => (x.id === editTarget.id ? { ...x, description: editText } : x)));
    closeEdit();
  };

  // ESC закрывает
  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e) => e.key === "Escape" && closeEdit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen]);

  return (
    <div className="grid">
      <section className="card">
        <div className="card-header">Пользователи</div>
        <div className="card-body">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Активен</th>
                  <th>Пароль</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    {/* у некоторых сериализаторов нет поля role — подстрахуемся */}
                    <td>{u.role ?? (u.is_staff ? "admin" : "user")}</td>
                    <td>{u.is_active ? "Да" : "Нет"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn" onClick={() => setTempPassword(u.id)} title="Выдать временный пароль">
                        Временный пароль
                      </button>
                      <button className="btn" onClick={() => sendResetLink(u.id)} title="Отправить ссылку для сброса">
                        Сброс по email
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ color: "var(--muted)" }}>Нет данных</td>
                  </tr>
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
                    <td style={{ maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.description || "—"}
                    </td>
                    <td style={{ display: "flex", gap: 8, position: "relative", zIndex: 1 }}>
                      <button className="btn" onClick={() => dl(f.id, f.original_name)}>Скачать</button>
                      <button className="btn" onClick={() => openEdit(f)} title="Редактировать описание">✎</button>
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

      {/* модалка редактирования */}
      <Modal
        open={editOpen}
        title={editTarget ? `Описание: ${editTarget.original_name}` : "Описание файла"}
        onClose={closeEdit}
      >
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="label">Описание</label>
          <textarea
            className="input"
            rows={6}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Введите описание файла"
            style={{ width: "100%", resize: "vertical", minHeight: 120, padding: "10px 12px" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={saveEdit}>Сохранить</button>
          <button className="btn" onClick={closeEdit}>Отмена</button>
        </div>
      </Modal>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
