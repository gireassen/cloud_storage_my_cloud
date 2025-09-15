import React, { useState } from "react";
import { api } from "../api";

export default function PasswordResetRequest() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api().post("/auth/password/reset-request/", { email });
      setMsg("Если email зарегистрирован, письмо отправлено");
    } catch {
      setMsg("Ошибка запроса. Попробуйте позже.");
    }
  };

  return (
    <div className="card" style={{maxWidth:520, margin:"40px auto"}}>
      <div className="card-header">Сброс пароля</div>
      <div className="card-body">
        <form onSubmit={submit} className="grid">
          <input className="input" type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <button className="btn" type="submit">Отправить ссылку</button>
        </form>
        {msg && <div style={{marginTop:12}}>{msg}</div>}
      </div>
    </div>
  );
}
