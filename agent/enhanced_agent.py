# enhanced_agent.py - Покращений агент збору даних
import os
import platform
import psutil
import requests
import asyncio
import logging
import json
import wmi  # тільки для Windows
import GPUtil  # для GPU інформації
import cpuinfo  # детальна інформація про процесор
from datetime import datetime, timedelta
from decouple import config
import socket
import uuid
import subprocess
from tenacity import retry, stop_after_attempt, wait_fixed
import aiohttp
import hashlib
import time
import winreg  # для Windows registry
from pathlib import Path
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Налаштування логування
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_dir / "enhanced_agent.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('enhanced_agent')

# Конфігурація агента
API_URL = config("API_URL", default="http://127.0.0.1:8000/api/equipment/")
TOKEN_URL = config("TOKEN_URL", default="http://127.0.0.1:8000/api/token/")
REFRESH_URL = config("REFRESH_URL", default="http://127.0.0.1:8000/api/token/refresh/")
USER = config("USER")
PASSWORD = config("PASSWORD")
COLLECTION_INTERVAL = config("COLLECTION_INTERVAL", default=3600, cast=int)
COMPUTER_LOCATION = config("COMPUTER_LOCATION", default="Не вказано")

class EnhancedSystemCollector:
    """Покращений клас для збору системної інформації"""
    
    def __init__(self):
        self.windows_wmi = None
        if platform.system() == "Windows":
            try:
                self.windows_wmi = wmi.WMI()
            except Exception as e:
                logger.warning(f"WMI недоступно: {e}")

    def get_detailed_cpu_info(self):
        """Детальна інформація про процесор"""
        try:
            cpu_info = cpuinfo.get_cpu_info()
            
            detailed_cpu = {
                "name": cpu_info.get('brand_raw', platform.processor()),
                "brand": cpu_info.get('brand', 'Unknown'),
                "vendor": cpu_info.get('vendor_id_raw', 'Unknown'),
                "family": cpu_info.get('family', 0),
                "model": cpu_info.get('model', 0),
                "stepping": cpu_info.get('stepping', 0),
                "microarchitecture": cpu_info.get('arch', 'Unknown'),
                "cores_physical": psutil.cpu_count(logical=False),
                "cores_logical": psutil.cpu_count(logical=True),
                "l2_cache": cpu_info.get('l2_cache_size', 'Unknown'),
                "l3_cache": cpu_info.get('l3_cache_size', 'Unknown'),
                "current_freq": psutil.cpu_freq().current if psutil.cpu_freq() else None,
                "max_freq": psutil.cpu_freq().max if psutil.cpu_freq() else None,
            }
            
            # Додаткова інформація для Windows
            if self.windows_wmi:
                try:
                    for processor in self.windows_wmi.Win32_Processor():
                        detailed_cpu.update({
                            "socket_designation": processor.SocketDesignation,
                            "voltage": processor.CurrentVoltage,
                            "external_clock": processor.ExtClock,
                            "manufacturer": processor.Manufacturer
                        })
                        break
                except Exception as e:
                    logger.debug(f"Помилка отримання WMI даних процесора: {e}")
            
            return detailed_cpu
            
        except Exception as e:
            logger.error(f"Помилка отримання CPU інформації: {e}")
            return {"name": platform.processor()}

    def get_detailed_memory_info(self):
        """Детальна інформація про пам'ять"""
        try:
            memory_info = {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "used": psutil.virtual_memory().used,
                "percentage": psutil.virtual_memory().percent,
                "swap_total": psutil.swap_memory().total,
                "swap_used": psutil.swap_memory().used,
                "modules": []
            }
            
            # Додаткова інформація для Windows
            if self.windows_wmi:
                try:
                    for memory in self.windows_wmi.Win32_PhysicalMemory():
                        module_info = {
                            "capacity": int(memory.Capacity) if memory.Capacity else 0,
                            "speed": memory.Speed,
                            "manufacturer": memory.Manufacturer,
                            "part_number": memory.PartNumber,
                            "serial_number": memory.SerialNumber,
                            "memory_type": memory.MemoryType,
                            "form_factor": memory.FormFactor,
                            "locator": memory.DeviceLocator
                        }
                        memory_info["modules"].append(module_info)
                except Exception as e:
                    logger.debug(f"Помилка отримання WMI даних пам'яті: {e}")
            
            return memory_info
            
        except Exception as e:
            logger.error(f"Помилка отримання інформації про пам'ять: {e}")
            return {"total": psutil.virtual_memory().total}

    def get_detailed_disk_info(self):
        """Детальна інформація про диски"""
        try:
            disks_info = []
            
            # Базова інформація про розділи
            for partition in psutil.disk_partitions():
                try:
                    partition_usage = psutil.disk_usage(partition.mountpoint)
                    disk_info = {
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": partition_usage.total,
                        "used": partition_usage.used,
                        "free": partition_usage.free,
                        "percentage": (partition_usage.used / partition_usage.total * 100) if partition_usage.total > 0 else 0
                    }
                    disks_info.append(disk_info)
                except PermissionError:
                    continue
            
            # Додаткова інформація для Windows
            if self.windows_wmi:
                try:
                    physical_disks = {}
                    for disk in self.windows_wmi.Win32_DiskDrive():
                        physical_disks[disk.DeviceID] = {
                            "model": disk.Model,
                            "manufacturer": disk.Manufacturer,
                            "serial_number": disk.SerialNumber,
                            "size": int(disk.Size) if disk.Size else 0,
                            "interface_type": disk.InterfaceType,
                            "media_type": disk.MediaType,
                            "partitions": disk.Partitions
                        }
                    
                    return {
                        "partitions": disks_info,
                        "physical_disks": physical_disks
                    }
                except Exception as e:
                    logger.debug(f"Помилка отримання WMI даних дисків: {e}")
            
            return {"partitions": disks_info}
            
        except Exception as e:
            logger.error(f"Помилка отримання інформації про диски: {e}")
            return {"partitions": []}

    def get_detailed_gpu_info(self):
        """Детальна інформація про відеокарти"""
        try:
            gpu_info = []
            
            # Використання GPUtil
            try:
                gpus = GPUtil.getGPUs()
                for gpu in gpus:
                    gpu_details = {
                        "name": gpu.name,
                        "driver": gpu.driver,
                        "memory_total": gpu.memoryTotal,
                        "memory_used": gpu.memoryUsed,
                        "memory_free": gpu.memoryFree,
                        "temperature": gpu.temperature,
                        "load": gpu.load,
                        "uuid": gpu.uuid
                    }
                    gpu_info.append(gpu_details)
            except Exception as e:
                logger.debug(f"Помилка отримання GPUtil даних: {e}")
            
            # Додаткова інформація для Windows
            if self.windows_wmi:
                try:
                    for gpu in self.windows_wmi.Win32_VideoController():
                        existing_gpu = next((g for g in gpu_info if g["name"] == gpu.Name), None)
                        if not existing_gpu:
                            gpu_details = {
                                "name": gpu.Name,
                                "adapter_ram": gpu.AdapterRAM,
                                "video_processor": gpu.VideoProcessor,
                                "driver_version": gpu.DriverVersion,
                                "driver_date": gpu.DriverDate,
                                "pnp_device_id": gpu.PNPDeviceID
                            }
                            gpu_info.append(gpu_details)
                except Exception as e:
                    logger.debug(f"Помилка отримання WMI даних GPU: {e}")
            
            return gpu_info
            
        except Exception as e:
            logger.error(f"Помилка отримання інформації про GPU: {e}")
            return []

    def get_network_adapters(self):
        """Детальна інформація про мережеві адаптери"""
        try:
            network_info = []
            
            # Базові мережеві інтерфейси
            net_if_addrs = psutil.net_if_addrs()
            net_if_stats = psutil.net_if_stats()
            
            for interface_name, addresses in net_if_addrs.items():
                interface_info = {
                    "name": interface_name,
                    "addresses": [],
                    "stats": {}
                }
                
                # Адреси
                for addr in addresses:
                    if addr.family.name == "AF_INET":  # IPv4
                        interface_info["addresses"].append({
                            "type": "IPv4",
                            "address": addr.address,
                            "netmask": addr.netmask,
                            "broadcast": addr.broadcast
                        })
                    elif addr.family.name == "AF_INET6":  # IPv6
                        interface_info["addresses"].append({
                            "type": "IPv6",
                            "address": addr.address,
                            "netmask": addr.netmask
                        })
                    elif addr.family.name == "AF_PACKET":  # MAC
                        interface_info["mac_address"] = addr.address
                
                # Статистика
                if interface_name in net_if_stats:
                    stats = net_if_stats[interface_name]
                    interface_info["stats"] = {
                        "is_up": stats.isup,
                        "duplex": stats.duplex.name if hasattr(stats.duplex, 'name') else str(stats.duplex),
                        "speed": stats.speed,
                        "mtu": stats.mtu
                    }
                
                network_info.append(interface_info)
            
            # Додаткова інформація для Windows
            if self.windows_wmi:
                try:
                    for adapter in self.windows_wmi.Win32_NetworkAdapter(PhysicalAdapter=True):
                        if adapter.NetConnectionID:
                            # Знайти відповідний адаптер
                            matching_adapter = next(
                                (net for net in network_info if adapter.NetConnectionID in net["name"]), 
                                None
                            )
                            if matching_adapter:
                                matching_adapter.update({
                                    "manufacturer": adapter.Manufacturer,
                                    "product_name": adapter.ProductName,
                                    "pnp_device_id": adapter.PNPDeviceID,
                                    "adapter_type": adapter.AdapterType
                                })
                except Exception as e:
                    logger.debug(f"Помилка отримання WMI даних мережі: {e}")
            
            return network_info
            
        except Exception as e:
            logger.error(f"Помилка отримання мережевої інформації: {e}")
            return []

    def get_installed_programs(self):
        """Покращений список встановленого ПЗ"""
        programs = []
        
        try:
            if platform.system() == "Windows":
                # Реєстр Windows
                programs.extend(self._get_programs_from_registry())
                
                # WMI (якщо доступно)
                if self.windows_wmi:
                    programs.extend(self._get_programs_from_wmi())
                    
            elif platform.system() == "Linux":
                programs.extend(self._get_programs_linux())
                
            elif platform.system() == "Darwin":  # macOS
                programs.extend(self._get_programs_macos())
            
            # Унікальні програми за іменем
            unique_programs = {}
            for program in programs:
                name = program.get('name', '').strip()
                if name and name not in unique_programs:
                    unique_programs[name] = program
            
            return list(unique_programs.values())[:100]  # Обмежити до 100 програм
            
        except Exception as e:
            logger.error(f"Помилка отримання списку ПЗ: {e}")
            return []

    def _get_programs_from_registry(self):
        """Отримати програми з реєстру Windows"""
        programs = []
        
        registry_paths = [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        ]
        
        for path in registry_paths:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path) as key:
                    for i in range(winreg.QueryInfoKey(key)[0]):
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, subkey_name) as subkey:
                                try:
                                    display_name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                    program_info = {"name": display_name}
                                    
                                    # Додаткові поля
                                    for field, reg_name in [
                                        ("version", "DisplayVersion"),
                                        ("publisher", "Publisher"),
                                        ("install_date", "InstallDate"),
                                        ("size", "EstimatedSize")
                                    ]:
                                        try:
                                            value = winreg.QueryValueEx(subkey, reg_name)[0]
                                            program_info[field] = value
                                        except FileNotFoundError:
                                            pass
                                    
                                    programs.append(program_info)
                                    
                                except FileNotFoundError:
                                    pass
                        except OSError:
                            continue
            except OSError:
                continue
        
        return programs

    def _get_programs_from_wmi(self):
        """Отримати програми через WMI"""
        programs = []
        try:
            for product in self.windows_wmi.Win32_Product():
                programs.append({
                    "name": product.Name,
                    "version": product.Version,
                    "vendor": product.Vendor,
                    "install_date": product.InstallDate
                })
        except Exception as e:
            logger.debug(f"WMI програми недоступні: {e}")
        
        return programs

    def _get_programs_linux(self):
        """Отримати програми для Linux"""
        programs = []
        try:
            # dpkg для Debian/Ubuntu
            result = subprocess.run(['dpkg', '-l'], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                for line in result.stdout.split('\n')[5:]:  # Пропустити заголовки
                    parts = line.split()
                    if len(parts) >= 3 and parts[0] == 'ii':
                        programs.append({
                            "name": parts[1],
                            "version": parts[2],
                            "description": ' '.join(parts[3:]) if len(parts) > 3 else ""
                        })
        except Exception:
            try:
                # rpm для Red Hat/CentOS
                result = subprocess.run(['rpm', '-qa', '--queryformat', 
                                       '%{NAME}|%{VERSION}|%{SUMMARY}\\n'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        parts = line.split('|')
                        if len(parts) >= 2:
                            programs.append({
                                "name": parts[0],
                                "version": parts[1],
                                "description": parts[2] if len(parts) > 2 else ""
                            })
            except Exception as e:
                logger.debug(f"Не вдалося отримати rpm пакети: {e}")
        
        return programs

    def _get_programs_macos(self):
        """Отримати програми для macOS"""
        programs = []
        try:
            result = subprocess.run(['system_profiler', 'SPApplicationsDataType', '-json'], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                data = json.loads(result.stdout)
                for app in data.get('SPApplicationsDataType', []):
                    programs.append({
                        "name": app.get('_name', ''),
                        "version": app.get('version', ''),
                        "vendor": app.get('info', '')
                    })
        except Exception as e:
            logger.debug(f"Помилка отримання macOS програм: {e}")
        
        return programs

    def get_system_performance_metrics(self):
        """Детальні метрики продуктивності"""
        try:
            # CPU метрики
            cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
            cpu_times = psutil.cpu_times()
            
            # Пам'ять
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Диски I/O
            disk_io = psutil.disk_io_counters()
            
            # Мережа I/O
            net_io = psutil.net_io_counters()
            
            # Процеси
            process_count = len(psutil.pids())
            
            return {
                "cpu": {
                    "percent_total": psutil.cpu_percent(),
                    "percent_per_core": cpu_percent,
                    "times": {
                        "user": cpu_times.user,
                        "system": cpu_times.system,
                        "idle": cpu_times.idle
                    },
                    "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used,
                    "free": memory.free,
                    "buffers": memory.buffers if hasattr(memory, 'buffers') else 0,
                    "cached": memory.cached if hasattr(memory, 'cached') else 0,
                    "swap_total": swap.total,
                    "swap_used": swap.used,
                    "swap_percent": swap.percent
                },
                "disk": {
                    "read_count": disk_io.read_count if disk_io else 0,
                    "write_count": disk_io.write_count if disk_io else 0,
                    "read_bytes": disk_io.read_bytes if disk_io else 0,
                    "write_bytes": disk_io.write_bytes if disk_io else 0,
                    "read_time": disk_io.read_time if disk_io else 0,
                    "write_time": disk_io.write_time if disk_io else 0
                },
                "network": {
                    "bytes_sent": net_io.bytes_sent if net_io else 0,
                    "bytes_recv": net_io.bytes_recv if net_io else 0,
                    "packets_sent": net_io.packets_sent if net_io else 0,
                    "packets_recv": net_io.packets_recv if net_io else 0,
                    "errin": net_io.errin if net_io else 0,
                    "errout": net_io.errout if net_io else 0,
                    "dropin": net_io.dropin if net_io else 0,
                    "dropout": net_io.dropout if net_io else 0
                },
                "processes": {
                    "count": process_count,
                    "boot_time": psutil.boot_time()
                }
            }
            
        except Exception as e:
            logger.error(f"Помилка отримання метрик продуктивності: {e}")
            return {}

class EnhancedInventoryAgent:
    """Покращений агент інвентаризації"""
    
    def __init__(self):
        self.collector = EnhancedSystemCollector()
        self.last_data_hash = None
        self.data_cache_file = Path("last_enhanced_data.json")
        self.local_db_file = Path("local_inventory.db")
        self.init_local_database()
        
    def init_local_database(self):
        """Ініціалізація локальної бази даних"""
        try:
            conn = sqlite3.connect(self.local_db_file)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS inventory_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    data_hash TEXT NOT NULL,
                    raw_data TEXT NOT NULL,
                    sent_to_server BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS agent_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("Локальна база даних ініціалізована")
            
        except Exception as e:
            logger.error(f"Помилка ініціалізації локальної БД: {e}")

    def save_to_local_db(self, data, data_hash):
        """Зберегти дані в локальну базу"""
        try:
            conn = sqlite3.connect(self.local_db_file)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO inventory_snapshots (timestamp, data_hash, raw_data)
                VALUES (?, ?, ?)
            ''', (datetime.now().isoformat(), data_hash, json.dumps(data, default=str)))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Помилка збереження в локальну БД: {e}")

    def collect_comprehensive_data(self):
        """Комплексний збір даних про систему"""
        try:
            logger.info("Початок комплексного збору даних...")
            
            # Збір даних паралельно для оптимізації швидкості
            with ThreadPoolExecutor(max_workers=8) as executor:
                future_to_method = {
                    executor.submit(self.collector.get_detailed_cpu_info): "cpu_detailed",
                    executor.submit(self.collector.get_detailed_memory_info): "memory_detailed", 
                    executor.submit(self.collector.get_detailed_disk_info): "disk_detailed",
                    executor.submit(self.collector.get_detailed_gpu_info): "gpu_detailed",
                    executor.submit(self.collector.get_network_adapters): "network_adapters",
                    executor.submit(self.collector.get_installed_programs): "installed_programs",
                    executor.submit(self.collector.get_system_performance_metrics): "performance_metrics",
                }
                
                collected_data = {}
                for future in as_completed(future_to_method):
                    method_name = future_to_method[future]
                    try:
                        result = future.result(timeout=60)
                        collected_data[method_name] = result
                        logger.debug(f"Зібрано дані: {method_name}")
                    except Exception as e:
                        logger.error(f"Помилка збору {method_name}: {e}")
                        collected_data[method_name] = {}

            # Базова інформація
            serial_number = self._get_system_serial()
            hostname = socket.gethostname()
            
            # Формування комплексних даних
            comprehensive_data = {
                # Основна інформація
                "name": hostname,
                "hostname": hostname,
                "category": self._determine_device_category(),
                "model": self._get_system_model(),
                "manufacturer": self._get_system_manufacturer(), 
                "serial_number": serial_number,
                "inventory_number": self._generate_inventory_number(serial_number),
                
                # Мережева інформація
                "mac_address": self._get_primary_mac(),
                "ip_address": self._get_primary_ip(),
                "network_adapters": collected_data.get("network_adapters", []),
                
                # Розташування та статус
                "location": COMPUTER_LOCATION,
                "status": "WORKING",
                
                # Детальні технічні характеристики
                "cpu_info": collected_data.get("cpu_detailed", {}),
                "memory_info": collected_data.get("memory_detailed", {}),
                "disk_info": collected_data.get("disk_detailed", {}),
                "gpu_info": collected_data.get("gpu_detailed", []),
                
                # Спрощені характеристики для основних полів
                "cpu": collected_data.get("cpu_detailed", {}).get("name", platform.processor()),
                "ram": self._format_ram_size(collected_data.get("memory_detailed", {}).get("total", 0)),
                "operating_system": f"{platform.system()} {platform.release()} {platform.version()}",
                
                # Встановлене ПЗ
                "installed_software": collected_data.get("installed_programs", []),
                
                # Метрики продуктивності
                "performance_metrics": collected_data.get("performance_metrics", {}),
                
                # Мета-інформація
                "agent_version": "3.0_Enhanced",
                "collection_time": datetime.now().isoformat(),
                "last_seen": datetime.now().isoformat(),
                "purchase_date": datetime.now().strftime("%Y-%m-%d"),  # Можна налаштувати
                "collection_duration": time.time(),
            }
            
            # Розрахувати час збору
            comprehensive_data["collection_duration"] = time.time() - comprehensive_data["collection_duration"]
            
            logger.info(f"Зібрано комплексні дані для {hostname} за {comprehensive_data['collection_duration']:.2f} сек")
            return comprehensive_data
            
        except Exception as e:
            logger.error(f"Помилка комплексного збору даних: {e}")
            raise

    def _get_system_serial(self):
        """Отримати серійний номер системи"""
        try:
            if platform.system() == "Windows":
                if self.collector.windows_wmi:
                    for bios in self.collector.windows_wmi.Win32_BIOS():
                        if bios.SerialNumber and bios.SerialNumber != "To Be Filled By O.E.M.":
                            return bios.SerialNumber
                
                # Fallback через PowerShell
                result = subprocess.check_output([
                    "powershell", "-Command", 
                    "Get-WmiObject Win32_BIOS | Select-Object -ExpandProperty SerialNumber"
                ], stderr=subprocess.DEVNULL, timeout=10)
                serial = result.decode().strip()
                return serial if serial and serial != "To Be Filled By O.E.M." else f"WIN-{uuid.uuid4().hex[:8].upper()}"
                
            else:
                # Для Linux/macOS
                try:
                    result = subprocess.check_output(["sudo", "dmidecode", "-s", "system-serial-number"], 
                                                   stderr=subprocess.DEVNULL, timeout=10)
                    return result.decode().strip()
                except:
                    return f"LINUX-{uuid.uuid4().hex[:8].upper()}"
                    
        except Exception as e:
            logger.debug(f"Помилка отримання серійного номера: {e}")
            return f"UNKNOWN-{uuid.uuid4().hex[:8].upper()}"

    def _get_system_manufacturer(self):
        """Отримати виробника системи"""
        try:
            if platform.system() == "Windows":
                if self.collector.windows_wmi:
                    for system in self.collector.windows_wmi.Win32_ComputerSystem():
                        return system.Manufacturer or "Unknown"
            return "Unknown"
        except:
            return "Unknown"

    def _get_system_model(self):
        """Отримати модель системи"""
        try:
            if platform.system() == "Windows":
                if self.collector.windows_wmi:
                    for system in self.collector.windows_wmi.Win32_ComputerSystem():
                        return system.Model or "Unknown"
            return platform.machine()
        except:
            return platform.machine()

    def _determine_device_category(self):
        """Визначити категорію пристрою"""
        try:
            if platform.system() == "Windows":
                if self.collector.windows_wmi:
                    for system in self.collector.windows_wmi.Win32_ComputerSystem():
                        pc_type = system.PCSystemType
                        if pc_type == 2:
                            return "LAPTOP"
                        elif pc_type == 8:
                            return "TABLET"
                        elif pc_type in [3, 4, 5, 6, 7]:
                            return "SRV"
                        else:
                            return "PC"
            
            # Для інших систем
            if "server" in platform.node().lower():
                return "SRV"
            return "PC"
            
        except:
            return "PC"

    def _get_primary_mac(self):
        """Отримати основну MAC-адресу"""
        try:
            mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) 
                           for elements in range(0, 2 * 6, 8)][::-1])
            return mac
        except:
            return "00:00:00:00:00:00"

    def _get_primary_ip(self):
        """Отримати основну IP-адресу"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except:
            try:
                return socket.gethostbyname(socket.gethostname())
            except:
                return "127.0.0.1"

    def _format_ram_size(self, bytes_size):
        """Форматувати розмір RAM"""
        try:
            gb_size = bytes_size / (1024**3)
            return f"{gb_size:.0f} GB"
        except:
            return "Unknown"

    def _generate_inventory_number(self, serial_number):
        """Генерувати інвентарний номер"""
        machine_id = f"{platform.node()}-{uuid.getnode()}"
        unique_hash = hashlib.md5(machine_id.encode()).hexdigest()[:8]
        return f"{serial_number}-{unique_hash.upper()}"

    async def run_enhanced_collection(self):
        """Запуск покращеного збору даних"""
        timeout = aiohttp.ClientTimeout(total=60)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                # Аутентифікація
                if not hasattr(self, 'token_manager'):
                    from agent import TokenManager  # Використати існуючий TokenManager
                    self.token_manager = TokenManager()
                
                if not self.token_manager.get_access_token():
                    await self.authenticate(session)
                
                logger.info("Запуск покращеного збору даних...")
                
                # Збір даних
                data = self.collect_comprehensive_data()
                
                # Перевірка змін
                data_hash = self._calculate_data_hash(data)
                
                if self.has_data_changed(data_hash):
                    logger.info("Дані змінились, відправляємо на сервер")
                    
                    # Збереження в локальну БД
                    self.save_to_local_db(data, data_hash)
                    
                    # Відправка на сервер
                    await self.send_data_to_server(session, data)
                    
                    # Збереження кешу
                    self.save_data_cache(data)
                else:
                    logger.info("Дані не змінились, пропускаємо відправку")
                
            except Exception as e:
                logger.error(f"Помилка покращеного збору: {e}")
                raise

    def _calculate_data_hash(self, data):
        """Розрахувати хеш даних"""
        stable_data = {k: v for k, v in data.items() 
                      if k not in ['last_seen', 'collection_time', 'performance_metrics', 'collection_duration']}
        return hashlib.md5(json.dumps(stable_data, sort_keys=True, default=str).encode()).hexdigest()

    def has_data_changed(self, data_hash):
        """Перевірити чи змінились дані"""
        if data_hash != self.last_data_hash:
            self.last_data_hash = data_hash
            return True
        return False

    def save_data_cache(self, data):
        """Зберегти кеш даних"""
        try:
            with open(self.data_cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Помилка збереження кешу: {e}")

    async def authenticate(self, session):
        """Аутентифікація"""
        try:
            async with session.post(TOKEN_URL, json={"username": USER, "password": PASSWORD}) as response:
                if response.status == 200:
                    tokens = await response.json()
                    self.token_manager.set_tokens(tokens.get("access"), tokens.get("refresh"))
                    logger.info("Успішна аутентифікація")
                else:
                    error_text = await response.text()
                    raise Exception(f"Помилка аутентифікації: {response.status} - {error_text}")
        except Exception as e:
            logger.error(f"Помилка аутентифікації: {e}")
            raise

    async def send_data_to_server(self, session, data):
        """Відправка даних на сервер"""
        headers = {"Authorization": f"Bearer {self.token_manager.get_access_token()}"}
        
        try:
            async with session.post(API_URL, json=data, headers=headers) as response:
                if response.status == 401:
                    logger.warning("Токен закінчився, оновлюємо...")
                    await self.refresh_access_token(session)
                    headers["Authorization"] = f"Bearer {self.token_manager.get_access_token()}"
                    
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

    async def refresh_access_token(self, session):
        """Оновлення токена доступу"""
        try:
            refresh_token = self.token_manager.get_refresh_token()
            if not refresh_token:
                raise Exception("Немає refresh токена")
                
            async with session.post(REFRESH_URL, json={"refresh": refresh_token}) as response:
                if response.status == 200:
                    new_tokens = await response.json()
                    self.token_manager.set_tokens(new_tokens.get("access"), refresh_token)
                    logger.info("Токен успішно оновлено")
                else:
                    self.token_manager.clear_tokens()
                    raise Exception(f"Помилка оновлення токена: {response.status}")
        except Exception as e:
            logger.error(f"Помилка оновлення токена: {e}")
            raise

def main():
    """Головна функція покращеного агента"""
    try:
        agent = EnhancedInventoryAgent()
        asyncio.run(agent.run_enhanced_collection())
    except KeyboardInterrupt:
        logger.info("Покращений агент зупинено користувачем")
    except Exception as e:
        logger.error(f"Критична помилка покращеного агента: {e}")

if __name__ == "__main__":
    main()