import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { meThunk } from "../store";
import { api } from "../api";

export default function Dashboard() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const user = useSelector((s) => s.auth.user);
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!token) return;
    dispatch(meThunk());
    loadFiles();
  }, [token]);

  const loadFiles = async () => {
    const { data } = await api(token).get("/files/");
    setFiles(data);
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

      // берем имя из заголовка fallback — original_name
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
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 12,
          }}
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
              <input
                className="file"
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
              />
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
                  <th>Имя</th>
                  <th>Размер</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id}>
                    <td>{f.original_name}</td>
                    <td>{f.size}</td>
                    <td>{new Date(f.uploaded_at).toLocaleString()}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => dl(f.id, f.original_name)}>
                        Скачать
                      </button>
                      <button className="btn" onClick={() => link(f.id)}>
                        Ссылка
                      </button>
                      <button className="btn danger" onClick={() => del(f.id)}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ color: "var(--muted)" }}>
                      Пока нет файлов
                    </td>
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
