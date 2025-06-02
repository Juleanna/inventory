import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import LoadScripts from "./LoadScripts";

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Сбрасываем сообщение об ошибке перед новым запросом
    try {
      const response = await axiosInstance.post("/login/", {
        username,
        password,
      });

      const { access, refresh } = response.data;

      // Сохраняем токены в localStorage
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // Уведомляем родительский компонент об успешном входе
      onLoginSuccess();

      // Перенаправление на главную страницу
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Ошибка авторизации. Проверьте данные."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="text-center">Вход в аккаунт</h2>
        <p className="text-center">Введите имя пользователя и пароль</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder="Введите имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? "Загрузка..." : "Войти"}
            </button>
          </div>
        </form>
        <div className="additional-links text-center">
          <p>
            Забыли пароль?{" "}
            <a href="/forgot-password" className="link">
              Восстановить
            </a>
          </p>
          <p>
            Нет аккаунта?{" "}
            <a href="/sign-up" className="link">
              Зарегистрироваться
            </a>
          </p>
        </div>
      </div>
      <LoadScripts />
    </div>
  );
};

export default Login;
