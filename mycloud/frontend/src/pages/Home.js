
import React from "react";
import { Link } from "react-router-dom";

export default function Home(){
  return (
    <div className="grid cols-2">
      <section className="card">
        <div className="card-header">О сервисе</div>
        <div className="card-body">
          <p>MyCloud — лёгкое облачное хранилище: загрузка, скачивание и обмен файлами через публичные ссылки.</p>
          <p className="mt-3">Начните с <Link to="/register">регистрации</Link>, затем войдите и загрузите первый файл.</p>
        </div>
      </section>
      <section className="card">
        <div className="card-header">Быстрый старт</div>
        <div className="card-body">
          <div className="grid">
            <div>
              <div className="kbd">1</div>
              <div className="mt-2">Создайте аккаунт: <Link to="/register">Регистрация</Link></div>
            </div>
            <div>
              <div className="kbd">2</div>
              <div className="mt-2">Войдите: <Link to="/login">Вход</Link></div>
            </div>
            <div>
              <div className="kbd">3</div>
              <div className="mt-2">Загрузите файл: <Link to="/dashboard">Личный кабинет</Link></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
