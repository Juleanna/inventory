"""
IT Inventory Agent — GUI (PySide6)
Графічний інтерфейс для збору та відправки інвентаризаційних даних.
"""
import sys
import os
import json
import time
import platform
import argparse
from pathlib import Path
from datetime import datetime

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QTabWidget, QWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QLabel, QPushButton, QLineEdit, QTextEdit, QTableWidget,
    QTableWidgetItem, QSpinBox, QCheckBox, QGroupBox, QStatusBar, QMenu,
    QSystemTrayIcon, QMessageBox, QFileDialog, QHeaderView, QAbstractItemView,
    QFrame,
)
from PySide6.QtCore import Qt, QThread, Signal, QTimer, QSize
from PySide6.QtGui import (
    QIcon, QPixmap, QPainter, QColor, QFont, QPalette, QAction,
)

# Імпортуємо збирач даних та клієнт з agent.py
from agent import SystemCollector, AgentClient, load_config

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
APP_NAME = "IT Inventory Agent"
APP_VERSION = "4.0"
ICON_SIZE = 64

COLORS = {
    "bg": "#1E1E1E",
    "bg_card": "#2D2D2D",
    "bg_input": "#3C3C3C",
    "border": "#404040",
    "text": "#E0E0E0",
    "text_dim": "#999999",
    "accent": "#0078D4",
    "accent_hover": "#1A8AE8",
    "success": "#4CAF50",
    "warning": "#FF9800",
    "error": "#F44336",
}

# ---------------------------------------------------------------------------
# Styles (QSS)
# ---------------------------------------------------------------------------
STYLESHEET = f"""
QMainWindow, QWidget {{
    background-color: {COLORS['bg']};
    color: {COLORS['text']};
    font-family: "Segoe UI", sans-serif;
    font-size: 13px;
}}
QTabWidget::pane {{
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 8px;
    background-color: {COLORS['bg']};
}}
QTabBar::tab {{
    background-color: {COLORS['bg_card']};
    color: {COLORS['text_dim']};
    padding: 8px 20px;
    margin-right: 2px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border: 1px solid {COLORS['border']};
    border-bottom: none;
}}
QTabBar::tab:selected {{
    background-color: {COLORS['accent']};
    color: white;
}}
QTabBar::tab:hover:!selected {{
    background-color: {COLORS['bg_input']};
    color: {COLORS['text']};
}}
QGroupBox {{
    font-weight: bold;
    font-size: 14px;
    border: 1px solid {COLORS['border']};
    border-radius: 8px;
    margin-top: 12px;
    padding: 16px 12px 12px 12px;
    background-color: {COLORS['bg_card']};
}}
QGroupBox::title {{
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 6px;
    color: {COLORS['accent']};
}}
QLabel {{
    color: {COLORS['text']};
}}
QLabel[class="dim"] {{
    color: {COLORS['text_dim']};
    font-size: 12px;
}}
QLabel[class="value"] {{
    font-weight: bold;
    font-size: 14px;
}}
QLabel[class="title"] {{
    font-size: 22px;
    font-weight: bold;
    color: {COLORS['accent']};
}}
QPushButton {{
    background-color: {COLORS['accent']};
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    font-weight: bold;
    font-size: 13px;
    min-height: 20px;
}}
QPushButton:hover {{
    background-color: {COLORS['accent_hover']};
}}
QPushButton:pressed {{
    background-color: #005A9E;
}}
QPushButton:disabled {{
    background-color: {COLORS['bg_input']};
    color: {COLORS['text_dim']};
}}
QPushButton[class="secondary"] {{
    background-color: {COLORS['bg_input']};
    color: {COLORS['text']};
    border: 1px solid {COLORS['border']};
}}
QPushButton[class="secondary"]:hover {{
    background-color: #4A4A4A;
}}
QPushButton[class="success"] {{
    background-color: {COLORS['success']};
}}
QPushButton[class="success"]:hover {{
    background-color: #66BB6A;
}}
QLineEdit, QSpinBox {{
    background-color: {COLORS['bg_input']};
    color: {COLORS['text']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 13px;
    min-height: 20px;
}}
QLineEdit:focus, QSpinBox:focus {{
    border-color: {COLORS['accent']};
}}
QTextEdit {{
    background-color: {COLORS['bg_input']};
    color: {COLORS['text']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 8px;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 12px;
}}
QTableWidget {{
    background-color: {COLORS['bg_card']};
    color: {COLORS['text']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    gridline-color: {COLORS['border']};
    selection-background-color: {COLORS['accent']};
    selection-color: white;
}}
QTableWidget::item {{
    padding: 4px 8px;
}}
QHeaderView::section {{
    background-color: {COLORS['bg_input']};
    color: {COLORS['text']};
    padding: 6px 8px;
    border: none;
    border-right: 1px solid {COLORS['border']};
    border-bottom: 1px solid {COLORS['border']};
    font-weight: bold;
    font-size: 12px;
}}
QCheckBox {{
    color: {COLORS['text']};
    spacing: 8px;
    font-size: 13px;
}}
QCheckBox::indicator {{
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid {COLORS['border']};
    background-color: {COLORS['bg_input']};
}}
QCheckBox::indicator:checked {{
    background-color: {COLORS['accent']};
    border-color: {COLORS['accent']};
}}
QStatusBar {{
    background-color: {COLORS['bg_card']};
    color: {COLORS['text_dim']};
    border-top: 1px solid {COLORS['border']};
    font-size: 12px;
}}
QMenu {{
    background-color: {COLORS['bg_card']};
    color: {COLORS['text']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 4px;
}}
QMenu::item {{
    padding: 6px 24px;
    border-radius: 4px;
}}
QMenu::item:selected {{
    background-color: {COLORS['accent']};
    color: white;
}}
QMenu::separator {{
    height: 1px;
    background-color: {COLORS['border']};
    margin: 4px 8px;
}}
"""


