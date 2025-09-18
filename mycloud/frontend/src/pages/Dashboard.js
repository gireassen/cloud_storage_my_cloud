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
async function copyToClipboard(text) {
  if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  // Фолбек: скрытая textarea + execCommand('copy')
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "absolute";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);

  const selection = document.getSelection();
  const prevRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;

  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(ta);
    if (prevRange && selection) {
      selection.removeAllRanges();
      selection.addRange(prevRange);
    }
  }
  return ok;
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="modal"
        style={{
          background: "var(--panel)",
          borderRadius: 10,
          width: "min(720px, 92vw)",
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        {title && <h3 style={{ margin: "6px 0 14px 0" }}>{title}</h3>}
        {children}
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

  // сортировка
  const [sortKey, setSortKey] = useState("uploaded_at");
  const [sortDir, setSortDir] = useState("desc");

  const header = (label, key) => {
    const active = sortKey === key;
    const arrow = active ? (sortDir === "asc" ? "↑" : "↓") : "";
    return (
      <th
        onClick={() => sortBy(key)}
        style={{ cursor: "pointer", whiteSpace: "nowrap" }}
      >
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

  // модалка редактирования описания файла
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editText, setEditText] = useState("");

  // модалка сброса пароля
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    dispatch(meThunk());
    loadFiles();
  }, [token]);

  useEffect(() => {
    setResetEmail(user?.email || "");
  }, [user]);

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
    try {
      const { data } = await api(token).post(`/links/`, { file_id: id });

      const fullUrl =
        typeof data?.url === "string"
          ? new URL(data.url, window.location.origin).toString()
          : window.location.origin;

      const ok = await copyToClipboard(fullUrl);

      if (ok) {
        setToast("Ссылка скопирована в буфер обмена");
      } else {
        window.prompt("Скопируйте ссылку вручную:", fullUrl);
        setToast("Ссылка готова");
      }
    } catch {
      setToast("Не удалось создать ссылку");
    } finally {
      setTimeout(() => setToast(""), 1500);
    }
  };

  const dl = async (id, name) => {
    try {
      const res = await api(token).get(`/files/${id}/download/`, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers["content-disposition"];
      const suggested = cd && /filename="(.+?)"/.exec(cd)?.[1];
      a.href = url;
      a.download = suggested || name || "file";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
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
    setFiles((prev) =>
      prev.map((x) => (x.id === editTarget.id ? { ...x, description: editText } : x))
    );
    closeEdit();
  };

  // Сброс пароля (по email)
  const openReset = () => {
    setResetEmail(user?.email || "");
    setResetOpen(true);
  };
  const closeReset = () => {
    if (resetLoading) return;
    setResetOpen(false);
  };
  const submitReset = async (e) => {
    e?.preventDefault?.();
    if (!resetEmail) {
      setToast("Укажите email");
      setTimeout(() => setToast(""), 1500);
      return;
    }
    setResetLoading(true);
    try {
      await api(token).post("/auth/password/reset-request/", { email: resetEmail });
      setToast("Если email зарегистрирован, письмо отправлено");
      setResetOpen(false);
    } catch (err) {
      setToast("Не удалось отправить письмо");
    } finally {
      setResetLoading(false);
      setTimeout(() => setToast(""), 1800);
    }
  };

  // ESC закрывает модалки
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (editOpen) closeEdit();
        if (resetOpen) closeReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen, resetOpen]);

  if (!token)
    return (
      <div className="container">
        <h2>Требуется вход</h2>
      </div>
    );

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="panel" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0 }}>Личный кабинет</h1>
          <div style={{ marginTop: 10 }}>
            Пользователь: <b>{user?.username}</b>{" "}
            {user?.email ? `(${user.email})` : ""}
          </div>
        </div>
        <div>
          <button className="btn" onClick={openReset}>
            Сбросить пароль
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Загрузка файла</h3>
        <form onSubmit={upload} className="grid" style={{ gap: 12 }}>
          <div className="field">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <input
              className="input"
              placeholder="Описание (необязательно)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Загрузить"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Мои файлы</h3>
        <div className="table">
          <table>
            <thead>
              <tr>
                {header("Имя", "original_name")}
                {header("Размер", "size")}
                {header("Дата", "uploaded_at")}
                {header("Описание", "description")}
                <th style={{ whiteSpace: "nowrap" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {getSorted(files).map((f) => (
                <tr key={f.id}>
                  <td style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {f.original_name}
                  </td>
                  <td>{formatBytes(f.size)}</td>
                  <td>{formatDate(f.uploaded_at || f.created_at)}</td>
                  <td>{f.description || "—"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => dl(f.id, f.original_name)}>
                      Скачать
                    </button>
                    <button className="btn" onClick={() => link(f.id)}>
                      Ссылка
                    </button>
                    <button className="btn" onClick={() => openEdit(f)} title="Редактировать описание">
                      ✎
                    </button>
                    <button className="btn danger" onClick={() => del(f.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {getSorted(files).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 18, color: "var(--muted)" }}>
                    Пока нет файлов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* модалка: редактирование описания */}
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

      {/* модалка: сброс пароля */}
      <Modal open={resetOpen} title="Сброс пароля" onClose={closeReset}>
        <form onSubmit={submitReset} className="grid" style={{ gap: 12 }}>
          <div className="field">
            <label className="label">Email для получения ссылки</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
              На этот адрес придёт письмо со ссылкой для смены пароля.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" type="submit" disabled={resetLoading}>
              {resetLoading ? <span className="spinner" /> : "Отправить письмо"}
            </button>
            <button className="btn" type="button" onClick={closeReset} disabled={resetLoading}>
              Отмена
            </button>
          </div>
        </form>
      </Modal>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
