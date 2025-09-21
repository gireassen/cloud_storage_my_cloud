import React, { useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

// Индикатор требований (UI-подсказка), но НЕ блокирует отправку
const PWD = {
  upper: /[A-Z]/,
  digit: /\d/,
  special: /[^\w\s]/,
};
function checkPassword(pwd) {
  const s = String(pwd || "");
  return {
    okLen: s.length >= 6,
    okUp: PWD.upper.test(s),
    okDi: PWD.digit.test(s),
    okSp: PWD.special.test(s),
  };
}

function humanizeErrors(data) {
  try {
    if (!data) return "Ошибка регистрации";
    if (typeof data === "string") return data;
    if (data.detail) return String(data.detail);
    if (Array.isArray(data)) return data.join("\n");
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      const text = Array.isArray(v) ? v.join(" ") : String(v);
      const label =
        k === "username" ? "Логин" :
        k === "email" ? "Email" :
        k === "password" ? "Пароль" : k;
      parts.push(`${label}: ${text}`);
    }
    return parts.join("\n") || "Ошибка регистрации";
  } catch {
    try { return JSON.stringify(data); } catch { return "Ошибка регистрации"; }
  }
}

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg]           = useState("");
  const [loading, setLoading]   = useState(false);

  const pw = useMemo(() => checkPassword(password), [password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      await axios.post("/api/auth/register/", { username, email, password });
      setMsg("Регистрация успешна, переходим ко входу…");
      setTimeout(() => nav("/login"), 700);
    } catch (e) {
      const txt = humanizeErrors(e?.response?.data) || "Ошибка регистрации";
      setMsg(String(txt));
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
            placeholder="латиница и цифры, 4–20, первая — буква"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="минимум 6 символов, Aa1!"
            required
            minLength={6}
          />
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.35 }}>
            <li style={{ color: pw.okLen ? "var(--ok,#46d369)" : "var(--warn,#ff6b6b)" }}>≥ 6 символов</li>
            <li style={{ color: pw.okUp  ? "var(--ok,#46d369)" : "var(--warn,#ff6b6b)" }}>≥ 1 заглавная буква</li>
            <li style={{ color: pw.okDi  ? "var(--ok,#46d369)" : "var(--warn,#ff6b6b)" }}>≥ 1 цифра</li>
            <li style={{ color: pw.okSp  ? "var(--ok,#46d369)" : "var(--warn,#ff6b6b)" }}>≥ 1 спецсимвол</li>
          </ul>
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Зарегистрироваться"}
        </button>
      </form>

      {msg && (
        <div className="panel" style={{ marginTop: 12, whiteSpace: "pre-line" }}>
          {String(msg)}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </div>
    </div>
  );
}
