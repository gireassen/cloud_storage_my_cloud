import React, { useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const PWD_RE = {
  upper: /[A-Z]/,
  digit: /\d/,
  special: /[^\w\s]/,
};
function checkPasswordPolicy(pwd) {
  const okLen = (pwd || "").length >= 6;
  const okUp = PWD_RE.upper.test(pwd || "");
  const okDi = PWD_RE.digit.test(pwd || "");
  const okSp = PWD_RE.special.test(pwd || "");
  return { okLen, okUp, okDi, okSp, ok: okLen && okUp && okDi && okSp };
}

function humanizeErrors(data) {
  if (!data) return "Ошибка регистрации";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  const parts = [];
  for (const [k, v] of Object.entries(data)) {
    const text = Array.isArray(v) ? v.join(" ") : String(v);
    const label =
      k === "username"
        ? "Логин"
        : k === "email"
        ? "Email"
        : k === "password"
        ? "Пароль"
        : k;
    parts.push(`${label}: ${text}`);
  }
  return parts.join("\n") || "Ошибка регистрации";
}

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const pw = useMemo(() => checkPasswordPolicy(password), [password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!pw.ok) {
      setMsg(
        [
          !pw.okLen && "Пароль должен быть не короче 6 символов.",
          !pw.okUp && "Нужна хотя бы одна ЗАГЛАВНАЯ буква.",
          !pw.okDi && "Нужна хотя бы одна цифра.",
          !pw.okSp && "Нужен хотя бы один спецсимвол.",
        ]
          .filter(Boolean)
          .join("\n")
      );
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/auth/register/", { username, email, password });

      setMsg("Регистрация успешна, переходим ко входу…");
      setTimeout(() => navigate("/login"), 700);
    } catch (e) {
      setMsg(humanizeErrors(e?.response?.data));
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="минимум 6 символов, Aa1!"
            required
            minLength={6}
          />
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.4 }}>
            <li style={{ color: pw.okLen ? "var(--ok, #46d369)" : "var(--warn, #ff6b6b)" }}>
              ≥ 6 символов
            </li>
            <li style={{ color: pw.okUp ? "var(--ok, #46d369)" : "var(--warn, #ff6b6b)" }}>
              ≥ 1 заглавная буква (A…Z)
            </li>
            <li style={{ color: pw.okDi ? "var(--ok, #46d369)" : "var(--warn, #ff6b6b)" }}>
              ≥ 1 цифра (0…9)
            </li>
            <li style={{ color: pw.okSp ? "var(--ok, #46d369)" : "var(--warn, #ff6b6b)" }}>
              ≥ 1 спецсимвол (например, !@#$%)
            </li>
          </ul>
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
