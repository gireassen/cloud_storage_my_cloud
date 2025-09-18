import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../api";

/* ===== helpers ===== */

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

async function copyToClipboard(text) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "absolute";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  const sel = document.getSelection();
  const prev = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  document.body.removeChild(ta);
  if (prev && sel) { sel.removeAllRanges(); sel.addRange(prev); }
  return ok;
}

/* ===== простая модалка ===== */
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        className="modal"
        style={{
          background: "var(--panel)", borderRadius: 10, width: "min(900px, 96vw)",
          padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        {title && <h3 style={{ margin: "6px 0 14px 0" }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/* ===== страница ===== */
export default function Admin() {
  const token = useSelector((s) => s.auth.token);

  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [toast, setToast] = useState("");

  // сортировка файлов
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
    else { setSortKey(key); setSortDir("asc"); }
  };

  const keyExtract = (row, key) => {
    switch (key) {
      case "original_name": return (row.original_name || "").toLowerCase();
      case "size": return row.size ?? 0;
      case "created_at":
      case "uploaded_at": return new Date(row.created_at || row.uploaded_at || 0).getTime();
      case "user": return (row.user?.username || "").toLowerCase();
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

  // модалка редактирования описания файла
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (token) { loadUsers(); loadFiles(); }
  }, [token]);

  const loadUsers = async () => {
    try { const { data } = await api(token).get("/admin/users/"); setUsers(toList(data)); }
    catch { alert("Недостаточно прав или требуется вход."); }
  };

  const loadFiles = async () => {
    try { const { data } = await api(token).get("/admin/files/"); setFiles(toList(data)); }
    catch (e) { console.error(e); }
  };

  const dl = async (id, name) => {
    const res = await api(token).get(`/admin/files/${id}/download/`, { responseType: "blob" });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const cd = res.headers?.["content-disposition"];
    const suggested = cd && /filename="(.+?)"/.exec(cd)?.[1];
    a.href = url; a.download = suggested || name || "file";
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  const del = async (id) => {
    if (!confirm("Удалить файл?")) return;
    await api(token).delete(`/files/${id}/`);
    await loadFiles();
  };

  const renderRole = (u) => (u.is_staff ? "Админ" : "Пользователь");

  const openEdit = (f) => { setEditTarget(f); setEditText(f.description || ""); setEditOpen(true); };
  const closeEdit = () => { setEditOpen(false); setEditTarget(null); setEditText(""); };
  const saveEdit = async () => {
    if (!editTarget) return;
    await api(token).patch(`/files/${editTarget.id}/`, { description: editText });
    setFiles((prev) => prev.map((x) => (x.id === editTarget.id ? { ...x, description: editText } : x)));
    closeEdit();
  };

  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e) => e.key === "Escape" && closeEdit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen]);

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      {/* ===== пользователи ===== */}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Пользователи</h3>

        {/* горизонтальный скролл при узком экране */}
        <div className="table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", tableLayout: "fixed", minWidth: 820 }}>
            <colgroup>
              <col style={{ width: "7%" }} />   {/* ID */}
              <col style={{ width: "21%" }} />  {/* Логин */}
              <col style={{ width: "28%" }} />  {/* Email */}
              <col style={{ width: "12%" }} />  {/* Роль */}
              <col style={{ width: "8%" }} />   {/* Активен */}
              <col style={{ width: "24%", minWidth: 170 }} /> {/* Пароль/кнопки */}
            </colgroup>
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
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</td>
                  <td>{renderRole(u)}</td>
                  <td>{u.is_active ? "Да" : "Нет"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
                      <button
                        className="btn"
                        onClick={() => api(token).post(`/admin/users/${u.id}/send_reset_link/`).then(() => {
                          setToast("Ссылка для сброса отправляется"); setTimeout(() => setToast(""), 1600);
                        }).catch(() => { setToast("Не удалось отправить ссылку"); setTimeout(() => setToast(""), 1600); })}
                        title="Отправить ссылку для сброса пароля"
                      >
                        Сброс пароля
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== файлы ===== */}
      <div className="panel" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Файлы пользователей</h3>

        <div className="table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", tableLayout: "fixed", minWidth: 980 }}>
            <colgroup>
              <col style={{ width: "6%" }} />    {/* ID */}
              <col style={{ width: "34%" }} />   {/* Имя файла */}
              <col style={{ width: "11%" }} />   {/* Размер */}
              <col style={{ width: "18%" }} />   {/* Дата */}
              <col style={{ width: "16%" }} />   {/* Пользователь */}
              <col style={{ width: "15%" }} />   {/* Описание */}
              <col style={{ width: "20%", minWidth: 240 }} /> {/* Действия */}
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
              {getSorted(files).map((f) => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.original_name || "—"}
                  </td>
                  <td>{formatBytes(f.size)}</td>
                  <td>{formatDate(f.uploaded_at || f.created_at)}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.user ? `${f.user.username} (id:${f.user.id})` : "—"}
                  </td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.description || "—"}
                  </td>
                  <td style={{ minWidth: 240 }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", flexWrap: "nowrap" }}>
                      <button className="btn" onClick={() => dl(f.id, f.original_name)}>Скачать</button>
                      <button className="btn" onClick={() => { setEditTarget(f); setEditText(f.description || ""); setEditOpen(true); }} title="Редактировать описание">✎</button>
                      <button className="btn danger" onClick={() => del(f.id)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
              {getSorted(files).length === 0 && (
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

      {/* модалка редактирования описания файла */}
      <Modal open={editOpen} title="Редактирование файла" onClose={closeEdit}>
        <div className="field">
          <label className="label">Описание</label>
          <textarea
            className="input"
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