# ---------------------------------------------------------------------------
# Worker Thread
# ---------------------------------------------------------------------------
class ScanWorker(QThread):
    """Збирає дані в окремому потоці."""
    finished = Signal(dict)
    error = Signal(str)
    progress = Signal(str)

    def run(self):
        try:
            self.progress.emit("Збір даних про систему...")
            collector = SystemCollector()
            data = collector.collect_all()
            self.finished.emit(data)
        except Exception as e:
            self.error.emit(str(e))


class SendWorker(QThread):
    """Відправляє звіт на сервер в окремому потоці."""
    finished = Signal(dict)
    error = Signal(str)

    def __init__(self, client: AgentClient, data: dict, parent=None):
        super().__init__(parent)
        self.client = client
        self.data = data

    def run(self):
        try:
            result = self.client.send_report(self.data)
            self.finished.emit(result)
        except Exception as e:
            self.error.emit(str(e))


class AuthWorker(QThread):
    """Аутентифікація в окремому потоці."""
    finished = Signal()
    error = Signal(str)

    def __init__(self, client: AgentClient, parent=None):
        super().__init__(parent)
        self.client = client

    def run(self):
        try:
            self.client.authenticate()
            self.finished.emit()
        except Exception as e:
            self.error.emit(str(e))


# ---------------------------------------------------------------------------
# Tray Icon Generator
# ---------------------------------------------------------------------------
def create_tray_icon(color: str = "#4CAF50") -> QIcon:
    """Створити просту кольорову іконку для трею."""
    pixmap = QPixmap(64, 64)
    pixmap.fill(Qt.transparent)
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.Antialiasing)
    painter.setBrush(QColor(color))
    painter.setPen(Qt.NoPen)
    painter.drawRoundedRect(8, 8, 48, 48, 12, 12)
    # Літера "I" (Inventory)
    painter.setPen(QColor("white"))
    font = QFont("Segoe UI", 28, QFont.Bold)
    painter.setFont(font)
    painter.drawText(pixmap.rect(), Qt.AlignCenter, "I")
    painter.end()
    return QIcon(pixmap)


# ---------------------------------------------------------------------------
# Info Card Widget
# ---------------------------------------------------------------------------
class InfoRow(QWidget):
    """Один рядок: мітка + значення."""

    def __init__(self, label: str, value: str = "—", parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 2, 0, 2)

        self.label_widget = QLabel(label)
        self.label_widget.setProperty("class", "dim")
        self.label_widget.setFixedWidth(160)

        self.value_widget = QLabel(value)
        self.value_widget.setProperty("class", "value")
        self.value_widget.setTextInteractionFlags(Qt.TextSelectableByMouse)
        self.value_widget.setWordWrap(True)

        layout.addWidget(self.label_widget)
        layout.addWidget(self.value_widget, 1)

    def set_value(self, value: str):
        self.value_widget.setText(value or "—")


