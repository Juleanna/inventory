import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

const SoftwareList = () => {
  const [software, setSoftware] = useState([]);

  useEffect(() => {
    axiosInstance
      .get("http://localhost:8000/api/software/") // URL вашего API
      .then((response) => {
        setSoftware(response.data);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке данных ПО:", error);
      });
  }, []);

  return (
    <div>
      <h1>Список программного обеспечения</h1>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">Название</th>
            <th className="border border-gray-300 px-4 py-2">Версия</th>
            <th className="border border-gray-300 px-4 py-2">Производитель</th>
            <th className="border border-gray-300 px-4 py-2">Лицензия</th>
            <th className="border border-gray-300 px-4 py-2">Установлено на</th>
          </tr>
        </thead>
        <tbody>
          {software.map((item) => (
            <tr key={item.id}>
              <td className="border border-gray-300 px-4 py-2">{item.name}</td>
              <td className="border border-gray-300 px-4 py-2">{item.version}</td>
              <td className="border border-gray-300 px-4 py-2">{item.vendor}</td>
              <td className="border border-gray-300 px-4 py-2">
                {item.license ? `${item.license.name} (${item.license.key})` : "Без лицензии"}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.installed_on.length > 0
                  ? item.installed_on.map((equipment) => equipment.name).join(", ")
                  : "Не установлено"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SoftwareList;
