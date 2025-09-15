import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function PasswordResetConfirm() {
  const params = new URLSearchParams(window.location.search);
  const [uid, setUid] = useState(params.get("uid") || "");
  const [token, setToken] = useState(params.get("token") || "");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(()=> {
    setUid(params.get("uid") || "");
    setToken(params.get("token") || "");
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api().post("/auth/password/reset-confirm/", { uid, token, new_password: pwd });
      setMsg("Пароль обновлён. Теперь можно войти.");
    } catch (e) {
      setMsg("Неверная или истёкшая ссылка.");
    }
  };

  return (
    <div className="card" style={{maxWidth:520, margin:"40px auto"}}>
      <div className="card-header">Новый пароль</div>
      <div className="card-body">
        <form onSubmit={submit} className="grid">
          <input className="input" placeholder="UID" value={uid} onChange={e=>setUid(e.target.value)} />
          <input className="input" placeholder="Token" value={token} onChange={e=>setToken(e.target.value)} />
          <input className="input" type="password" placeholder="Новый пароль" value={pwd} onChange={e=>setPwd(e.target.value)} />
          <button className="btn" type="submit">Сменить пароль</button>
        </form>
        {msg && <div style={{marginTop:12}}>{msg}</div>}
      </div>
    </div>
  );
}
