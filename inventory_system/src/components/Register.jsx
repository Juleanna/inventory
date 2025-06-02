import React, { useState } from "react";
import axiosInstance from "../api/axiosInstance"; // путь к твоему axiosInstance.js

const Register = ({ onRegisterSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/register/", {
        username,
        password,
      });
      onRegisterSuccess();
    } catch (err) {
      setError("Ошибка регистрации: " + err.response.data.message);
    }
  };

  return (
    <div>
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Зарегистрироваться</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
};

export default Register;
