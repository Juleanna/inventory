# test_enhanced_agent.py - Тестовий скрипт для покращеного агента
import sys
import json
import logging
from pathlib import Path

# Налаштування логування для тесту
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_system_collector():
    """Тестування збору системної інформації"""
    try:
        from enhanced_agent import EnhancedSystemCollector
        
        logger.info("🔍 Тестування EnhancedSystemCollector...")
        collector = EnhancedSystemCollector()
        
        # Тест збору CPU інформації
        logger.info("📊 Тестування збору CPU інформації...")
        cpu_info = collector.get_detailed_cpu_info()
        logger.info(f"✅ CPU: {cpu_info.get('name', 'Unknown')}")
        logger.info(f"   Ядра: {cpu_info.get('cores_physical', 0)} фізичних, {cpu_info.get('cores_logical', 0)} логічних")
        
        # Тест збору пам'яті
        logger.info("💾 Тестування збору інформації про пам'ять...")
        memory_info = collector.get_detailed_memory_info()
        total_gb = memory_info.get('total', 0) / (1024**3)
        logger.info(f"✅ RAM: {total_gb:.1f} GB, модулів: {len(memory_info.get('modules', []))}")
        
        # Тест збору дисків
        logger.info("💿 Тестування збору інформації про диски...")
        disk_info = collector.get_detailed_disk_info()
        partitions = disk_info.get('partitions', [])
        logger.info(f"✅ Диски: {len(partitions)} розділів")
        
        # Тест збору GPU
        logger.info("🎮 Тестування збору інформації про GPU...")
        gpu_info = collector.get_detailed_gpu_info()
        logger.info(f"✅ GPU: {len(gpu_info)} відеокарт")
        
        # Тест збору мережі
        logger.info("🌐 Тестування збору мережевої інформації...")
        network_info = collector.get_network_adapters()
        logger.info(f"✅ Мережа: {len(network_info)} адаптерів")
        
        # Тест збору ПЗ
        logger.info("📦 Тестування збору встановленого ПЗ...")
        software_info = collector.get_installed_programs()
        logger.info(f"✅ ПЗ: {len(software_info)} програм")
        
        # Тест збору метрик продуктивності
        logger.info("📈 Тестування збору метрик продуктивності...")
        performance_info = collector.get_system_performance_metrics()
        cpu_percent = performance_info.get('cpu', {}).get('percent_total', 0)
        memory_percent = performance_info.get('memory', {}).get('percent', 0)
        logger.info(f"✅ Продуктивність: CPU {cpu_percent}%, RAM {memory_percent}%")
        
        return True
        
    except ImportError as e:
        logger.error(f"❌ Помилка імпорту: {e}")
        logger.error("   Встановіть залежності: pip install -r requirements_enhanced.txt")
        return False
    except Exception as e:
        logger.error(f"❌ Помилка тестування збирача: {e}")
        return False

def test_agent_initialization():
    """Тестування ініціалізації агента"""
    try:
        from enhanced_agent import EnhancedInventoryAgent
        
        logger.info("🤖 Тестування ініціалізації агента...")
        agent = EnhancedInventoryAgent()
        
        # Перевірити створення локальної БД
        if agent.local_db_file.exists():
            logger.info("✅ Локальна база даних створена")
        else:
            logger.warning("⚠️ Локальна база даних не створена")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Помилка ініціалізації агента: {e}")
        return False

def test_data_collection():
    """Тестування збору даних"""
    try:
        from enhanced_agent import EnhancedInventoryAgent
        
        logger.info("📊 Тестування комплексного збору даних...")
        agent = EnhancedInventoryAgent()
        
        # Збір даних (без відправки на сервер)
        data = agent.collect_comprehensive_data()
        
        # Перевірка основних полів
        required_fields = [
            'name', 'hostname', 'category', 'serial_number',
            'cpu_info', 'memory_info', 'disk_info', 'operating_system'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
        
        if missing_fields:
            logger.warning(f"⚠️ Відсутні поля: {missing_fields}")
        else:
            logger.info("✅ Всі обов'язкові поля присутні")
        
        # Статистика зібраних даних
        logger.info(f"   Ім'я комп'ютера: {data.get('name', 'Unknown')}")
        logger.info(f"   Категорія: {data.get('category', 'Unknown')}")
        logger.info(f"   ОС: {data.get('operating_system', 'Unknown')}")
        logger.info(f"   Час збору: {data.get('collection_duration', 0):.2f} сек")
        
        # Збереження тестових даних
        test_file = Path("test_collected_data.json")
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str, ensure_ascii=False)
        logger.info(f"✅ Тестові дані збережено в {test_file}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Помилка збору даних: {e}")
        return False

