import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { meThunk } from "../store";
import { api } from "../api";

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

export default function Dashboard() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const user = useSelector((s) => s.auth.user);
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
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

  // инлайн-редактирование описания
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

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
      await api(token).post("/files/", form, { headers: { "Content-Type": "multipart/form-data" } });
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
    const url = window.location.origin + data.url;
    navigator.clipboard?.writeText(url);
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

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditingText(f.description || "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };
  const saveDescription = async (id) => {
    try {
      await api(token).patch(`/files/${id}/`, { description: editingText });
      // локально обновим без повторной загрузки
      setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, description: editingText } : x)));
      cancelEdit();
    } catch {
      setToast("Не удалось сохранить");
      setTimeout(() => setToast(""), 1600);
    }
  };

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
                    <td style={{ maxWidth: 320 }}>
                      {editingId === f.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            className="input"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            placeholder="Описание файла"
                            style={{ flex: 1 }}
                          />
                          <button className="btn" onClick={() => saveDescription(f.id)}>Сохранить</button>
                          <button className="btn" onClick={cancelEdit}>Отмена</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>
                            {f.description || "—"}
                          </span>
                          <button className="btn" title="Редактировать" onClick={() => startEdit(f)}>✎</button>
                        </div>
                      )}
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => dl(f.id, f.original_name)}>Скачать</button>
                      <button className="btn" onClick={() => link(f.id)}>Ссылка</button>
                      <button className="btn danger" onClick={() => del(f.id)}>Удалить</button>
                    </td>
                  </tr>
                ))}
                {getSorted(files).length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ color: "var(--muted)" }}>Пока нет файлов</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
