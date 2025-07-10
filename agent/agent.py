# agent/agent.py (покращена версія)
import os
import platform
import psutil
import requests
import asyncio
import logging
import json
from datetime import datetime, timedelta
from decouple import config
import socket
import uuid
import subprocess
from tenacity import retry, stop_after_attempt, wait_fixed
import aiohttp
import hashlib
import time
from pathlib import Path

# Налаштування логування
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_dir / "agent.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('agent')

# Конфігурація агента
API_URL = config("API_URL", default="http://127.0.0.1:8000/api/equipment/")
TOKEN_URL = config("TOKEN_URL", default="http://127.0.0.1:8000/api/token/")
REFRESH_URL = config("REFRESH_URL", default="http://127.0.0.1:8000/api/token/refresh/")
ANALYTICS_URL = config("ANALYTICS_URL", default="http://127.0.0.1:8000/api/analytics/")
USER = config("USER")
PASSWORD = config("PASSWORD")
COLLECTION_INTERVAL = config("COLLECTION_INTERVAL", default=3600, cast=int)  # секунди
COMPUTER_LOCATION = config("COMPUTER_LOCATION", default="Не вказано")

class TokenManager:
    """Управління токенами аутентифікації"""
    
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.token_file = Path("tokens.json")
        self.load_tokens()

    def set_tokens(self, access, refresh):
        self.access_token = access
        self.refresh_token = refresh
        self.save_tokens()

    def get_access_token(self):
        return self.access_token

    def get_refresh_token(self):
        return self.refresh_token

    def save_tokens(self):
        """Зберегти токени в файл"""
        try:
            with open(self.token_file, 'w') as f:
                json.dump({
                    'access_token': self.access_token,
                    'refresh_token': self.refresh_token,
                    'saved_at': datetime.now().isoformat()
                }, f)
            logger.debug("Токени збережено")
        except Exception as e:
            logger.error(f"Помилка збереження токенів: {e}")

    def load_tokens(self):
        """Завантажити токени з файлу"""
        try:
            if self.token_file.exists():
                with open(self.token_file, 'r') as f:
                    data = json.load(f)
                    self.access_token = data.get('access_token')
                    self.refresh_token = data.get('refresh_token')
                    logger.debug("Токени завантажено з файлу")
        except Exception as e:
            logger.error(f"Помилка завантаження токенів: {e}")

    def clear_tokens(self):
        """Очистити токени"""
        self.access_token = None
        self.refresh_token = None
        if self.token_file.exists():
            self.token_file.unlink()

token_manager = TokenManager()

