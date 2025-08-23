
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    try {
      await axios.post("/api/auth/register/", { username, email, password });
      setMsg("Регистрация успешна, переходим ко входу…");
      setTimeout(()=>navigate("/login"), 700);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{maxWidth:520}}>
      <div className="card-header">Регистрация</div>
      <div className="card-body">
        <form onSubmit={onSubmit}>
          <div className="grid cols-2">
            <div className="field">
              <label>Логин</label>
              <input className="input" placeholder="user" value={username} onChange={e=>setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
          </div>
          <div className="field mt-3">
            <label>Пароль</label>
            <input className="input" type="password" placeholder="минимум 8 символов" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <div className="mt-4" style={{display:"flex", gap:12, alignItems:"center"}}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Зарегистрироваться"}
            </button>
            <span className="muted">Уже есть аккаунт? <Link to="/login">Войти</Link></span>
          </div>
          {msg && <div className="toast" style={{marginTop:16}}>{msg}</div>}
        </form>
      </div>
    </section>
  );
}
