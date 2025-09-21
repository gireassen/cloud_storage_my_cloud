import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import store from "./store";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminUserFiles from "./pages/AdminUserFiles"; 
import Layout from "./components/Layout";
import "./styles.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Home/></Layout>} />
        <Route path="/login" element={<Layout title="Вход"><Login/></Layout>} />
        <Route path="/register" element={<Layout title="Регистрация"><Register/></Layout>} />
        <Route path="/dashboard" element={<Layout title="Личный кабинет"><Dashboard/></Layout>} />
        <Route path="/admin" element={<Layout title="Админ-панель"><Admin/></Layout>} />
        <Route path="/admin/users/:id" element={<Layout title="Хранилище пользователя"><AdminUserFiles/></Layout>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
