import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../api";

export default function Admin() {
  const token = useSelector(s=>s.auth.token);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);

  useEffect(()=>{
    if (token) {
      loadUsers();
      loadFiles();
    }
  }, [token]);

  const loadUsers = async () => {
    try {
      const { data } = await api(token).get("/admin/users/");
      setUsers(data);
    } catch(e) {
      alert("Недостаточно прав или требуется вход.");
    }
  };

  const loadFiles = async () => {
    try {
      const { data } = await api(token).get("/admin/files/");
      setFiles(data);
    } catch(e) {
      console.error(e);
    }
  };

  const dl = (id) => {
    window.location = `/api/files/${id}/download/`;
  };

  const del = async (id) => {
    if(!confirm("Удалить файл?")) return;
    await api(token).delete(`/files/${id}/`);
    await loadFiles();
  };

  return (
    <div className="grid">
      <section className="card">
        <div className="card-header">Пользователи</div>
        <div className="card-body">
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>ID</th><th>Логин</th><th>Email</th><th>Роль</th><th>Активен</th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.is_active ? "Да" : "Нет"}</td>
                  </tr>
                ))}
                {users.length===0 && <tr><td colSpan="5" style={{color:"var(--muted)"}}>Нет данных</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Файлы пользователей</div>
        <div className="card-body">
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>ID</th><th>Имя файла</th><th>Размер</th><th>Дата</th><th>Пользователь</th><th>Действия</th></tr></thead>
              <tbody>
                {files.map(f=>(
                  <tr key={f.id}>
                    <td>{f.id}</td>
                    <td>{f.original_name}</td>
                    <td>{f.size}</td>
                    <td>{new Date(f.uploaded_at).toLocaleString()}</td>
                    <td>{f.user?.username} (id:{f.user?.id})</td>
                    <td style={{display:"flex", gap:8}}>
                      <button className="btn" onClick={()=>dl(f.id)}>Скачать</button>
                      <button className="btn danger" onClick={()=>del(f.id)}>Удалить</button>
                    </td>
                  </tr>
                ))}
                {files.length===0 && <tr><td colSpan="6" style={{color:"var(--muted)"}}>Нет файлов</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
