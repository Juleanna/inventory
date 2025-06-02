import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance"; // путь к твоему axiosInstance.js
import * as XLSX from "xlsx";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // 👈 импорт по-умолчанию (если named импорт не срабатывает)
import addRobotoFont from '../fonts/Roboto-Regular'; // путь к JS-файлу
import ReactPaginate from "react-paginate";  // Импортируем библиотеку для пагинации
import AddEquipmentForm from "./AddEquipmentForm";
import EditEquipmentForm from "./EditEquipmentForm";

const EquipmentList = () => {
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    location: "",
    status: "",
  });
  const [currentPage, setCurrentPage] = useState(0);  // Состояние для текущей страницы
  const itemsPerPage = 3;  // Количество элементов на странице

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, equipment]);

  const fetchEquipment = async () => {
    try {
      const response = await axiosInstance.get("http://127.0.0.1:8000/api/equipment/");
      setEquipment(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const { search, category, location, status } = filters;
    const filtered = equipment.filter((item) => {
      return (
        item.name.toLowerCase().includes(search.toLowerCase()) &&
        (category ? item.category === category : true) &&
        (location ? item.location.toLowerCase().includes(location.toLowerCase()) : true) &&
        (status ? item.status.toLowerCase().includes(status.toLowerCase()) : true)
      );
    });
    setFilteredEquipment(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleEquipmentAdded = (newEquipment) => {
    setEquipment([newEquipment, ...equipment]);
  };

  const handleEquipmentUpdated = (updatedEquipment) => {
    setEquipment(
      equipment.map((item) =>
        item.id === updatedEquipment.id ? updatedEquipment : item
      )
    );
    setEditingItem(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Вы уверены, что хотите удалить эту запись?")) {
      try {
        await axiosInstance.delete(`http://127.0.0.1:8000/api/equipment/${id}/`);
        setEquipment(equipment.filter((item) => item.id !== id));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEquipment);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Оборудование");
    XLSX.writeFile(wb, "equipment_report.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    addRobotoFont(doc);        // подключаем шрифт
    doc.setFont('Roboto');     // выбираем его
    doc.text("Отчет по оборудованию", 20, 10);
  
    const tableData = filteredEquipment.map((item) => [
      item.name,
      item.category,
      item.serial_number,
      item.location,
      item.status,
    ]);
  
    autoTable(doc, {
      head: [["Название", "Категория", "Серийный номер", "Местоположение", "Состояние"]],
      body: tableData,
      startY: 20,
      styles: {
        font: "Roboto",         // 👈 обязательно указать
        fontStyle: "normal",    // 👈 обязательно указать
        fontSize: 10,
      },
    });
  
    doc.save("equipment_report.pdf");
  };

  const handlePageChange = ({ selected }) => {
    setCurrentPage(selected);
  };

  const paginatedData = filteredEquipment.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p>Ошибка: {error}</p>;

  return (
    <div>
      {editingItem ? (
        <EditEquipmentForm
          item={editingItem}
          onEquipmentUpdated={handleEquipmentUpdated}
        />
      ) : (
        <AddEquipmentForm onEquipmentAdded={handleEquipmentAdded} />
      )}
      <h1>Список оборудования</h1>

      <div>
        <h3>Фильтры</h3>
        <input
          type="text"
          name="search"
          placeholder="Поиск по названию"
          value={filters.search}
          onChange={handleFilterChange}
        />
        <select name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="">Все категории</option>
          <option value="PC">Компьютер</option>
          <option value="SRV">Сервер</option>
          <option value="PRN">Принтер</option>
          <option value="OTH">Другое</option>
        </select>
        <input
          type="text"
          name="location"
          placeholder="Местоположение"
          value={filters.location}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="status"
          placeholder="Состояние"
          value={filters.status}
          onChange={handleFilterChange}
        />
      </div>

      <button onClick={handleExport}>Экспорт в Excel</button>
      <button onClick={handleExportPDF}>Экспорт в PDF</button>

      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Категория</th>
            <th>Серийный номер</th>
            <th>Местоположение</th>
            <th>Состояние</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.serial_number}</td>
              <td>{item.location}</td>
              <td>{item.status}</td>
              <td>
                <button onClick={() => setEditingItem(item)}>Редактировать</button>
                <button onClick={() => handleDelete(item.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ReactPaginate
        previousLabel={"<"}
        nextLabel={">"}
        pageCount={Math.ceil(filteredEquipment.length / itemsPerPage)}
        onPageChange={handlePageChange}
        containerClassName={"pagination"}
        activeClassName={"active"}
      />
    </div>
  );
};

export default EquipmentList;
