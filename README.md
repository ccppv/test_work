# Business Dashboard — Портфельный дашборд

Веб-дашборд для анализа бизнес-метрик портфельной компании за 12 месяцев.  
Показывает ключевые KPI, графики динамики, автоматически обнаруживает аномалии и генерирует управленческий анализ через **Claude** (Anthropic) или **Gemini** (Google).

---

## Быстрый старт (локально, только фронтенд)

```bash
git clone https://github.com/ccppv/test_work.git
cd test_work
npm install

cp .env.example .env.local
# Отредактируйте .env.local — вставьте ключи (см. раздел ниже)

npm run dev
# → http://localhost:3001
```

> Данные берутся из `public/data/metrics.csv`. Если `BACKEND_URL` не задан — фронтенд читает CSV напрямую через серверный Route Handler.

---

## Запуск полного стека через Docker Compose

```bash
cp .env.docker.example .env.docker
# Вставьте API-ключи в .env.docker

docker compose up --build
# → http://localhost:3001
```

При старте контейнер `backend` автоматически:
1. Запускает `alembic upgrade head` — применяет миграции к PostgreSQL
2. Запускает `python -m scripts.seed` — загружает данные из `metrics.csv` в БД
3. Поднимает `uvicorn` на порту `8000`

Порядок запуска управляется `healthcheck`-ами: `postgres` → `backend (healthy)` → `frontend`.

---

## Как добавить API-ключи

