import os
import platform
import psutil
import requests
import asyncio
import logging
from datetime import datetime
from decouple import config
import socket
import uuid
import subprocess
from tenacity import retry, stop_after_attempt, wait_fixed
import aiohttp

# Настройка логирования
logging.basicConfig(filename="agent_log.log", level=logging.DEBUG,
                    format="%(asctime)s - %(levelname)s - %(message)s")

# Конфигурация агента
API_URL = "http://127.0.0.1:8000/api/equipment/"
TOKEN_URL = "http://127.0.0.1:8000/api/token/"
REFRESH_URL = "http://127.0.0.1:8000/api/token/refresh/"
USER = config("USER")
PASSWORD = config("PASSWORD")

# Хранилище токенов
class TokenManager:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None

    def set_tokens(self, access, refresh):
        self.access_token = access
        self.refresh_token = refresh

    def get_access_token(self):
        return self.access_token

    def get_refresh_token(self):
        return self.refresh_token

token_manager = TokenManager()

async def authenticate(session):
    """Получение начальных токенов (access и refresh)."""
    try:
        async with session.post(TOKEN_URL, json={"username": USER, "password": PASSWORD}) as response:
            if response.status == 200:
                tokens = await response.json()
                token_manager.set_tokens(tokens.get("access"), tokens.get("refresh"))
                logging.info(f"Успешная аутентификация. Токен: {token_manager.get_access_token()}")
            else:
                raise Exception(f"Ошибка аутентификации: {response.status} - {await response.text()}")
    except Exception as e:
        logging.error(f"Ошибка аутентификации: {e}")
        raise

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def refresh_access_token(session):
    """Обновление access токена с повторной попыткой."""
    try:
        async with session.post(REFRESH_URL, json={"refresh": token_manager.get_refresh_token()}) as response:
            if response.status == 200:
                token_manager.set_tokens((await response.json()).get("access"), token_manager.get_refresh_token())
                logging.info(f"Токен обновлен: {token_manager.get_access_token()}")
            else:
                raise Exception(f"Ошибка обновления токена: {response.status} - {await response.text()}")
    except Exception as e:
        logging.error(f"Ошибка обновления токена: {e}")
        raise

def get_device_category():
    """Определить тип устройства (например, ПК, ноутбук)."""
    try:
        result = subprocess.check_output(["powershell", 
            "-Command", "Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty PCSystemType"], 
            stderr=subprocess.DEVNULL)
        pc_system_type = int(result.decode().strip())
        
        category_map = {
            1: "PC",
            2: "LAPTOP",
            3: "WORK",
            4: "SRV",
        }
        return category_map.get(pc_system_type, "Неизвестное устройство")
    except Exception as e:
        logging.error(f"Ошибка определения типа устройства: {e}")
        return "Неизвестное устройство"

def get_device_manufacturer():
    """Определить производителя устройства (например, Lenovo, Acer)."""
    try:
        result = subprocess.check_output(["powershell", 
            "-Command", "Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty Manufacturer"], 
            stderr=subprocess.DEVNULL)
        manufacturer = result.decode().strip()
        return manufacturer if manufacturer else "Неизвестный производитель"
    except Exception as e:
        logging.error(f"Ошибка определения производителя устройства: {e}")
        return "Неизвестный производитель"

def get_serial_number():
    """Получить серийный номер на Windows через PowerShell."""
    try:
        result = subprocess.check_output(["powershell", "-Command", 
            "Get-WmiObject Win32_BIOS | Select-Object -ExpandProperty SerialNumber"], 
            stderr=subprocess.DEVNULL)
        serial = result.decode().strip()
        return serial if serial else "Unknown"
    except Exception as e:
        logging.error(f"Ошибка получения серийного номера через PowerShell: {e}")
        return "Unknown"

def get_mac_address():
    """Получить MAC-адрес компьютера."""
    try:
        mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) for elements in range(0, 2 * 6, 8)][::-1])
        return mac
    except Exception as e:
        logging.error(f"Ошибка получения MAC-адреса: {e}")
        return "Unknown"

def get_ip_address():
    """Получить IP-адрес компьютера."""
    try:
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        return ip_address
    except Exception as e:
        logging.error(f"Ошибка получения IP-адреса: {e}")
        return "Unknown"

def get_network_speed():
    """Получить скорость передачи данных по сети (in/out)."""
    try:
        net_io = psutil.net_io_counters()
        return net_io.bytes_sent, net_io.bytes_recv
    except Exception as e:
        logging.error(f"Ошибка получения данных о сети: {e}")
        return 0, 0

def check_network_status():
    """Проверка подключения к интернету."""
    try:
        for host in ['http://www.google.com', 'http://www.yandex.ru']:
            response = requests.get(host, timeout=5)
            if response.status_code == 200:
                return True
        return False
    except requests.RequestException:
        return False

async def get_system_metrics():
    """Получение метрик системы."""
    return {
        "cpu_usage": psutil.cpu_percent(interval=1),
        "memory_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
    }

def collect_data():
    """Сбор информации о системе с использованием psutil."""
    bytes_sent, bytes_recv = get_network_speed()
    is_online = check_network_status()

    data = {
        "name": platform.node(),
        "category": get_device_category(),
        "model": platform.processor(),
        "manufacturer": get_device_manufacturer(),
        "serial_number": get_serial_number(),
        "unique_serial_number": f"{get_serial_number()}-{uuid.uuid4()}",
        "mac_address": get_mac_address(),
        "ip_address": get_ip_address(),
        "network_in": bytes_recv,
        "network_out": bytes_sent,
        "is_online": is_online,
        "location": os.getenv("COMPUTER_LOCATION", "Unknown"),
        "status": "WORKING",
        "purchase_date": datetime.now().strftime("%Y-%m-%d"),
    }
    logging.info(f"Собранные данные: {data}")
    return data

async def send_data_to_server(session, data):
    """Отправка данных на сервер."""
    headers = {"Authorization": f"Bearer {token_manager.get_access_token()}"}
    try:
        async with session.post(API_URL, json=data, headers=headers) as response:
            if response.status == 401:  # Если токен истек
                logging.warning("Токен истек, обновляем...")
                await refresh_access_token(session)
                headers["Authorization"] = f"Bearer {token_manager.get_access_token()}"
                async with session.post(API_URL, json=data, headers=headers) as response:
                    if response.status == 201:
                        logging.info(f"Данные успешно отправлены: {data}")
                    else:
                        logging.error(f"Ошибка отправки данных: {response.status} - {await response.text()}")
            elif response.status == 201:
                logging.info(f"Данные успешно отправлены: {data}")
            else:
                logging.error(f"Ошибка отправки данных: {response.status} - {await response.text()}")
    except Exception as e:
        logging.error(f"Ошибка отправки данных: {e}")

async def task(session):
    """Основная задача агента."""
    try:
        data = collect_data()
        await send_data_to_server(session, data)
    except Exception as e:
        logging.error(f"Ошибка выполнения задачи: {e}")

async def schedule_task(session):
    """Настройка задачи для асинхронного выполнения."""
    while True:
        await asyncio.sleep(3600)  # 1 час
        await task(session)

async def main():
    """Главная функция для запуска агента."""
    async with aiohttp.ClientSession() as session:
        try:
            await authenticate(session)
            logging.info("Запуск немедленной инвентаризации...")
            await task(session)
            logging.info("Агент запущен. Ожидаем следующей задачи...")
            await schedule_task(session)
        except Exception as e:
            logging.error(f"Ошибка при запуске агента: {e}")

if __name__ == "__main__":
    asyncio.run(main())
