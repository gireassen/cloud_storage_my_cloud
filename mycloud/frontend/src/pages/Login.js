
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginThunk, meThunk } from "../store";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);

  useEffect(() => {
    if (token) {
      dispatch(meThunk()).then(() => navigate("/dashboard"));
    }
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try{
      await dispatch(loginThunk({ username, password })).unwrap();
    }catch(e){
      setError("Неверные данные для входа");
    }finally{
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{maxWidth:460}}>
      <div className="card-header">Вход</div>
      <div className="card-body">
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Логин</label>
            <input className="input" placeholder="user" value={username} onChange={e=>setUsername(e.target.value)} />
          </div>
          <div className="field mt-3">
            <label>Пароль</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <div className="mt-4" style={{display:"flex", gap:12, alignItems:"center"}}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Войти"}
            </button>
            <span className="muted">Нет аккаунта? <Link to="/register">Регистрация</Link></span>
          </div>
          {error && <div className="toast" style={{marginTop:16}}>{error}</div>}
        </form>
      </div>
    </section>
  );
}
