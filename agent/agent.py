"""
IT Inventory Agent v5.0
Збирає повну інформацію про комп'ютер та відправляє на сервер інвентаризації.
Включає деталізовані характеристики: материнська плата, накопичувачі, екран, мережевий адаптер, BIOS.
Підтримує Windows, Linux, macOS.
"""
import os
import sys
import platform
import socket
import uuid
import json
import time
import logging
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

import psutil
import requests

# Прапорець для приховання вікон консолі/PowerShell на Windows
_NO_WINDOW = subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0

# ---------------------------------------------------------------------------
# Базова директорія (працює і як .py, і як скомпільований .exe)
# ---------------------------------------------------------------------------
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "agent.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("agent")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
def load_config():
    """Зчитати конфігурацію з .env файлу або змінних оточення."""
    env_file = BASE_DIR / ".env"
    env = {}
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()

    def get(key, default=""):
        # .env має пріоритет над системними змінними оточення
        return env.get(key, os.environ.get(key, default))

    return {
        "api_url": get("API_URL", "http://127.0.0.1:8000"),
        "username": get("USERNAME", get("USER", "")),
        "password": get("PASSWORD", ""),
        "location": get("LOCATION", ""),
        "interval": int(get("INTERVAL", "3600")),
    }


# ---------------------------------------------------------------------------
# System Collector
# ---------------------------------------------------------------------------
class SystemCollector:
    """Збирає всю інформацію про систему."""

    def __init__(self):
        self._is_windows = platform.system() == "Windows"

    # --- Public ---

    def collect_all(self) -> dict:
        """Зібрати повний звіт."""
        log.info("Збір даних про систему...")
        start = time.time()

        identity = self._get_identity()
        network = self._get_network()
        os_info = self._get_os()
        cpu = self._get_cpu()
        ram = self._get_ram()
        storage = self._get_storage()
        gpu = self._get_gpu()
        motherboard = self._get_motherboard()
        disk_model = self._get_disk_models()
        display = self._get_display()
        network_adapter = self._get_network_adapter()
        power_supply = self._get_power_supply()
        bios_version = self._get_bios_version()
        software = self._get_installed_software()
        peripherals = self._get_peripherals()

        report = {
            # Ідентифікація
            "serial_number": identity["serial_number"],
            "name": identity["hostname"],
            "hostname": identity["hostname"],
            "manufacturer": identity["manufacturer"],
            "model": identity["model"],
            "category": identity["category"],
            # Мережа
            "ip_address": network["ip"],
            "mac_address": network["mac"],
            # ОС
            "operating_system": os_info,
            # Характеристики
            "cpu": cpu,
            "ram": ram,
            "storage": storage,
            "gpu": gpu,
            # Деталізовані характеристики
            "motherboard": motherboard.get("name", ""),
            "motherboard_serial": motherboard.get("serial", ""),
            "disk_model": disk_model,
            "display": display,
            "network_adapter": network_adapter,
            "power_supply": power_supply,
            "bios_version": bios_version,
            # Статус
            "status": "WORKING",
            # Масиви для синхронізації
            "installed_software": software,
            "peripherals": peripherals,
            # Мета
            "agent_version": "5.0",
        }

        elapsed = time.time() - start
        log.info(f"Збір завершено за {elapsed:.1f}с — {identity['hostname']} ({identity['serial_number']})")
        return report

    # --- Identity ---

    def _get_identity(self) -> dict:
        hostname = socket.gethostname()
        serial = self._get_serial_number()
        manufacturer = self._wmi_value("Win32_ComputerSystem", "Manufacturer") or ""
        model = self._wmi_value("Win32_ComputerSystem", "Model") or platform.machine()
        category = self._detect_category()
        return {
            "hostname": hostname,
            "serial_number": serial,
            "manufacturer": manufacturer,
            "model": model,
            "category": category,
        }

    def _get_serial_number(self) -> str:
        if self._is_windows:
            serial = self._wmi_value("Win32_BIOS", "SerialNumber")
            if serial and serial not in ("", "To Be Filled By O.E.M.", "Default string", "None"):
                return serial
        else:
            for cmd in [
                ["sudo", "dmidecode", "-s", "system-serial-number"],
                ["cat", "/sys/firmware/dmi/tables/DMI"],
            ]:
                try:
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                    s = result.stdout.strip()
                    if s and s not in ("", "None"):
                        return s
                except Exception:
                    pass
        # Fallback: стабільний ID з hostname + MAC
        machine_id = f"{socket.gethostname()}-{uuid.getnode()}"
        import hashlib
        return f"AUTO-{hashlib.md5(machine_id.encode()).hexdigest()[:12].upper()}"

    def _detect_category(self) -> str:
        if self._is_windows:
            val = self._wmi_value("Win32_ComputerSystem", "PCSystemType")
            if val:
                try:
                    pc_type = int(val)
                    return {2: "LAPTOP", 8: "TABLET"}.get(pc_type, "PC")
                except ValueError:
                    pass
        if hasattr(psutil, "sensors_battery") and psutil.sensors_battery():
            return "LAPTOP"
        return "PC"

    # --- OS ---

    def _get_os(self) -> str:
        s = platform.system()
        if s == "Windows":
            ver = platform.version()
            rel = platform.release()
            return f"Windows {rel} (build {ver})"
        elif s == "Darwin":
            ver = platform.mac_ver()[0]
            return f"macOS {ver}"
        else:
            try:
                import distro  # type: ignore
                return f"{distro.name()} {distro.version()}"
            except ImportError:
                return f"{s} {platform.release()}"

    # --- CPU ---

    def _get_cpu(self) -> str:
        if self._is_windows:
            name = self._wmi_value("Win32_Processor", "Name")
            if name:
                return name.strip()
        # Fallback
        brand = platform.processor()
        if brand:
            return brand
        cores = psutil.cpu_count(logical=False) or "?"
        threads = psutil.cpu_count(logical=True) or "?"
        freq = psutil.cpu_freq()
        freq_str = f" @ {freq.max:.0f}MHz" if freq and freq.max else ""
        return f"{cores}C/{threads}T{freq_str}"

    # --- RAM ---

    def _get_ram(self) -> str:
        total = psutil.virtual_memory().total
        gb = total / (1024 ** 3)
        return f"{gb:.0f} GB"

    # --- Storage ---

    def _get_storage(self) -> str:
        parts = []
        for p in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(p.mountpoint)
                gb = usage.total / (1024 ** 3)
                parts.append(f"{p.device} {gb:.0f}GB")
            except (PermissionError, OSError):
                continue
        return "; ".join(parts) if parts else ""

    # --- GPU ---

    def _get_gpu(self) -> str:
        if self._is_windows:
            name = self._wmi_value("Win32_VideoController", "Name")
            if name:
                return name.strip()
        else:
            try:
                result = subprocess.run(
                    ["lspci"], capture_output=True, text=True, timeout=5
                )
                for line in result.stdout.splitlines():
                    if "VGA" in line or "3D" in line:
                        return line.split(": ", 1)[-1].strip()
            except Exception:
                pass
        return ""

    # --- Motherboard ---

    def _get_motherboard(self) -> dict:
        name, serial = "", ""
        if self._is_windows:
            name = self._wmi_value("Win32_BaseBoard", "Manufacturer") or ""
            product = self._wmi_value("Win32_BaseBoard", "Product") or ""
            if name and product:
                name = f"{name} {product}"
            elif product:
                name = product
            serial = self._wmi_value("Win32_BaseBoard", "SerialNumber") or ""
            if serial in ("To Be Filled By O.E.M.", "Default string", "None", ""):
                serial = ""
        else:
            try:
                r = subprocess.run(["sudo", "dmidecode", "-t", "baseboard"], capture_output=True, text=True, timeout=5)
                for line in r.stdout.splitlines():
                    line = line.strip()
                    if line.startswith("Manufacturer:"):
                        name = line.split(":", 1)[1].strip()
                    elif line.startswith("Product Name:"):
                        product = line.split(":", 1)[1].strip()
                        name = f"{name} {product}".strip()
                    elif line.startswith("Serial Number:"):
                        serial = line.split(":", 1)[1].strip()
                        if serial in ("Not Specified", "None", ""):
                            serial = ""
            except Exception:
                pass
        return {"name": name, "serial": serial}

    # --- Disk Models ---

    def _get_disk_models(self) -> str:
        disks = []
        if self._is_windows:
            try:
                result = subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     "Get-CimInstance Win32_DiskDrive | Select-Object Model, Size, MediaType | ConvertTo-Json -Compress"],
                    capture_output=True, text=True, timeout=10,
                    creationflags=_NO_WINDOW,
                )
                if result.returncode == 0 and result.stdout.strip():
                    raw = json.loads(result.stdout)
                    if isinstance(raw, dict):
                        raw = [raw]
                    for d in raw:
                        model = (d.get("Model") or "").strip()
                        size = d.get("Size")
                        media = (d.get("MediaType") or "").strip()
                        if not model:
                            continue
                        size_str = f" {int(size) // (1024**3)}GB" if size else ""
                        type_str = ""
                        if "SSD" in media.upper() or "SSD" in model.upper():
                            type_str = "SSD: "
                        elif "HDD" in media.upper() or "Fixed" in media:
                            type_str = "HDD: "
                        disks.append(f"{type_str}{model}{size_str}")
            except Exception:
                pass
        else:
            try:
                result = subprocess.run(["lsblk", "-d", "-o", "NAME,MODEL,SIZE,ROTA", "-n"],
                                        capture_output=True, text=True, timeout=5)
                for line in result.stdout.strip().splitlines():
                    parts = line.split(None, 3)
                    if len(parts) >= 3:
                        model = parts[1] if parts[1] != "" else parts[0]
                        size = parts[2]
                        rota = parts[3] if len(parts) > 3 else "1"
                        prefix = "HDD: " if rota.strip() == "1" else "SSD: "
                        disks.append(f"{prefix}{model} {size}")
            except Exception:
                pass
        return "\n".join(disks) if disks else ""

    # --- Display ---

    def _get_display(self) -> str:
        if self._is_windows:
            name = self._wmi_value("Win32_DesktopMonitor", "Name")
            if name and name != "Generic PnP Monitor":
                return name.strip()
            # Fallback: get from VideoController
            desc = self._wmi_value("Win32_VideoController", "VideoModeDescription")
            if desc:
                return desc.strip()
        else:
            try:
                result = subprocess.run(["xrandr", "--current"], capture_output=True, text=True, timeout=5)
                for line in result.stdout.splitlines():
                    if " connected" in line:
                        parts = line.split()
                        name = parts[0]
                        # Find resolution
                        for p in parts:
                            if "x" in p and p[0].isdigit():
                                return f"{name} {p}"
                        return name
            except Exception:
                pass
        return ""

    # --- Network Adapter ---

    def _get_network_adapter(self) -> str:
        if self._is_windows:
            try:
                result = subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     "Get-CimInstance Win32_NetworkAdapter | Where-Object { $_.NetConnectionStatus -eq 2 } | "
                     "Select-Object -First 1 -ExpandProperty Name"],
                    capture_output=True, text=True, timeout=10,
                    creationflags=_NO_WINDOW,
                )
                val = result.stdout.strip()
                if val:
                    return val.split("\n")[0].strip()
            except Exception:
                pass
        else:
            try:
                result = subprocess.run(["lspci"], capture_output=True, text=True, timeout=5)
                for line in result.stdout.splitlines():
                    if "Ethernet" in line or "Network" in line:
                        return line.split(": ", 1)[-1].strip()
            except Exception:
                pass
        return ""

    # --- Power Supply ---

    def _get_power_supply(self) -> str:
        # PSU info is generally not available via software on desktops.
        # On laptops, we can report battery + adapter info.
        if self._is_windows:
            try:
                result = subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     "Get-CimInstance Win32_Battery | Select-Object Name, DesignCapacity, FullChargeCapacity | ConvertTo-Json -Compress"],
                    capture_output=True, text=True, timeout=10,
                    creationflags=_NO_WINDOW,
                )
                if result.returncode == 0 and result.stdout.strip():
                    raw = json.loads(result.stdout)
                    if isinstance(raw, dict):
                        raw = [raw]
                    parts = []
                    for b in raw:
                        name = (b.get("Name") or "").strip()
                        design = b.get("DesignCapacity")
                        full = b.get("FullChargeCapacity")
                        info = name
                        if design:
                            info += f" {design}mWh"
                        if design and full and design > 0:
                            health = int(full / design * 100)
                            info += f" ({health}% health)"
                        if info:
                            parts.append(info)
                    return "; ".join(parts)
            except Exception:
                pass
        else:
            battery = psutil.sensors_battery()
            if battery:
                return f"Battery {battery.percent}%"
        return ""

    # --- BIOS Version ---

    def _get_bios_version(self) -> str:
        if self._is_windows:
            manufacturer = self._wmi_value("Win32_BIOS", "Manufacturer") or ""
            version = self._wmi_value("Win32_BIOS", "SMBIOSBIOSVersion") or ""
            # Get date via structured query
            try:
                result = subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     "(Get-CimInstance Win32_BIOS).ReleaseDate.ToString('yyyy-MM-dd')"],
                    capture_output=True, text=True, timeout=10,
                    creationflags=_NO_WINDOW,
                )
                date = result.stdout.strip() if result.returncode == 0 else ""
            except Exception:
                date = ""
            parts = []
            if manufacturer:
                parts.append(manufacturer)
            if version:
                parts.append(version)
            if date:
                parts.append(date)
            return " ".join(parts)
        else:
            try:
                result = subprocess.run(["sudo", "dmidecode", "-s", "bios-version"],
                                        capture_output=True, text=True, timeout=5)
                return result.stdout.strip()
            except Exception:
                pass
        return ""

    # --- Network ---

    def _get_network(self) -> dict:
        ip = self._get_primary_ip()
        mac = self._get_primary_mac()
        return {"ip": ip, "mac": mac}

    def _get_primary_ip(self) -> str:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return "127.0.0.1"

    def _get_primary_mac(self) -> str:
        try:
            node = uuid.getnode()
            mac = ":".join(
                f"{(node >> i) & 0xFF:02x}" for i in range(0, 48, 8)
            )[::-1]
            # uuid.getnode() повертає bytes у зворотному порядку, виправимо
            parts = []
            for i in range(5, -1, -1):
                parts.append(f"{(node >> (i * 8)) & 0xFF:02x}")
            return ":".join(parts)
        except Exception:
            return "00:00:00:00:00:00"

    # --- Installed Software ---

    def _get_installed_software(self) -> list:
        if self._is_windows:
            return self._software_windows()
        elif platform.system() == "Linux":
            return self._software_linux()
        elif platform.system() == "Darwin":
            return self._software_macos()
        return []

    def _software_windows(self) -> list:
        programs = []
        try:
            import winreg
            paths = [
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                r"SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
            ]
            for reg_path in paths:
                try:
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path) as key:
                        for i in range(winreg.QueryInfoKey(key)[0]):
                            try:
                                subkey_name = winreg.EnumKey(key, i)
                                with winreg.OpenKey(key, subkey_name) as subkey:
                                    try:
                                        name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                    except FileNotFoundError:
                                        continue
                                    version = ""
                                    vendor = ""
                                    try:
                                        version = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
                                    except FileNotFoundError:
                                        pass
                                    try:
                                        vendor = winreg.QueryValueEx(subkey, "Publisher")[0]
                                    except FileNotFoundError:
                                        pass
                                    if name:
                                        programs.append({
                                            "name": name,
                                            "version": version or "",
                                            "vendor": vendor or "",
                                        })
                            except OSError:
                                continue
                except OSError:
                    continue
        except ImportError:
            pass
        return programs[:200]

    def _software_linux(self) -> list:
        programs = []
        # dpkg
        try:
            result = subprocess.run(
                ["dpkg-query", "-W", "-f", "${Package}|${Version}|${Maintainer}\n"],
                capture_output=True, text=True, timeout=15,
            )
            if result.returncode == 0:
                for line in result.stdout.strip().splitlines():
                    parts = line.split("|", 2)
                    if len(parts) >= 2:
                        programs.append({
                            "name": parts[0],
                            "version": parts[1],
                            "vendor": parts[2] if len(parts) > 2 else "",
                        })
                return programs[:200]
        except Exception:
            pass
        # rpm
        try:
            result = subprocess.run(
                ["rpm", "-qa", "--queryformat", "%{NAME}|%{VERSION}|%{VENDOR}\n"],
                capture_output=True, text=True, timeout=15,
            )
            if result.returncode == 0:
                for line in result.stdout.strip().splitlines():
                    parts = line.split("|", 2)
                    if len(parts) >= 2:
                        programs.append({
                            "name": parts[0],
                            "version": parts[1],
                            "vendor": parts[2] if len(parts) > 2 else "",
                        })
        except Exception:
            pass
        return programs[:200]

    def _software_macos(self) -> list:
        programs = []
        try:
            result = subprocess.run(
                ["system_profiler", "SPApplicationsDataType", "-json"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                for app in data.get("SPApplicationsDataType", []):
                    programs.append({
                        "name": app.get("_name", ""),
                        "version": app.get("version", ""),
                        "vendor": app.get("obtained_from", ""),
                    })
        except Exception:
            pass
        return programs[:200]

    # --- Peripherals ---

    def _get_peripherals(self) -> list:
        if not self._is_windows:
            return []
        devices = []
        try:
            result = subprocess.run(
                [
                    "powershell", "-NoProfile", "-Command",
                    "Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPDeviceID -like 'USB*' } | "
                    "Select-Object Name, DeviceID, Manufacturer | ConvertTo-Json -Compress",
                ],
                capture_output=True, text=True, timeout=15,
                creationflags=_NO_WINDOW,
            )
            if result.returncode == 0 and result.stdout.strip():
                raw = json.loads(result.stdout)
                if isinstance(raw, dict):
                    raw = [raw]
                for d in raw:
                    name = d.get("Name", "").strip()
                    if not name:
                        continue
                    device_id = d.get("DeviceID", "")
                    # Генеруємо серійний з DeviceID
                    import hashlib
                    serial = hashlib.md5(device_id.encode()).hexdigest()[:12].upper() if device_id else ""
                    devices.append({
                        "name": name,
                        "type": "USB",
                        "serial_number": f"USB-{serial}" if serial else "",
                    })
        except Exception as e:
            log.debug(f"Peripherals collection error: {e}")
        return devices[:50]

    # --- Helpers ---

    def _wmi_value(self, wmi_class: str, prop: str) -> str | None:
        """Отримати значення WMI властивості через PowerShell."""
        if not self._is_windows:
            return None
        try:
            result = subprocess.run(
                [
                    "powershell", "-NoProfile", "-Command",
                    f"(Get-CimInstance {wmi_class}).{prop}",
                ],
                capture_output=True, text=True, timeout=10,
                creationflags=_NO_WINDOW,
            )
            val = result.stdout.strip()
            # Якщо кілька рядків (кілька процесорів/GPU) — беремо перший
            if "\n" in val:
                val = val.split("\n")[0].strip()
            return val if val else None
        except Exception:
            return None


# ---------------------------------------------------------------------------
# API Client
# ---------------------------------------------------------------------------
class AgentClient:
    """Клієнт для спілкування з сервером інвентаризації."""

    def __init__(self, api_url: str, username: str, password: str):
        self.api_url = api_url.rstrip("/")
        self.username = username
        self.password = password
        self.access_token = None
        self.refresh_token_str = None
        self.session = requests.Session()
        self.session.headers["Content-Type"] = "application/json"

    def authenticate(self):
        """Отримати JWT токени."""
        url = f"{self.api_url}/api/token/"
        log.info(f"Аутентифікація на {url}...")
        resp = self.session.post(url, json={
            "username": self.username,
            "password": self.password,
        }, timeout=15)
        resp.raise_for_status()
        tokens = resp.json()
        self.access_token = tokens["access"]
        self.refresh_token_str = tokens["refresh"]
        self.session.headers["Authorization"] = f"Bearer {self.access_token}"
        log.info("Аутентифікація успішна")

    def _refresh_token(self):
        """Оновити access token."""
        if not self.refresh_token_str:
            raise RuntimeError("Немає refresh token")
        url = f"{self.api_url}/api/token/refresh/"
        resp = self.session.post(url, json={"refresh": self.refresh_token_str}, timeout=15)
        resp.raise_for_status()
        self.access_token = resp.json()["access"]
        self.session.headers["Authorization"] = f"Bearer {self.access_token}"
        log.info("Токен оновлено")

    def send_report(self, data: dict) -> dict:
        """Відправити звіт на /api/agent/report/. Авто-retry при 401."""
        url = f"{self.api_url}/api/agent/report/"
        log.info(f"Відправка звіту на {url}...")

        for attempt in range(2):
            resp = self.session.post(url, json=data, timeout=30)
            if resp.status_code == 401 and attempt == 0:
                log.warning("Токен протух, оновлюю...")
                try:
                    self._refresh_token()
                except Exception:
                    self.authenticate()
                continue
            break

        if resp.status_code in (200, 201):
            result = resp.json()
            action = "Створено" if result.get("created") else "Оновлено"
            log.info(
                f"{action} обладнання #{result.get('equipment_id')} | "
                f"ПЗ: {result.get('software_synced', 0)} | "
                f"Периферія: {result.get('peripherals_synced', 0)}"
            )
            return result
        else:
            log.error(f"Помилка сервера: {resp.status_code} — {resp.text[:500]}")
            resp.raise_for_status()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="IT Inventory Agent v5.0")
    parser.add_argument("--json", action="store_true", help="Зберегти JSON локально без відправки")
    parser.add_argument("--loop", action="store_true", help="Запускати періодично")
    parser.add_argument("--interval", type=int, help="Інтервал у секундах (для --loop)")
    args = parser.parse_args()

    cfg = load_config()
    collector = SystemCollector()

    if args.json:
        # Режим: тільки зберегти локально
        data = collector.collect_all()
        data["location"] = cfg["location"]
        out = BASE_DIR / "report.json"
        out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        log.info(f"Звіт збережено: {out}")
        return

    # Перевірка конфігу
    if not cfg["username"] or not cfg["password"]:
        log.error("Не вказано USERNAME/PASSWORD у .env файлі")
        sys.exit(1)

    client = AgentClient(cfg["api_url"], cfg["username"], cfg["password"])
    client.authenticate()

    interval = args.interval or cfg["interval"]

    while True:
        try:
            data = collector.collect_all()
            data["location"] = cfg["location"]
            client.send_report(data)
        except Exception as e:
            log.error(f"Помилка: {e}")

        if not args.loop:
            break

        log.info(f"Наступний збір через {interval}с...")
        time.sleep(interval)


if __name__ == "__main__":
    main()
