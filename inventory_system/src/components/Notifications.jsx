import React, { useState, useEffect } from 'react';
import axiosInstance from "../api/axiosInstance";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axiosInstance.get('/notifications/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error('Ошибка при получении уведомлений', error);
        setNotifications([]); // Очищаем уведомления, если произошла ошибка
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axiosInstance.patch('notifications/mark_read/', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications([]); // Очищаем список уведомлений после пометки как прочитанных
    } catch (error) {
      console.error('Ошибка при пометке уведомлений как прочитанных', error);
    }
  };

  if (loading) return <p>Загрузка уведомлений...</p>;

  return (
    <div>
      <h2>Уведомления</h2>
      {notifications.length === 0 ? (
        <p>Нет новых уведомлений</p>
      ) : (
        <ul>
          {notifications.map((notification, index) => (
            <li key={index}>
              {notification.message} (время: {new Date(notification.created_at).toLocaleString()})
            </li>
          ))}
        </ul>
      )}
      <button onClick={markAsRead}>Пометить все как прочитанные</button>
    </div>
  );
};

export default Notifications;
