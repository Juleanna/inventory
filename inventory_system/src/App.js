import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import EquipmentList from "./components/EquipmentList";
import Login from "./components/Login";
import PrivateRoute from "./components/PrivateRoute";
import Notifications from "./components/Notifications";
import SoftwareList from "./components/SoftwareList";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token); // Проверяем наличие токена
  }, []);

  return (
    <Router>
      <Routes>
        {/* Маршрут для логина */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        
        {/* Маршруты для авторизованных пользователей */}
        <Route
          path="/"
          element={<PrivateRoute isLoggedIn={isLoggedIn} />}
        >
          <Route index element={<Notifications />} />
          <Route path="equipment" element={<EquipmentList />} />
          <Route path="software" element={<SoftwareList />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
