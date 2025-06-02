import React, { useState } from "react";
import axiosInstance from "../api/axiosInstance"; // путь к твоему axiosInstance.js

const EditEquipmentForm = ({ item, onEquipmentUpdated }) => {
  const [formData, setFormData] = useState({
    name: item.name,
    category: item.category,
    serial_number: item.serial_number,
    purchase_date: item.purchase_date,
    location: item.location,
    status: item.status,
  });

  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.put(
        `http://127.0.0.1:8000/api/equipment/${item.id}/`,
        formData
      );
      onEquipmentUpdated(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Редактировать оборудование</h2>
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
      <div>
        <label>Название:</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Категория:</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
        >
          <option value="PC">Компьютер</option>
          <option value="SRV">Сервер</option>
          <option value="PRN">Принтер</option>
          <option value="OTH">Другое</option>
        </select>
      </div>
      <div>
        <label>Серийный номер:</label>
        <input
          type="text"
          name="serial_number"
          value={formData.serial_number}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Дата покупки:</label>
        <input
          type="date"
          name="purchase_date"
          value={formData.purchase_date}
          onChange={handleChange}
        />
      </div>
      <div>
        <label>Местоположение:</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
        />
      </div>
      <div>
        <label>Состояние:</label>
        <input
          type="text"
          name="status"
          value={formData.status}
          onChange={handleChange}
        />
      </div>
      <button type="submit">Сохранить</button>
    </form>
  );
};

export default EditEquipmentForm;