class SystemCollector:
    """Клас для збору системної інформації"""
    
    @staticmethod
    def get_device_category():
        """Визначити тип пристрою"""
        try:
            if platform.system() == "Windows":
                result = subprocess.check_output([
                    "powershell", "-Command", 
                    "Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty PCSystemType"
                ], stderr=subprocess.DEVNULL, timeout=10)
                pc_system_type = int(result.decode().strip())
                
                category_map = {
                    1: "PC",
                    2: "LAPTOP", 
                    3: "WORK",
                    4: "SRV",
                    5: "LAPTOP",
                    6: "LAPTOP",
                    8: "TABLET"
                }
                return category_map.get(pc_system_type, "OTH")
            else:
                # Для Linux/macOS
                if "server" in platform.node().lower():
                    return "SRV"
                return "PC"
        except Exception as e:
            logger.error(f"Помилка визначення типу пристрою: {e}")
            return "OTH"

    @staticmethod
    def get_device_manufacturer():
        """Визначити виробника пристрою"""
        try:
            if platform.system() == "Windows":
                result = subprocess.check_output([
                    "powershell", "-Command",
                    "Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty Manufacturer"
                ], stderr=subprocess.DEVNULL, timeout=10)
                manufacturer = result.decode().strip()
                return manufacturer if manufacturer else "Невідомий виробник"
            else:
                return "Невідомий виробник"
        except Exception as e:
            logger.error(f"Помилка визначення виробника: {e}")
            return "Невідомий виробник"

    @staticmethod
    def get_device_model():
        """Отримати модель пристрою"""
        try:
            if platform.system() == "Windows":
                result = subprocess.check_output([
                    "powershell", "-Command",
                    "Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty Model"
                ], stderr=subprocess.DEVNULL, timeout=10)
                return result.decode().strip()
            else:
                return platform.processor()
        except Exception as e:
            logger.error(f"Помилка отримання моделі: {e}")
            return "Невідома модель"

    @staticmethod
    def get_serial_number():
        """Отримати серійний номер"""
        try:
            if platform.system() == "Windows":
                result = subprocess.check_output([
                    "powershell", "-Command", 
                    "Get-WmiObject Win32_BIOS | Select-Object -ExpandProperty SerialNumber"
                ], stderr=subprocess.DEVNULL, timeout=10)
                serial = result.decode().strip()
                return serial if serial and serial != "To Be Filled By O.E.M." else f"WIN-{uuid.uuid4().hex[:8].upper()}"
            else:
                # Для Linux/macOS спробувати різні методи
                try:
                    result = subprocess.check_output(["sudo", "dmidecode", "-s", "system-serial-number"], 
                                                   stderr=subprocess.DEVNULL, timeout=10)
                    return result.decode().strip()
                except:
                    return f"LINUX-{uuid.uuid4().hex[:8].upper()}"
        except Exception as e:
            logger.error(f"Помилка отримання серійного номера: {e}")
            return f"UNKNOWN-{uuid.uuid4().hex[:8].upper()}"

    @staticmethod
    def get_mac_address():
        """Отримати MAC-адресу"""
        try:
            mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) 
                           for elements in range(0, 2 * 6, 8)][::-1])
            return mac
        except Exception as e:
            logger.error(f"Помилка отримання MAC-адреси: {e}")
            return "00:00:00:00:00:00"

    @staticmethod
    def get_ip_address():
        """Отримати IP-адресу"""
        try:
            # Спробувати підключитися до Google DNS для отримання локальної IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception as e:
            logger.error(f"Помилка отримання IP-адреси: {e}")
            try:
                hostname = socket.gethostname()
                return socket.gethostbyname(hostname)
            except:
                return "127.0.0.1"

    @staticmethod
    def get_hostname():
        """Отримати ім'я хоста"""
        return platform.node()

    @staticmethod
    def get_network_speed():
        """Отримати швидкість передачі даних по мережі"""
        try:
            net_io = psutil.net_io_counters()
            return net_io.bytes_sent, net_io.bytes_recv
        except Exception as e:
            logger.error(f"Помилка отримання мережевих даних: {e}")
            return 0, 0

    @staticmethod
    def check_network_status():
        """Перевірка підключення до інтернету"""
        test_hosts = [
            'http://www.google.com',
            'http://www.microsoft.com', 
            'http://www.cloudflare.com'
        ]
        
        for host in test_hosts:
            try:
                response = requests.get(host, timeout=5)
                if response.status_code == 200:
                    return True
            except requests.RequestException:
                continue
        return False

    @staticmethod
    def get_system_metrics():
        """Отримання метрик системи"""
        try:
            return {
                "cpu_usage": psutil.cpu_percent(interval=1),
                "memory_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent if platform.system() != "Windows" else psutil.disk_usage('C:').percent,
                "cpu_count": psutil.cpu_count(),
                "memory_total": psutil.virtual_memory().total,
                "boot_time": psutil.boot_time()
            }
        except Exception as e:
            logger.error(f"Помилка отримання системних метрик: {e}")
            return {}

    @staticmethod
    def get_installed_software():
        """Отримати список встановленого ПЗ (Windows)"""
        software_list = []
        try:
            if platform.system() == "Windows":
                result = subprocess.check_output([
                    "powershell", "-Command",
                    "Get-WmiObject -Class Win32_Product | Select-Object Name, Version, Vendor | ConvertTo-Json"
                ], stderr=subprocess.DEVNULL, timeout=30)
                
                software_data = json.loads(result.decode())
                if isinstance(software_data, list):
                    software_list = software_data[:50]  # Обмежити до 50 програм
                elif isinstance(software_data, dict):
                    software_list = [software_data]
        except Exception as e:
            logger.warning(f"Не вдалося отримати список ПЗ: {e}")
        
        return software_list

    @staticmethod
    def get_hardware_details():
        """Детальна інформація про залізо"""
        try:
            details = {
                "cpu": platform.processor(),
                "cpu_cores": psutil.cpu_count(logical=False),
                "cpu_threads": psutil.cpu_count(logical=True),
                "memory_total": psutil.virtual_memory().total,
                "disk_info": []
            }
            
            # Інформація про диски
            for partition in psutil.disk_partitions():
                try:
                    partition_usage = psutil.disk_usage(partition.mountpoint)
                    details["disk_info"].append({
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": partition_usage.total,
                        "used": partition_usage.used,
                        "free": partition_usage.free
                    })
                except PermissionError:
                    continue
            
            # Додаткова інформація для Windows
            if platform.system() == "Windows":
                try:
                    # RAM
                    ram_result = subprocess.check_output([
                        "powershell", "-Command",
                        "Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum | Select-Object -ExpandProperty Sum"
                    ], stderr=subprocess.DEVNULL, timeout=10)
                    details["memory_physical"] = int(ram_result.decode().strip())
                    
                    # GPU
                    gpu_result = subprocess.check_output([
                        "powershell", "-Command",
                        "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name"
                    ], stderr=subprocess.DEVNULL, timeout=10)
                    details["gpu"] = gpu_result.decode().strip()
                    
                except Exception as e:
                    logger.warning(f"Не вдалося отримати додаткову інформацію про залізо: {e}")
            
            return details
        except Exception as e:
            logger.error(f"Помилка отримання деталей заліза: {e}")
            return {}

