import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { meThunk } from "../store";
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
        // клик по подложке закрывает
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

export default function Dashboard() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const user = useSelector((s) => s.auth.user);

  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // ===== сортировка =====
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

  // ===== состояние модалки редактирования =====
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // файл
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!token) return;
    dispatch(meThunk());
    loadFiles();
  }, [token]);

  const loadFiles = async () => {
    const { data } = await api(token).get("/files/");
    setFiles(toList(data));
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (desc) form.append("description", desc);
      await api(token).post("/files/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      setDesc("");
      await loadFiles();
      setToast("Файл загружен");
    } catch {
      setToast("Ошибка загрузки");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(""), 1600);
    }
  };

  const del = async (id) => {
    if (!confirm("Удалить файл?")) return;
    await api(token).delete(`/files/${id}/`);
    await loadFiles();
  };

const link = async (id) => {
  const { data } = await api(token).post(`/links/`, { file_id: id });
  const url = data.url.startsWith("http")
    ? data.url
    : window.location.origin + data.url;

  await navigator.clipboard?.writeText(url);
  setToast("Ссылка скопирована в буфер обмена");
  setTimeout(() => setToast(""), 1500);
};


  const dl = async (id, name) => {
    try {
      const res = await api(token).get(`/files/${id}/download/`, { responseType: "blob" });
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
    } catch {
      setToast("Ошибка скачивания");
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

  // закрытие по ESC
  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e) => e.key === "Escape" && closeEdit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen]);

  if (!token)
    return (
      <div className="card">
        <div className="card-body">Требуется вход</div>
      </div>
    );

  return (
    <div className="grid">
      <section className="card">
        <div
          className="card-body"
          style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12 }}
        >
          <div>
            Пользователь: <b>{user?.username}</b>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Загрузка файла</div>
        <div className="card-body">
          <form onSubmit={upload} className="grid cols-2">
            <div className="field">
              <input className="file" type="file" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <div className="field">
              <input
                className="input"
                placeholder="Описание (необязательно)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <button className="btn" type="submit" disabled={loading || !file}>
                {loading ? <span className="spinner" /> : "Загрузить"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Мои файлы</div>
        <div className="card-body">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  {header("Имя", "original_name")}
                  {header("Размер", "size")}
                  {header("Дата", "uploaded_at")}
                  {header("Описание", "description")}
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {getSorted(files).map((f) => (
                  <tr key={f.id}>
                    <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.original_name}
                    </td>
                    <td>{formatBytes(f.size)}</td>
                    <td>{formatDate(f.uploaded_at || f.created_at)}</td>
                    <td style={{ maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.description || "—"}
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => dl(f.id, f.original_name)}>Скачать</button>
                      <button className="btn" onClick={() => link(f.id)}>Ссылка</button>
                      <button className="btn" onClick={() => openEdit(f)} title="Редактировать описание">✎</button>
                      <button className="btn danger" onClick={() => del(f.id)}>Удалить</button>
                    </td>
                  </tr>
                ))}
                {getSorted(files).length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ color: "var(--muted)" }}>
                      Пока нет файлов
                    </td>
                  </tr>
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
