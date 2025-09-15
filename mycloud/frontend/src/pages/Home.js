import React from "react";
import { ADMIN_EMAIL as ADMIN_EMAIL_ENV } from "../config";

export default function Home() {
  const ADMIN_EMAIL = ADMIN_EMAIL_ENV || "admin@example.com";

  return (
    <div className="grid">
      <section className="card">
        <div className="card-header">О сервисе</div>
        <div className="card-body">
          <p>
            <b>MyCloud</b> — лёгкое облачное хранилище: загрузка, скачивание и
            обмен файлами через публичные ссылки.
          </p>
          <p>
            Начните с <a href="/register">регистрации</a>, затем войдите и
            загрузите первый файл.
          </p>
          <p>
            По вопросам и предложениям пишите{" "}
            <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a>
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Быстрый старт</div>
        <div className="card-body">
          <div className="steps">
            <a className="step" href="/register">
              <div className="step-num">1</div>
              <div className="step-main">
                <div className="step-title">Создайте аккаунт</div>
                <div className="step-text">
                  Пара минут — логин, email и пароль.
                </div>
              </div>
              <div className="step-cta">Регистрация →</div>
            </a>

            <a className="step" href="/login">
              <div className="step-num">2</div>
              <div className="step-main">
                <div className="step-title">Войдите в систему</div>
                <div className="step-text">Используйте свой логин и пароль.</div>
              </div>
              <div className="step-cta">Вход →</div>
            </a>

            <a className="step" href="/dashboard">
              <div className="step-num">3</div>
              <div className="step-main">
                <div className="step-title">Загрузите файл</div>
                <div className="step-text">
                  Добавьте описание и создайте публичную ссылку.
                </div>
              </div>
              <div className="step-cta">Личный кабинет →</div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