### Claude (Anthropic)
Получить на [https://console.anthropic.com](https://console.anthropic.com)

```dotenv
# .env.local  (для локального запуска без Docker)
ANTHROPIC_API_KEY=sk-ant-...
```

### Gemini (Google)
Получить на [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

```dotenv
GEMINI_API_KEY=AIza...
```

**На Vercel:** Settings → Environment Variables → добавить `ANTHROPIC_API_KEY` и `GEMINI_API_KEY`.

> Оба ключа используются **только на сервере** в `/api/insight` — во frontend-бандл не попадают. Переключить провайдера можно кнопками прямо в блоке анализа.

---

## Стек

### Frontend

| Технология | Версия | Назначение |
|---|---|---|
| **Next.js** | 16.2.4 | Framework, App Router, серверные Route Handlers |
| **React** | 19.2.4 | UI-библиотека |
| **TypeScript** | 5.x | Строгая типизация |
| **Tailwind CSS** | 3.4.19 | Утилитарные стили, тёмная тема |
| **Recharts** | 3.x | Декларативные графики (AreaChart, ComposedChart) |
| **Papa Parse** | 5.x | Парсинг CSV на сервере (fallback без backend) |
| **Anthropic SDK** | 0.92 | Вызов Claude API (`claude-3-5-sonnet-20241022`) |
| **@google/generative-ai** | 0.24 | Вызов Gemini API (`gemini-2.5-flash`) |
| **Lucide React** | 1.14 | Иконки |

> Next.js запускается с флагом `--webpack` (`npm run dev`) из-за несовместимости Turbopack с нативными бинарниками на Apple Silicon (ARM).

### Backend

| Технология | Версия | Назначение |
|---|---|---|
| **Python** | 3.12 | Рантайм |
| **FastAPI** | 0.115+ | REST API, автодокументация OpenAPI (`/docs`) |
| **Uvicorn** | 0.34+ | ASGI-сервер |
| **SQLAlchemy** | 2.x (async) | ORM с поддержкой `async/await`, `mapped_column` |
| **asyncpg** | 0.30+ | Асинхронный драйвер PostgreSQL |
| **Alembic** | 1.14+ | Версионированные миграции схемы БД |
| **Pydantic v2** | 2.x | Валидация входящих данных, схемы (`BaseModel`) |
| **pydantic-settings** | 2.x | Загрузка конфигурации из `.env` в `Settings` |
| **slowapi** | 0.1.9+ | Rate limiting (5 запросов/минуту на IP) |
| **Anthropic SDK** | 0.92+ | Вызов Claude API (дублируется для backend-режима) |
| **google-generativeai** | 0.8+ | Вызов Gemini API |
| **httpx** | 0.28+ | HTTP-клиент для внутренних запросов |

### База данных

| Технология | Назначение |
|---|---|
| **PostgreSQL 16** | Основная БД (метрики + лог AI-запросов) |
| **Alembic миграции** | `0001_initial` — создаёт таблицы `metric_entries` + `insight_logs`; `0002_unique_month_order` — добавляет `UNIQUE` constraint на `month_order` |

**Таблицы:**
- `metric_entries` — данные из CSV (12 строк): `month`, `month_order`, `revenue`, `new_clients`, `ltv`, `churn`, `margin`, `cac`
- `insight_logs` — лог каждого обращения к AI: провайдер, модель, период, текст ответа, `latency_ms`

### Инфраструктура

| Технология | Назначение |
|---|---|
| **Docker** | Контейнеризация backend и frontend |
| **Docker Compose** | Оркестрация трёх сервисов: `postgres` → `backend` → `frontend` |
| **Ruff** | Python linter + formatter (заменяет flake8 + black + isort) |
| **pytest + pytest-asyncio** | 31 тест backend (SQLite in-memory, изолированные) |
| **aiosqlite** | Асинхронный SQLite — используется только в тестах |

---

## Структура проекта

```
business-dashboard/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Главная страница (KPI, фильтр, графики)
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── metrics/route.ts    # GET /api/metrics — прокси или CSV fallback
│       └── insight/route.ts    # POST /api/insight — вызов Claude/Gemini
├── components/
│   ├── KPICard.tsx             # Карточка метрики с дельтой
│   ├── RevenueChart.tsx        # AreaChart выручки
│   ├── MarginCACChart.tsx      # Маржа + Отток + CAC
│   ├── ClientsLTVChart.tsx     # Новые клиенты + LTV
│   ├── AnomalyBadge.tsx        # Автодетекция аномалий
│   └── AIInsightBlock.tsx      # Блок генерации анализа
├── lib/
│   ├── types.ts                # Интерфейсы MetricRow, InsightRequest
│   └── parseMetrics.ts         # Обёртка над fetch /api/metrics
├── public/data/metrics.csv     # Источник данных
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, rate limiter
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic-settings)
│   │   │   └── limiter.py      # slowapi limiter instance
│   │   ├── db/
│   │   │   ├── base.py         # DeclarativeBase
│   │   │   └── session.py      # AsyncEngine, get_db dependency
│   │   ├── models/
│   │   │   ├── metric.py       # MetricEntry ORM
│   │   │   └── insight_log.py  # InsightLog ORM
│   │   ├── schemas/
│   │   │   ├── metric.py       # MetricRowSchema, MetricsResponse
│   │   │   └── insight.py      # InsightRequest, InsightResponse
│   │   ├── services/
│   │   │   ├── metrics_service.py  # get_all_metrics, get_metrics_by_period
│   │   │   └── insight_service.py  # generate_insight, _call_claude, _call_gemini
│   │   └── api/v1/
│   │       ├── router.py
│   │       ├── metrics.py      # GET /api/v1/metrics
│   │       └── insight.py      # POST /api/v1/insight
│   ├── alembic/
│   │   ├── env.py              # Async Alembic env
│   │   └── versions/
│   │       ├── 0001_initial.py
│   │       └── 0002_unique_month_order.py
│   ├── scripts/seed.py         # Загрузка CSV → PostgreSQL
│   ├── tests/                  # 31 тест (pytest-asyncio, SQLite in-memory)
│   ├── Dockerfile              # python:3.12-slim, non-root user
│   └── pyproject.toml          # pytest config, coverage
│
├── Dockerfile.frontend         # node:20-alpine, standalone output, non-root user
├── docker-compose.yml          # postgres + backend + frontend с healthcheck
├── .env.example                # Шаблон для .env.local
└── .env.docker.example         # Шаблон для Docker-окружения
```

---

## Продуктовые решения

### Какие метрики выбраны и почему

- **Выручка** — основной показатель роста
- **Новые клиенты** — опережающий индикатор (рост сейчас → выручка потом)
- **Маржа** — эффективность: выручка без маржи не имеет смысла
- **CAC** (стоимость привлечения) — сигнал перегрева маркетинга
- **LTV** — долгосрочная ценность клиента; падение вместе с ростом CAC = тревога
- **Отток** — если растёт одновременно с ростом выручки, рост иллюзорный

### Визуализации

| Блок | Что показывает |
|---|---|
| 4 KPI-карточки | Значение за последний месяц периода + дельта к первому месяцу |
| Area Chart (выручка) | Тренд роста/падения с градиентной заливкой |
| Composed Chart (маржа, CAC, отток) | Три тревожных метрики вместе — видно корреляции |
| Composed Chart (клиенты, LTV) | Сопоставление притока клиентов с их ценностью |
| Блок аномалий | Автодетекция: CAC +20%, маржа −3 п.п., отток +1 п.п., LTV −5%, выручка −5% |
| Блок анализа | Генерация управленческого вывода через Claude или Gemini |

### Фильтр по периоду

Клик по месяцу сдвигает ближайшую границу диапазона. Все графики и KPI пересчитываются мгновенно — без запросов к серверу.

---

## Логика AI-анализа

**Frontend** (standalone режим): `app/api/insight/route.ts`  
**Backend** (Docker режим): `backend/app/services/insight_service.py`

Клиент отправляет `POST /api/insight` с данными за выбранный период. Сервер форматирует их в текстовую таблицу с конкретными числами и передаёт в модель.

**Пример подготовленных данных для модели:**
```
Данные за период (Январь – Март):
Январь: выручка 3.20 млн руб, новые клиенты 180, LTV 52 000 руб, отток 5.2%, маржа 38%, CAC 9 200 руб
Февраль: выручка 3.35 млн руб, новые клиенты 188, LTV 52 500 руб, отток 5.0%, маржа 39%, CAC 9 100 руб
Март: выручка 3.48 млн руб, новые клиенты 195, LTV 51 800 руб, отток 5.4%, маржа 37%, CAC 9 600 руб
```

### Системный промпт

```
Ты — финансовый аналитик портфельной компании.
Тебе предоставлены бизнес-метрики за выбранный период.

Твоя задача:
1. Выдели 3–5 ключевых наблюдений, опираясь ТОЛЬКО на конкретные цифры из таблицы
2. Укажи тревожные сигналы: рост оттока, падение маржи, рост CAC, снижение LTV
3. Отметь позитивную динамику там, где она есть
4. Сформулируй 1–2 конкретных вопроса, которые стоит проверить в первую очередь

Требования к ответу:
- Короткие пункты с конкретными цифрами — без воды и общих фраз
- Не выдумывай факты, которых нет в данных
- Если данных недостаточно для уверенного вывода — так и напиши
- Ответ на русском языке
```

**Почему промпт устроен именно так:**

1. **Роль аналитика** — задаёт контекст и снижает вероятность общих фраз
2. **«ТОЛЬКО на конкретные цифры»** — явный запрет на галлюцинации
3. **Структура из 4 пунктов** — гарантирует управленческий формат ответа (проблемы + позитив + следующий шаг)
4. **«Если данных недостаточно — напиши»** — модель не должна додумывать при коротком периоде
5. **Данные передаются в user-message** в виде таблицы с числами — модель работает с фактами, а не с метаданными

### Безопасность API-ключей

- Ключи хранятся в `.env.local` / `.env.docker` — в `.gitignore`
- Вызов AI происходит **только на сервере** (Next.js Route Handler / FastAPI)
- Rate limiter: **5 запросов в минуту** на IP (независимо реализован на обоих уровнях)
- Размер тела запроса ограничен **32 KB**
- Список провайдеров — белый список (`Literal["claude", "gemini"]` / `ALLOWED_PROVIDERS`)

---

## Тесты

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```

**31 тест** охватывают:
- `test_api_metrics.py` (7) — эндпоинт `/api/v1/metrics`: пустая БД, заполненная, порядок
- `test_api_insight.py` (11) — Claude, Gemini, частичный период, логирование в БД, ошибки провайдера, rate limit, невалидный период
- `test_services.py` (13) — `generate_insight`, `_build_table`, `_call_claude`/`_call_gemini` (мок), запись в `InsightLog`

Каждый тест получает **изолированную SQLite in-memory БД** (function-scope fixture). Rate limiter сбрасывается перед каждым тестом.

---

## Что можно добавить в следующей версии

- **AI-чат по данным** — диалог с контекстом всего периода: «почему CAC вырос в мае?»
- **Сравнение двух периодов** — бок о бок: «Q1 vs Q2»
- **Экспорт в PDF** — инсайт + графики одной кнопкой
- **Загрузка произвольного CSV** — дашборд становится универсальным инструментом
- **Таблица с сортировкой** — числа с подсветкой аномальных ячеек
- **Executive summary** — одна карточка «3 главных сигнала за период»
- **Webhooks / алерты** — уведомление если аномалия обнаружена автоматически
- **Кэширование AI-ответов** — одинаковый запрос за тот же период возвращает кэш из БД
