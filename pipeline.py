import asyncio
import os
from datetime import datetime, timedelta, timezone
from telethon import TelegramClient
from telethon.tl.functions.messages import GetHistoryRequest
from telethon.tl.types import PeerChannel
from dotenv import load_dotenv
import fasttext
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

# Загрузка переменных окружения
load_dotenv()


import logging


# Конфигурация
API_ID = int(os.getenv('TELEGRAM_API_ID'))
API_HASH = os.getenv('TELEGRAM_API_HASH')
CHANNELS = ['bbcrussian', 'kontext_channel']

# Период для парсинга (с часовым поясом UTC)
START_DATE = datetime(2025, 4, 23, 0, 0, 0, tzinfo=timezone.utc)  # 00:00:00
END_DATE = datetime(2025, 4, 24, 23, 59, 59, tzinfo=timezone.utc)  # 23:59:59

# MongoDB конфигурация
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/news_db')
DB_NAME = 'news_db'
COLLECTION_NAME = 'news'

# Загрузка моделей FastText
CATEGORY_MODEL_PATH = 'model/fasttext_category_model.bin'
SENTIMENT_MODEL_PATH = 'model/fasttext_model.bin'

def get_title_and_text(text):
    # Разделяем текст по переносам строк
    lines = text.split('\n')
    title = None
    remaining_lines = []
    
    # Находим первую непустую строку как заголовок
    for i, line in enumerate(lines):
        if line.strip():  # Если строка не пустая
            title = line.strip()
            # Оставляем все строки после заголовка
            remaining_lines = lines[i+1:]
            break
    
    # Если заголовок не найден, используем первые 100 символов
    if title is None:
        title = text[:100]
        remaining_text = text[100:]
    else:
        remaining_text = '\n'.join(remaining_lines).strip()
    
    return title, remaining_text

async def get_channel_messages(client, channel_username, category_model, sentiment_model, collection):
    print(f"Получение сообщений из канала {channel_username}...")
    
    try:
        channel = await client.get_entity(channel_username)
        processed_count = 0
        added_count = 0
        
        offset_date = END_DATE
        limit = 100
        
        while True:
            history = await client(GetHistoryRequest(
                peer=channel,
                offset_id=0,
                offset_date=offset_date,
                add_offset=0,
                limit=limit,
                max_id=0,
                min_id=0,
                hash=0
            ))
            
            if not history.messages:
                break
            
            messages = history.messages
            for message in messages:
                message_date = message.date
                
                # Проверяем, входит ли сообщение в нужный период
                if message_date < START_DATE:
                    return processed_count, added_count
                
                if message.message:  # Проверяем, есть ли текст в сообщении
                    message_url = f"https://t.me/{channel_username}/{message.id}"
                    
                    # Получаем заголовок и текст без заголовка
                    title, text = get_title_and_text(message.message)
                    
                    # Подготовка текста для классификации (удаляем переносы строк)
                    text_for_classification = text.replace('\n', ' ').strip()
                    
                    # Классификация текста
                    try:
                        category = category_model.predict(text_for_classification)[0][0].replace('__label__', '').replace('_', ' ')
                        sentiment = sentiment_model.predict(text_for_classification)[0][0].replace('__label__', '').replace('_', ' ')
                    except Exception as e:
                        print(f"Ошибка классификации текста: {e}")
                        continue 
                    
                    # Подготовка документа для MongoDB
                    news_doc = {
                        'title': title,
                        'text': text,
                        'category': category,  # Категория с пробелами вместо подчеркиваний
                        'tone': sentiment,
                        'url': message_url,
                        'date': message_date
                    }
                    
                    try:
                        # Вставка в MongoDB с проверкой на дубликаты
                        collection.insert_one(news_doc)
                        added_count += 1
                    except DuplicateKeyError:
                        continue
                    
                    processed_count += 1
            
            print(f"Обработано: {processed_count}, Добавлено: {added_count}")
            
            if len(messages) < limit:
                break
            
            # Устанавливаем дату для следующего запроса
            offset_date = messages[-1].date - timedelta(seconds=1)
            
            # Добавляем задержку, чтобы не перегружать API
            await asyncio.sleep(1)
        
        return processed_count, added_count
    
    except Exception as e:
        print(f"Ошибка при обработке канала {channel_username}: {str(e)}")
        return 0, 0

async def run_pipeline():
    print("Запуск пайплайна...")

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    logger.info("Запуск пайплайна...")
    logger.error(f"Ошибка: {e}")

    print(f"Период парсинга: с {START_DATE.strftime('%Y-%m-%d %H:%M:%S')} по {END_DATE.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Загрузка моделей FastText
    print("Загрузка моделей классификации...")
    category_model = fasttext.load_model(CATEGORY_MODEL_PATH)
    sentiment_model = fasttext.load_model(SENTIMENT_MODEL_PATH)

    if not os.path.exists(CATEGORY_MODEL_PATH):
        raise FileNotFoundError(f"Модель категории не найдена по пути {CATEGORY_MODEL_PATH}")
    
    if not os.path.exists(SENTIMENT_MODEL_PATH):
        raise FileNotFoundError(f"Модель тональности не найдена по пути {SENTIMENT_MODEL_PATH}")
    
    # Подключение к MongoDB
    print("Подключение к MongoDB...")
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Создание индекса для предотвращения дубликатов
    collection.create_index([('url', 1)], unique=True)
    
    # Создание клиента Telegram
    client = TelegramClient('telegram_parser', API_ID, API_HASH)
    
    try:
        await client.start()
        print("Успешно подключились к Telegram")
        
        total_processed = 0
        total_added = 0
        
        for channel in CHANNELS:
            processed, added = await get_channel_messages(
                client, channel, category_model, sentiment_model, collection
            )
            total_processed += processed
            total_added += added
            await asyncio.sleep(2)
        
        print(f"\nИтоги:")
        print(f"Всего обработано новостей: {total_processed}")
        print(f"Добавлено новых новостей: {total_added}")
        
    except Exception as e:
        print(f"Ошибка в пайплайне: {str(e)}")

    except asyncio.CancelledError:
        print("Пайплайн был остановлен пользователем")
        await client.disconnect()
        mongo_client.close()
        raise
    
    finally:
        await client.disconnect()
        mongo_client.close()
        print("Пайплайн завершил работу")

if __name__ == '__main__':
    asyncio.run(run_pipeline()) 