def test_configuration():
    """Тестування конфігурації"""
    try:
        logger.info("⚙️ Тестування конфігурації...")
        
        # Перевірка файлів конфігурації
        config_example = Path(".env.enhanced.example")
        config_file = Path(".env.enhanced")
        
        if config_example.exists():
            logger.info("✅ Файл прикладу конфігурації знайдено")
        else:
            logger.warning("⚠️ Файл .env.enhanced.example відсутній")
        
        if config_file.exists():
            logger.info("✅ Файл конфігурації знайдено")
        else:
            logger.warning("⚠️ Файл .env.enhanced відсутній - створіть з прикладу")
        
        # Перевірка залежностей
        requirements_file = Path("requirements_enhanced.txt")
        if requirements_file.exists():
            logger.info("✅ Файл залежностей знайдено")
        else:
            logger.warning("⚠️ Файл requirements_enhanced.txt відсутній")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Помилка перевірки конфігурації: {e}")
        return False

def test_dependencies():
    """Тестування залежностей"""
    logger.info("📦 Перевірка залежностей...")
    
    required_modules = [
        ('psutil', 'Системна інформація'),
        ('requests', 'HTTP запити'),
        ('aiohttp', 'Асинхронні HTTP запити'),
        ('tenacity', 'Повторні спроби'),
        ('decouple', 'Конфігурація'),
    ]
    
    optional_modules = [
        ('wmi', 'Windows Management Instrumentation'),
        ('GPUtil', 'GPU інформація'),
        ('cpuinfo', 'CPU інформація'),
        ('winreg', 'Windows Registry'),
    ]
    
    all_good = True
    
    # Обов'язкові модулі
    for module, description in required_modules:
        try:
            __import__(module)
            logger.info(f"✅ {module}: {description}")
        except ImportError:
            logger.error(f"❌ {module}: {description} - НЕ ВСТАНОВЛЕНО")
            all_good = False
    
    # Опціональні модулі
    for module, description in optional_modules:
        try:
            __import__(module)
            logger.info(f"✅ {module}: {description}")
        except ImportError:
            logger.warning(f"⚠️ {module}: {description} - не встановлено (опціонально)")
    
    return all_good

def main():
    """Головна функція тестування"""
    logger.info("🚀 Запуск тестування покращеного агента...")
    logger.info("=" * 50)
    
    tests = [
        ("Залежності", test_dependencies),
        ("Конфігурація", test_configuration),
        ("Ініціалізація агента", test_agent_initialization),
        ("Збирач системної інформації", test_system_collector),
        ("Збір даних", test_data_collection),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
            
            if result:
                logger.info(f"✅ {test_name}: УСПІШНО")
            else:
                logger.error(f"❌ {test_name}: ПОМИЛКА")
                
        except Exception as e:
            logger.error(f"❌ {test_name}: КРИТИЧНА ПОМИЛКА - {e}")
            results.append((test_name, False))
    
    # Підсумок
    logger.info(f"\n{'='*20} ПІДСУМОК {'='*20}")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ ПРОЙДЕНО" if result else "❌ ПРОВАЛЕНО"
        logger.info(f"{test_name}: {status}")
    
    logger.info(f"\nРезультат: {passed}/{total} тестів пройдено")
    
    if passed == total:
        logger.info("🎉 Всі тести пройдено! Агент готовий до використання.")
        return 0
    else:
        logger.error("⚠️ Деякі тести провалились. Перевірте помилки вище.")
        return 1

if __name__ == "__main__":
    sys.exit(main())