class InventoryAgent:
    """Основний клас агента інвентаризації"""
    
    def __init__(self):
        self.collector = SystemCollector()
        self.last_data_hash = None
        self.data_cache_file = Path("last_data.json")
        
    def generate_unique_serial(self, base_serial):
        """Генерувати унікальний серійний номер"""
        machine_id = f"{platform.node()}-{uuid.getnode()}"
        unique_hash = hashlib.md5(machine_id.encode()).hexdigest()[:8]
        return f"{base_serial}-{unique_hash.upper()}"

    def collect_data(self):
        """Збір інформації про систему"""
        try:
            bytes_sent, bytes_recv = self.collector.get_network_speed()
            is_online = self.collector.check_network_status()
            system_metrics = self.collector.get_system_metrics()
            hardware_details = self.collector.get_hardware_details()
            
            serial_number = self.collector.get_serial_number()
            
            data = {
                # Основна інформація
                "name": self.collector.get_hostname(),
                "category": self.collector.get_device_category(),
                "model": self.collector.get_device_model(),
                "manufacturer": self.collector.get_device_manufacturer(),
                "serial_number": serial_number,
                "inventory_number": self.generate_unique_serial(serial_number),
                
                # Мережева інформація
                "mac_address": self.collector.get_mac_address(),
                "ip_address": self.collector.get_ip_address(),
                "hostname": self.collector.get_hostname(),
                
                # Розташування та статус
                "location": COMPUTER_LOCATION,
                "status": "WORKING",
                
                # Технічні характеристики
                "cpu": hardware_details.get("cpu", platform.processor()),
                "ram": f"{hardware_details.get('memory_total', 0) // (1024**3)} GB",
                "operating_system": f"{platform.system()} {platform.release()}",
                
                # Мережеві метрики
                "network_in": bytes_recv,
                "network_out": bytes_sent,
                "is_online": is_online,
                
                # Системні метрики
                "system_metrics": system_metrics,
                "hardware_details": hardware_details,
                
                # Дати
                "purchase_date": datetime.now().strftime("%Y-%m-%d"),
                "last_seen": datetime.now().isoformat(),
                
                # Додаткова інформація
                "agent_version": "2.0",
                "collection_time": datetime.now().isoformat(),
            }
            
            # Додати інформацію про ПЗ (якщо доступно)
            software_list = self.collector.get_installed_software()
            if software_list:
                data["installed_software"] = software_list
            
            logger.info(f"Зібрано дані для {data['name']} ({data['serial_number']})")
            return data
            
        except Exception as e:
            logger.error(f"Помилка збору даних: {e}")
            raise

    def has_data_changed(self, data):
        """Перевірити чи змінились дані з останнього разу"""
        # Виключаємо змінні поля для порівняння
        stable_data = {k: v for k, v in data.items() 
                      if k not in ['last_seen', 'collection_time', 'system_metrics', 'network_in', 'network_out']}
        
        current_hash = hashlib.md5(json.dumps(stable_data, sort_keys=True).encode()).hexdigest()
        
        if current_hash != self.last_data_hash:
            self.last_data_hash = current_hash
            return True
        return False

    def save_data_cache(self, data):
        """Зберегти кеш даних"""
        try:
            with open(self.data_cache_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Помилка збереження кешу: {e}")

    async def authenticate(self, session):
        """Отримання токенів аутентифікації"""
        try:
            async with session.post(TOKEN_URL, json={"username": USER, "password": PASSWORD}) as response:
                if response.status == 200:
                    tokens = await response.json()
                    token_manager.set_tokens(tokens.get("access"), tokens.get("refresh"))
                    logger.info("Успішна аутентифікація")
                else:
                    error_text = await response.text()
                    raise Exception(f"Помилка аутентифікації: {response.status} - {error_text}")
        except Exception as e:
            logger.error(f"Помилка аутентифікації: {e}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    async def refresh_access_token(self, session):
        """Оновлення access токена"""
        try:
            refresh_token = token_manager.get_refresh_token()
            if not refresh_token:
                raise Exception("Немає refresh токена")
                
            async with session.post(REFRESH_URL, json={"refresh": refresh_token}) as response:
                if response.status == 200:
                    new_tokens = await response.json()
                    token_manager.set_tokens(new_tokens.get("access"), refresh_token)
                    logger.info("Токен успішно оновлено")
                else:
                    error_text = await response.text()
                    raise Exception(f"Помилка оновлення токена: {response.status} - {error_text}")
        except Exception as e:
            logger.error(f"Помилка оновлення токена: {e}")
            # Якщо не вдалося оновити токен, очищуємо його і потребуємо нової аутентифікації
            token_manager.clear_tokens()
            raise

    async def send_data_to_server(self, session, data):
        """Відправка даних на сервер"""
        headers = {"Authorization": f"Bearer {token_manager.get_access_token()}"}
        
        try:
            async with session.post(API_URL, json=data, headers=headers) as response:
                if response.status == 401:  # Токен закінчився
                    logger.warning("Токен закінчився, оновлюємо...")
                    await self.refresh_access_token(session)
                    headers["Authorization"] = f"Bearer {token_manager.get_access_token()}"
                    
                    # Повторна спроба з новим токеном
                    async with session.post(API_URL, json=data, headers=headers) as retry_response:
                        await self._handle_response(retry_response, data)
                else:
                    await self._handle_response(response, data)
                    
        except Exception as e:
            logger.error(f"Помилка відправки даних: {e}")
            raise

    async def _handle_response(self, response, data):
        """Обробка відповіді сервера"""
        if response.status in [200, 201]:
            logger.info(f"Дані успішно відправлено: {data['name']} ({data['serial_number']})")
        else:
            error_text = await response.text()
            logger.error(f"Помилка відправки даних: {response.status} - {error_text}")
            
            # Спробувати зберегти дані локально для повторної відправки
            self.save_failed_data(data)

    def save_failed_data(self, data):
        """Зберегти дані що не вдалося відправити"""
        failed_data_file = Path("failed_data.json")
        try:
            failed_data = []
            if failed_data_file.exists():
                with open(failed_data_file, 'r') as f:
                    failed_data = json.load(f)
            
            failed_data.append({
                'data': data,
                'timestamp': datetime.now().isoformat(),
                'retry_count': 0
            })
            
            # Зберігати тільки останні 10 записів
            failed_data = failed_data[-10:]
            
            with open(failed_data_file, 'w') as f:
                json.dump(failed_data, f, indent=2, default=str)
                
            logger.info("Дані збережено для повторної відправки")
        except Exception as e:
            logger.error(f"Помилка збереження невідправлених даних: {e}")

    async def task(self, session):
        """Основна задача агента"""
        try:
            data = self.collect_data()
            
            # Перевірити чи змінились дані
            if self.has_data_changed(data):
                logger.info("Дані змінились, відправляємо на сервер")
                await self.send_data_to_server(session, data)
                self.save_data_cache(data)
            else:
                logger.info("Дані не змінились, пропускаємо відправку")
                
        except Exception as e:
            logger.error(f"Помилка виконання задачі: {e}")

    async def schedule_task(self, session):
        """Планування задач"""
        while True:
            try:
                await asyncio.sleep(COLLECTION_INTERVAL)
                await self.task(session)
            except Exception as e:
                logger.error(f"Помилка в циклі планування: {e}")
                await asyncio.sleep(60)  # Зачекати хвилину перед повторною спробою

    async def run(self):
        """Головна функція для запуску агента"""
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                # Спробувати використати збережені токени
                if not token_manager.get_access_token():
                    await self.authenticate(session)
                
                logger.info("Запуск негайної інвентаризації...")
                await self.task(session)
                
                logger.info(f"Агент запущено. Інтервал збору: {COLLECTION_INTERVAL} секунд")
                await self.schedule_task(session)
                
            except KeyboardInterrupt:
                logger.info("Агент зупинено користувачем")
            except Exception as e:
                logger.error(f"Критична помилка агента: {e}")

def main():
    """Головна функція"""
    try:
        agent = InventoryAgent()
        asyncio.run(agent.run())
    except KeyboardInterrupt:
        logger.info("Програма зупинена користувачем")
    except Exception as e:
        logger.error(f"Критична помилка: {e}")

if __name__ == "__main__":
    main()