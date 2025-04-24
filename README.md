# News Pipeline

Пайплайн для сбора, классификации и хранения новостей из Telegram-каналов.

## Функциональность

- Парсинг новостей из Telegram-каналов
- Классификация текста по категориям и тональности с помощью FastText
- Сохранение данных в MongoDB
- Предотвращение дубликатов новостей
- Веб-интерфейс для просмотра и фильтрации новостей

## Требования

- Python 3.8+
- Node.js (для веб-интерфейса)
- MongoDB (локально или в Docker)
- Telegram API credentials

## Установка

1. Установите зависимости Python:
```bash
pip install -r requirements.txt
```

2. Установите зависимости Node.js:
```bash
npm install
```

3. Создайте файл `.env` с необходимыми переменными окружения:
```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
MONGODB_URI=mongodb://<host>:<port>/<db_name>
```

4. Убедитесь, что модели FastText находятся в директории `model/`:
- `model/fasttext_category_model.bin`
- `model/fasttext_model.bin`

## Запуск

1. Запустите MongoDB (если используется Docker):
```bash
docker-compose up -d
```

2. Запустите пайплайн для парсинга новостей:
```bash
python pipeline.py
```

3. Запустите веб-сервер:
```bash
npm start
```

## Структура проекта

```
.
├── pipeline.py          # Основной пайплайн для парсинга и классификации
├── model/              # Модели FastText
│   ├── fasttext_category_model.bin
│   └── fasttext_model.bin
├── public/             # Статические файлы веб-интерфейса
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── server.js          # Серверная часть
├── requirements.txt   # Python зависимости
├── package.json      # Node.js зависимости
└── README.md         # Документация
```

## Просмотр данных в MongoDB

1. Подключитесь к MongoDB:
```bash
docker exec -it <container_id> mongosh
```

2. Используйте команды:
```bash
use news_db
db.news.find().limit(5)  # Показать первые 5 документов
db.news.countDocuments() # Посчитать количество документов
```

## Настройка

- Период парсинга настраивается в `pipeline.py`:
```python
START_DATE = datetime(2025, 4, 23, 0, 0, 0, tzinfo=timezone.utc)  # 00:00:00
END_DATE = datetime(2025, 4, 24, 23, 59, 59, tzinfo=timezone.utc)  # 23:59:59
```

- Каналы для парсинга настраиваются в `pipeline.py`:
```python
CHANNELS = ['bbcrussian', 'kontext_channel']
```

## Формат данных

### Новость
```json
{
  "title": "Заголовок новости",
  "text": "Текст новости",
  "url": "URL источника",
  "date": "2024-03-20T12:00:00Z",
  "category": "категория",
  "tone": "тональность"
}
```

## Классификация

Приложение использует две модели FastText:
1. Классификация по категориям (категории с пробелами вместо подчеркиваний)
2. Определение тональности (позитивная, нейтральная, негативная)

## Веб-интерфейс

- Фильтрация новостей по категориям и тональности
- Адаптивный дизайн
- Анимации и плавные переходы
- Модальное окно для просмотра полного текста новости

## Лицензия

MIT 