import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { meThunk, logout, setToken } from "../store";

export default function Navbar(){
  const { pathname } = useLocation();
  const isActive = (p)=> pathname === p ? "active" : "";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector(s=>s.auth.token);
  const user = useSelector(s=>s.auth.user);

  // 1) Если в Redux токена нет, но он есть в localStorage — гидратируем
  useEffect(()=>{
    const lsToken = localStorage.getItem("token");
    if (!token && lsToken) {
      dispatch(setToken(lsToken));
    }
  }, [token]);

  // 2) Если токен есть, но пользователя ещё не загрузили — подтягиваем /me
  useEffect(()=>{
    if (token && !user) {
      dispatch(meThunk());
    }
  }, [token, user]);

  const onLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const isAdmin = Boolean(user && user.is_staff);
  const isAuth = Boolean(token);

  return (
    <div className="navbar">
      <div className="navbar-inner container">
        <div className="brand">
          <div className="brand-badge"></div>
          <span>MyCloud</span>
        </div>
        <nav className="nav-links">
          <Link className={isActive("/")} to="/">Главная</Link>
          {!isAuth && <Link className={isActive("/register")} to="/register">Регистрация</Link>}
          {!isAuth && <Link className={isActive("/login")} to="/login">Вход</Link>}
          <Link className={isActive("/dashboard")} to="/dashboard">Личный кабинет</Link>
          {isAdmin && <Link className={isActive("/admin")} to="/admin">Админ</Link>}
          {isAuth && <button className="btn ghost" onClick={onLogout}>Выйти</button>}
        </nav>
      </div>
    </div>
  );
}
