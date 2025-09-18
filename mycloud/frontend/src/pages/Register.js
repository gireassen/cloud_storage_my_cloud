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

  function humanizeErrors(data) {
    if (!data) return "Ошибка регистрации";
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (Array.isArray(data)) return data.join("\n");
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      let text = Array.isArray(v) ? v.join(" ") : String(v);
      parts.push(`${k}: ${text}`);
    }
    return parts.join("\n") || "Ошибка регистрации";
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await axios.post("/api/auth/register/", {
        username,
        email,
        password,
        password2: password,
      });
      setMsg("Регистрация успешна, переходим ко входу…");
      setTimeout(() => navigate("/login"), 700);
    } catch (e) {
      setMsg(humanizeErrors(e?.response?.data) || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1>Регистрация</h1>

      <form onSubmit={onSubmit} className="grid" style={{ gap: 12 }}>
        <div className="field">
          <label className="label">Логин</label>
          <input
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
          />
        </div>

        <div className="field">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="field">
          <label className="label">Пароль</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="минимум 8 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Зарегистрироваться"}
        </button>
      </form>

      {msg && (
        <div className="panel" style={{ marginTop: 12, whiteSpace: "pre-line" }}>
          {msg}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </div>
    </div>
  );
}