# ---------------------------------------------------------------------------
# Main Window
# ---------------------------------------------------------------------------
class MainWindow(QMainWindow):

    def __init__(self, start_in_tray: bool = False):
        super().__init__()
        self.setWindowTitle(f"{APP_NAME} v{APP_VERSION}")
        self.setMinimumSize(780, 580)
        self.resize(860, 640)

        self.report_data: dict | None = None
        self.config = load_config()
        self.client: AgentClient | None = None
        self.is_connected = False
        self.auto_scan_timer = QTimer(self)
        self.countdown_timer = QTimer(self)
        self.next_scan_time = 0

        self._build_ui()
        self._build_tray()
        self._load_settings_to_ui()
        self._connect_signals()

        if start_in_tray:
            self.hide()
        else:
            self.show()

        # Автозбір при запуску
        if self._get_setting("auto_scan_on_start", False):
            QTimer.singleShot(500, self.on_scan)

    # ===================== UI BUILD =====================

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(12, 12, 12, 8)

        # Title
        title_row = QHBoxLayout()
        title_label = QLabel(f"  {APP_NAME}")
        title_label.setProperty("class", "title")
        title_row.addWidget(title_label)
        title_row.addStretch()

        self.status_indicator = QLabel("  Не підключено  ")
        self.status_indicator.setStyleSheet(
            f"background-color: {COLORS['bg_input']}; color: {COLORS['text_dim']}; "
            f"border-radius: 10px; padding: 4px 12px; font-size: 12px;"
        )
        title_row.addWidget(self.status_indicator)
        main_layout.addLayout(title_row)

        # Tabs
        self.tabs = QTabWidget()
        self.tabs.addTab(self._build_computer_tab(), "  Комп'ютер  ")
        self.tabs.addTab(self._build_software_tab(), "  Програми  ")
        self.tabs.addTab(self._build_peripherals_tab(), "  Периферія  ")
        self.tabs.addTab(self._build_settings_tab(), "  Налаштування  ")
        self.tabs.addTab(self._build_logs_tab(), "  Логи  ")
        main_layout.addWidget(self.tabs)

        # Status bar
        self.statusBar().showMessage("Готово")

    # --- Tab 1: Computer ---
    def _build_computer_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(8)

        # Identity
        grp_identity = QGroupBox("Ідентифікація")
        grid = QGridLayout(grp_identity)
        grid.setSpacing(4)

        self.info_hostname = InfoRow("Ім'я комп'ютера:")
        self.info_serial = InfoRow("Серійний номер:")
        self.info_manufacturer = InfoRow("Виробник:")
        self.info_model = InfoRow("Модель:")
        self.info_category = InfoRow("Категорія:")

        grid.addWidget(self.info_hostname, 0, 0)
        grid.addWidget(self.info_serial, 1, 0)
        grid.addWidget(self.info_manufacturer, 0, 1)
        grid.addWidget(self.info_model, 1, 1)
        grid.addWidget(self.info_category, 2, 0)

        layout.addWidget(grp_identity)

        # Specs
        grp_specs = QGroupBox("Характеристики")
        grid2 = QGridLayout(grp_specs)
        grid2.setSpacing(4)

        self.info_os = InfoRow("Операційна система:")
        self.info_cpu = InfoRow("Процесор:")
        self.info_ram = InfoRow("Оперативна пам'ять:")
        self.info_storage = InfoRow("Накопичувачі:")
        self.info_gpu = InfoRow("Відеокарта:")

        grid2.addWidget(self.info_os, 0, 0)
        grid2.addWidget(self.info_cpu, 1, 0)
        grid2.addWidget(self.info_ram, 0, 1)
        grid2.addWidget(self.info_gpu, 1, 1)
        grid2.addWidget(self.info_storage, 2, 0, 1, 2)

        layout.addWidget(grp_specs)

        # Network
        grp_net = QGroupBox("Мережа")
        net_layout = QHBoxLayout(grp_net)
        self.info_ip = InfoRow("IP-адреса:")
        self.info_mac = InfoRow("MAC-адреса:")
        net_layout.addWidget(self.info_ip)
        net_layout.addWidget(self.info_mac)
        layout.addWidget(grp_net)

        # Buttons
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(8)

        self.btn_scan = QPushButton("  Сканувати")
        self.btn_scan.setMinimumHeight(40)

        self.btn_send = QPushButton("  Відправити на сервер")
        self.btn_send.setProperty("class", "success")
        self.btn_send.setMinimumHeight(40)
        self.btn_send.setEnabled(False)

        self.btn_save = QPushButton("  Зберегти JSON")
        self.btn_save.setProperty("class", "secondary")
        self.btn_save.setMinimumHeight(40)
        self.btn_save.setEnabled(False)

        btn_layout.addWidget(self.btn_scan)
        btn_layout.addWidget(self.btn_send)
        btn_layout.addWidget(self.btn_save)
        layout.addLayout(btn_layout)

        layout.addStretch()
        return tab

    # --- Tab 2: Software ---
    def _build_software_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Search
        search_row = QHBoxLayout()
        search_row.setSpacing(8)
        self.sw_search = QLineEdit()
        self.sw_search.setPlaceholderText("Пошук програм...")
        self.sw_count = QLabel("0 програм")
        self.sw_count.setProperty("class", "dim")
        search_row.addWidget(self.sw_search, 1)
        search_row.addWidget(self.sw_count)
        layout.addLayout(search_row)

        # Table
        self.sw_table = QTableWidget()
        self.sw_table.setColumnCount(3)
        self.sw_table.setHorizontalHeaderLabels(["Назва", "Версія", "Виробник"])
        self.sw_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.sw_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.sw_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.sw_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.sw_table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.sw_table.setAlternatingRowColors(True)
        self.sw_table.verticalHeader().setVisible(False)
        layout.addWidget(self.sw_table)

        return tab

    # --- Tab 3: Peripherals ---
    def _build_peripherals_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)

        self.periph_count = QLabel("0 пристроїв")
        self.periph_count.setProperty("class", "dim")
        layout.addWidget(self.periph_count)

        self.periph_table = QTableWidget()
        self.periph_table.setColumnCount(3)
        self.periph_table.setHorizontalHeaderLabels(["Назва", "Тип", "Серійний номер"])
        self.periph_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.periph_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.periph_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.periph_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.periph_table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.periph_table.setAlternatingRowColors(True)
        self.periph_table.verticalHeader().setVisible(False)
        layout.addWidget(self.periph_table)

        return tab

    # --- Tab 4: Settings ---
    def _build_settings_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(12)

        # Connection
        grp_conn = QGroupBox("Підключення до сервера")
        conn_grid = QGridLayout(grp_conn)
        conn_grid.setSpacing(8)

        conn_grid.addWidget(QLabel("API URL:"), 0, 0)
        self.set_api_url = QLineEdit()
        self.set_api_url.setPlaceholderText("http://192.168.1.100:8000")
        conn_grid.addWidget(self.set_api_url, 0, 1)

        conn_grid.addWidget(QLabel("Логін:"), 1, 0)
        self.set_username = QLineEdit()
        conn_grid.addWidget(self.set_username, 1, 1)

        conn_grid.addWidget(QLabel("Пароль:"), 2, 0)
        self.set_password = QLineEdit()
        self.set_password.setEchoMode(QLineEdit.Password)
        conn_grid.addWidget(self.set_password, 2, 1)

        conn_grid.addWidget(QLabel("Локація:"), 3, 0)
        self.set_location = QLineEdit()
        self.set_location.setPlaceholderText("Офіс, кімната 101")
        conn_grid.addWidget(self.set_location, 3, 1)

        self.btn_test_conn = QPushButton("Перевірити з'єднання")
        self.btn_test_conn.setProperty("class", "secondary")
        conn_grid.addWidget(self.btn_test_conn, 4, 1)

        layout.addWidget(grp_conn)

        # Scheduler
        grp_sched = QGroupBox("Планувальник")
        sched_layout = QGridLayout(grp_sched)
        sched_layout.setSpacing(8)

        sched_layout.addWidget(QLabel("Інтервал (хвилини):"), 0, 0)
        self.set_interval = QSpinBox()
        self.set_interval.setRange(1, 1440)
        self.set_interval.setValue(60)
        self.set_interval.setSuffix(" хв")
        sched_layout.addWidget(self.set_interval, 0, 1)

        self.chk_auto_scan = QCheckBox("Автозбір при запуску програми")
        sched_layout.addWidget(self.chk_auto_scan, 1, 0, 1, 2)

        self.chk_auto_send = QCheckBox("Автоматично відправляти на сервер")
        self.chk_auto_send.setChecked(True)
        sched_layout.addWidget(self.chk_auto_send, 2, 0, 1, 2)

        layout.addWidget(grp_sched)

        # System
        grp_sys = QGroupBox("Система")
        sys_layout = QVBoxLayout(grp_sys)

        self.chk_autostart = QCheckBox("Автозапуск з Windows")
        sys_layout.addWidget(self.chk_autostart)

        self.chk_start_tray = QCheckBox("Запускати згорнутим у трей")
        sys_layout.addWidget(self.chk_start_tray)

        layout.addWidget(grp_sys)

        # Save button
        btn_row = QHBoxLayout()
        btn_row.addStretch()
        self.btn_save_settings = QPushButton("Зберегти налаштування")
        self.btn_save_settings.setMinimumWidth(200)
        btn_row.addWidget(self.btn_save_settings)
        layout.addLayout(btn_row)

        layout.addStretch()
        return tab

    # --- Tab 5: Logs ---
    def _build_logs_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)

        btn_row = QHBoxLayout()
        btn_row.addStretch()
        self.btn_clear_logs = QPushButton("Очистити")
        self.btn_clear_logs.setProperty("class", "secondary")
        btn_row.addWidget(self.btn_clear_logs)
        layout.addLayout(btn_row)

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        layout.addWidget(self.log_text)

        return tab

    # ===================== TRAY =====================

    def _build_tray(self):
        self.tray_icon_connected = create_tray_icon(COLORS["success"])
        self.tray_icon_disconnected = create_tray_icon(COLORS["text_dim"])

        self.tray = QSystemTrayIcon(self.tray_icon_disconnected, self)

        tray_menu = QMenu()

        action_open = QAction("Відкрити", self)
        action_open.triggered.connect(self._show_window)
        tray_menu.addAction(action_open)

        action_scan = QAction("Сканувати зараз", self)
        action_scan.triggered.connect(self.on_scan_and_send)
        tray_menu.addAction(action_scan)

        tray_menu.addSeparator()

        self.tray_status_action = QAction("Статус: не підключено", self)
        self.tray_status_action.setEnabled(False)
        tray_menu.addAction(self.tray_status_action)

        tray_menu.addSeparator()

        action_quit = QAction("Вийти", self)
        action_quit.triggered.connect(self._quit_app)
        tray_menu.addAction(action_quit)

        self.tray.setContextMenu(tray_menu)
        self.tray.activated.connect(self._on_tray_activated)
        self.tray.setToolTip(APP_NAME)
        self.tray.show()

        # Set window icon
        self.setWindowIcon(create_tray_icon(COLORS["accent"]))

    # ===================== SIGNALS =====================

    def _connect_signals(self):
        self.btn_scan.clicked.connect(self.on_scan)
        self.btn_send.clicked.connect(self.on_send)
        self.btn_save.clicked.connect(self.on_save_json)
        self.btn_test_conn.clicked.connect(self.on_test_connection)
        self.btn_save_settings.clicked.connect(self.on_save_settings)
        self.btn_clear_logs.clicked.connect(self.log_text.clear)
        self.sw_search.textChanged.connect(self._filter_software)

        # Auto-scan timer
        self.auto_scan_timer.timeout.connect(self._on_auto_scan)
        self.countdown_timer.timeout.connect(self._update_countdown)

    # ===================== ACTIONS =====================

    def on_scan(self):
        """Запустити збір даних."""
        self.btn_scan.setEnabled(False)
        self.btn_scan.setText("  Збір даних...")
        self.statusBar().showMessage("Збір даних про систему...")
        self._log("Починаю збір даних...")

        self._scan_worker = ScanWorker()
        self._scan_worker.finished.connect(self._on_scan_finished)
        self._scan_worker.error.connect(self._on_scan_error)
        self._scan_worker.start()

    def _on_scan_finished(self, data: dict):
        self.report_data = data
        self.report_data["location"] = self.set_location.text() or self.config.get("location", "")
        self._update_ui_with_data(data)
        self.btn_scan.setEnabled(True)
        self.btn_scan.setText("  Сканувати")
        self.btn_send.setEnabled(True)
        self.btn_save.setEnabled(True)

        sw_count = len(data.get("installed_software", []))
        per_count = len(data.get("peripherals", []))
        msg = f"Збір завершено — {data.get('hostname', '?')}, ПЗ: {sw_count}, Периферія: {per_count}"
        self.statusBar().showMessage(msg)
        self._log(f"OK: {msg}")

    def _on_scan_error(self, error: str):
        self.btn_scan.setEnabled(True)
        self.btn_scan.setText("  Сканувати")
        self.statusBar().showMessage(f"Помилка збору: {error}")
        self._log(f"ПОМИЛКА збору: {error}")

    def on_send(self):
        """Відправити дані на сервер."""
        if not self.report_data:
            self._log("Немає даних для відправки. Спочатку виконайте збір.")
            return

        api_url = self.set_api_url.text()
        username = self.set_username.text()
        password = self.set_password.text()

        if not all([api_url, username, password]):
            self._log("ПОМИЛКА: Вкажіть API URL, логін та пароль у налаштуваннях.")
            self.tabs.setCurrentIndex(3)
            return

        self.btn_send.setEnabled(False)
        self.btn_send.setText("  Відправка...")
        self.statusBar().showMessage("Відправка звіту на сервер...")
        self._log(f"Відправка на {api_url}...")

        if not self.client or self.client.api_url != api_url.rstrip("/"):
            self.client = AgentClient(api_url, username, password)

        # Auth first, then send
        if not self.client.access_token:
            self._auth_then_send()
        else:
            self._do_send()

    def _auth_then_send(self):
        self._auth_worker = AuthWorker(self.client)
        self._auth_worker.finished.connect(self._do_send)
        self._auth_worker.error.connect(self._on_send_error)
        self._auth_worker.start()

    def _do_send(self):
        self._send_worker = SendWorker(self.client, self.report_data)
        self._send_worker.finished.connect(self._on_send_finished)
        self._send_worker.error.connect(self._on_send_error)
        self._send_worker.start()

    def _on_send_finished(self, result: dict):
        self.btn_send.setEnabled(True)
        self.btn_send.setText("  Відправити на сервер")
        self._set_connected(True)

        action = "Створено" if result.get("created") else "Оновлено"
        eq_id = result.get("equipment_id", "?")
        sw = result.get("software_synced", 0)
        per = result.get("peripherals_synced", 0)
        msg = f"{action} #{eq_id} | ПЗ: {sw} | Периферія: {per}"
        self.statusBar().showMessage(f"Успішно: {msg}")
        self._log(f"УСПІХ: {msg}")

        self.tray.showMessage(
            APP_NAME,
            f"{action} обладнання #{eq_id}",
            QSystemTrayIcon.Information,
            3000,
        )

    def _on_send_error(self, error: str):
        self.btn_send.setEnabled(True)
        self.btn_send.setText("  Відправити на сервер")
        self._set_connected(False)
        self.statusBar().showMessage(f"Помилка відправки: {error}")
        self._log(f"ПОМИЛКА відправки: {error}")

    def on_save_json(self):
        """Зберегти звіт у JSON файл."""
        if not self.report_data:
            return
        default_path = str(Path(__file__).parent / "report.json")
        path, _ = QFileDialog.getSaveFileName(
            self, "Зберегти звіт", default_path, "JSON (*.json)"
        )
        if path:
            Path(path).write_text(
                json.dumps(self.report_data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            self._log(f"Звіт збережено: {path}")
            self.statusBar().showMessage(f"Збережено: {path}")

    def on_scan_and_send(self):
        """Сканувати і одразу відправити (для трея та автозбору)."""
        self.btn_scan.setEnabled(False)
        self.btn_scan.setText("  Збір даних...")
        self.statusBar().showMessage("Автозбір: збір даних...")
        self._log("Автозбір: починаю...")

        self._auto_scan_worker = ScanWorker()
        self._auto_scan_worker.finished.connect(self._on_auto_scan_finished)
        self._auto_scan_worker.error.connect(self._on_scan_error)
        self._auto_scan_worker.start()

    def _on_auto_scan_finished(self, data: dict):
        self._on_scan_finished(data)
        if self.chk_auto_send.isChecked():
            QTimer.singleShot(500, self.on_send)

    def on_test_connection(self):
        """Перевірити з'єднання з сервером."""
        api_url = self.set_api_url.text()
        username = self.set_username.text()
        password = self.set_password.text()

        if not all([api_url, username, password]):
            self._log("Вкажіть API URL, логін та пароль.")
            return

        self.btn_test_conn.setEnabled(False)
        self.btn_test_conn.setText("Перевірка...")
        self._log(f"Перевірка з'єднання з {api_url}...")

        client = AgentClient(api_url, username, password)
        self._test_worker = AuthWorker(client)
        self._test_worker.finished.connect(self._on_test_success)
        self._test_worker.error.connect(self._on_test_error)
        self._test_worker.start()

    def _on_test_success(self):
        self.btn_test_conn.setEnabled(True)
        self.btn_test_conn.setText("Перевірити з'єднання")
        self._set_connected(True)
        self._log("З'єднання успішне!")
        self.statusBar().showMessage("З'єднання з сервером встановлено")

    def _on_test_error(self, error: str):
        self.btn_test_conn.setEnabled(True)
        self.btn_test_conn.setText("Перевірити з'єднання")
        self._set_connected(False)
        self._log(f"ПОМИЛКА з'єднання: {error}")
        self.statusBar().showMessage(f"Помилка з'єднання: {error}")

    def on_save_settings(self):
        """Зберегти налаштування у .env файл."""
        env_path = Path(__file__).parent / ".env"
        lines = [
            f"API_URL={self.set_api_url.text()}",
            f"USERNAME={self.set_username.text()}",
            f"PASSWORD={self.set_password.text()}",
            f"LOCATION={self.set_location.text()}",
            f"INTERVAL={self.set_interval.value() * 60}",
        ]
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        self._log(f"Налаштування збережено: {env_path}")
        self.statusBar().showMessage("Налаштування збережено")

        # Save GUI settings
        self._save_gui_settings()

        # Update autostart
        self._set_autostart(self.chk_autostart.isChecked())

        # Restart auto-scan timer
        self._restart_auto_timer()

        # Reload config
        self.config = load_config()

    # ===================== DATA DISPLAY =====================

    def _update_ui_with_data(self, data: dict):
        """Заповнити всі вкладки даними."""
        # Tab 1: Computer
        self.info_hostname.set_value(data.get("hostname", ""))
        self.info_serial.set_value(data.get("serial_number", ""))
        self.info_manufacturer.set_value(data.get("manufacturer", ""))
        self.info_model.set_value(data.get("model", ""))
        self.info_category.set_value(data.get("category", ""))
        self.info_os.set_value(data.get("operating_system", ""))
        self.info_cpu.set_value(data.get("cpu", ""))
        self.info_ram.set_value(data.get("ram", ""))
        self.info_storage.set_value(data.get("storage", ""))
        self.info_gpu.set_value(data.get("gpu", ""))
        self.info_ip.set_value(data.get("ip_address", ""))
        self.info_mac.set_value(data.get("mac_address", ""))

        # Tab 2: Software
        software = data.get("installed_software", [])
        self._all_software = software
        self._populate_software_table(software)

        # Tab 3: Peripherals
        peripherals = data.get("peripherals", [])
        self.periph_count.setText(f"{len(peripherals)} пристроїв")
        self.periph_table.setRowCount(len(peripherals))
        for i, p in enumerate(peripherals):
            self.periph_table.setItem(i, 0, QTableWidgetItem(p.get("name", "")))
            self.periph_table.setItem(i, 1, QTableWidgetItem(p.get("type", "")))
            self.periph_table.setItem(i, 2, QTableWidgetItem(p.get("serial_number", "")))

    def _populate_software_table(self, software: list):
        self.sw_table.setRowCount(len(software))
        for i, sw in enumerate(software):
            self.sw_table.setItem(i, 0, QTableWidgetItem(sw.get("name", "")))
            self.sw_table.setItem(i, 1, QTableWidgetItem(sw.get("version", "")))
            self.sw_table.setItem(i, 2, QTableWidgetItem(sw.get("vendor", "")))
        self.sw_count.setText(f"{len(software)} програм")

    def _filter_software(self, text: str):
        """Фільтрувати таблицю ПЗ."""
        if not hasattr(self, "_all_software"):
            return
        if not text:
            self._populate_software_table(self._all_software)
            return
        text = text.lower()
        filtered = [
            sw for sw in self._all_software
            if text in sw.get("name", "").lower()
            or text in sw.get("vendor", "").lower()
            or text in sw.get("version", "").lower()
        ]
        self._populate_software_table(filtered)

    # ===================== STATUS =====================

    def _set_connected(self, connected: bool):
        self.is_connected = connected
        if connected:
            self.status_indicator.setText("  Підключено  ")
            self.status_indicator.setStyleSheet(
                f"background-color: {COLORS['success']}; color: white; "
                f"border-radius: 10px; padding: 4px 12px; font-size: 12px; font-weight: bold;"
            )
            self.tray.setIcon(self.tray_icon_connected)
            self.tray_status_action.setText("Статус: підключено")
        else:
            self.status_indicator.setText("  Не підключено  ")
            self.status_indicator.setStyleSheet(
                f"background-color: {COLORS['bg_input']}; color: {COLORS['text_dim']}; "
                f"border-radius: 10px; padding: 4px 12px; font-size: 12px;"
            )
            self.tray.setIcon(self.tray_icon_disconnected)
            self.tray_status_action.setText("Статус: не підключено")

    # ===================== LOGGING =====================

    def _log(self, message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.append(f"[{timestamp}] {message}")

    # ===================== SETTINGS PERSISTENCE =====================

    def _settings_path(self) -> Path:
        return Path(__file__).parent / "gui_settings.json"

    def _load_settings_to_ui(self):
        """Завантажити .env та GUI налаштування в поля."""
        self.set_api_url.setText(self.config.get("api_url", ""))
        self.set_username.setText(self.config.get("username", ""))
        self.set_password.setText(self.config.get("password", ""))
        self.set_location.setText(self.config.get("location", ""))
        self.set_interval.setValue(self.config.get("interval", 3600) // 60)

        # GUI-specific settings
        gui = self._load_gui_settings()
        self.chk_autostart.setChecked(gui.get("autostart", False))
        self.chk_start_tray.setChecked(gui.get("start_tray", False))
        self.chk_auto_scan.setChecked(gui.get("auto_scan_on_start", False))
        self.chk_auto_send.setChecked(gui.get("auto_send", True))

    def _load_gui_settings(self) -> dict:
        path = self._settings_path()
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {}

    def _save_gui_settings(self):
        data = {
            "autostart": self.chk_autostart.isChecked(),
            "start_tray": self.chk_start_tray.isChecked(),
            "auto_scan_on_start": self.chk_auto_scan.isChecked(),
            "auto_send": self.chk_auto_send.isChecked(),
        }
        self._settings_path().write_text(
            json.dumps(data, indent=2), encoding="utf-8"
        )

    def _get_setting(self, key: str, default=None):
        gui = self._load_gui_settings()
        return gui.get(key, default)

    # ===================== AUTOSTART =====================

    def _set_autostart(self, enable: bool):
        """Додати/прибрати з автозапуску Windows."""
        if platform.system() != "Windows":
            return
        try:
            import winreg
            key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
            if enable:
                exe = sys.executable.replace("python.exe", "pythonw.exe")
                script = str(Path(__file__).resolve())
                winreg.SetValueEx(key, "ITInventoryAgent", 0, winreg.REG_SZ,
                                  f'"{exe}" "{script}" --tray')
                self._log("Автозапуск з Windows: увімкнено")
            else:
                try:
                    winreg.DeleteValue(key, "ITInventoryAgent")
                    self._log("Автозапуск з Windows: вимкнено")
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
        except Exception as e:
            self._log(f"Помилка автозапуску: {e}")

    # ===================== AUTO-SCAN TIMER =====================

    def _restart_auto_timer(self):
        interval_ms = self.set_interval.value() * 60 * 1000
        self.auto_scan_timer.start(interval_ms)
        self.next_scan_time = time.time() + (interval_ms / 1000)
        self.countdown_timer.start(1000)
        self._log(f"Автозбір кожні {self.set_interval.value()} хв")

    def _on_auto_scan(self):
        """Автоматичний збір + відправка."""
        self._log("Автозбір за таймером...")
        self.next_scan_time = time.time() + (self.set_interval.value() * 60)
        self.on_scan_and_send()

    def _update_countdown(self):
        if self.next_scan_time <= 0:
            return
        remaining = max(0, int(self.next_scan_time - time.time()))
        h, remainder = divmod(remaining, 3600)
        m, s = divmod(remainder, 60)
        self.statusBar().showMessage(
            f"Наступний збір через: {h:02d}:{m:02d}:{s:02d}"
        )

    # ===================== WINDOW MANAGEMENT =====================

    def closeEvent(self, event):
        """Згортати в трей при закритті вікна."""
        event.ignore()
        self.hide()
        self.tray.showMessage(
            APP_NAME,
            "Програма працює у фоновому режимі",
            QSystemTrayIcon.Information,
            2000,
        )

    def _show_window(self):
        self.showNormal()
        self.activateWindow()
        self.raise_()

    def _on_tray_activated(self, reason):
        if reason == QSystemTrayIcon.DoubleClick:
            self._show_window()

    def _quit_app(self):
        self.tray.hide()
        QApplication.quit()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description=f"{APP_NAME} GUI")
    parser.add_argument("--tray", action="store_true", help="Запустити згорнутим у трей")
    args = parser.parse_args()

    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setStyleSheet(STYLESHEET)

    # Dark palette
    palette = QPalette()
    palette.setColor(QPalette.Window, QColor(COLORS["bg"]))
    palette.setColor(QPalette.WindowText, QColor(COLORS["text"]))
    palette.setColor(QPalette.Base, QColor(COLORS["bg_input"]))
    palette.setColor(QPalette.AlternateBase, QColor(COLORS["bg_card"]))
    palette.setColor(QPalette.Text, QColor(COLORS["text"]))
    palette.setColor(QPalette.Button, QColor(COLORS["bg_card"]))
    palette.setColor(QPalette.ButtonText, QColor(COLORS["text"]))
    palette.setColor(QPalette.Highlight, QColor(COLORS["accent"]))
    palette.setColor(QPalette.HighlightedText, QColor("white"))
    app.setPalette(palette)

    start_tray = args.tray
    if not start_tray:
        # Check GUI settings
        settings_path = Path(__file__).parent / "gui_settings.json"
        if settings_path.exists():
            try:
                gui = json.loads(settings_path.read_text(encoding="utf-8"))
                # Only use start_tray from settings if --tray was not explicitly given
            except Exception:
                pass

    window = MainWindow(start_in_tray=start_tray)
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
