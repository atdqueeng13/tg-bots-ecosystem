# 📝 ЖУРНАЛ ИЗМЕНЕНИЙ И СИНХРОНИЗАЦИИ (LAST UPDATES)

> ⚠️ **ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ДЛЯ ВСЕХ ИИ-АГЕНТОВ (Cursor, Windsurf, Claude, Copilot, Antigravity):**
> 1. **ПЕРЕД НАЧАЛОМ ЛЮБОЙ РАБОТЫ:** Вы ОБЯЗАНЫ прочитать этот файл (`docs/LAST_UPDATES.md`), чтобы быть в курсе последних нововведений, измененных файлов и структуры базы данных.
> 2. **ПОСЛЕ ЗАВЕРШЕНИЯ РАБОТЫ:** Вы ОБЯЗАНЫ добавить новую запись в самый верх этого журнала с описанием сделанных изменений, списком затронутых файлов и инструкцией для второго разработчика.

---

## 📌 Шаблон для новой записи:

```markdown
### 🗓️ [ГГГГ-ММ-ДД ЧЧ:ММ] — Название фичи / задачи
* **Автор / Агент:** @username (или AI Agent)
* **Ветка:** `feature/имя-ветки`
* **Что сделано:**
  - Краткий пункт 1
  - Краткий пункт 2
* **Затронутые файлы:**
  - `path/to/modified_file.tsx`
  - `path/to/new_api_route.ts`
* **Заметки для команды:** (например: нужно ли обновить .env или перезапустить npm run dev)
```

---

## 📜 Хронология обновлений:

### 🗓️ 2026-08-20 15:35 — Развертывание Sherlock Admin V2 на Vercel, Мульти-аккаунты & Firebase
* **Автор / Агент:** Antigravity AI (для @atdqueeng13 & @saintrosexi)
* **Ветка:** `main` (Live на Vercel: `https://admin-panel-gilt-three.vercel.app`)
* **Что сделано:**
  1. Полностью собрана и задеплоена панель управления **Sherlock Admin (V2)** на Next.js 14 + Tailwind CSS с графитовой темой из `design.md`.
  2. Настроена авторизация по логину/паролю с сессионными cookies:
     - Аккаунт 1: `lasleywork` / `Danyap0l4ndbot615!` (Lasley)
     - Аккаунт 2: `saintrose` / `roserose123` (SaintRose)
  3. Реализован пул динамической ротации ключей Google Gemini API (`gemini-2.0-flash`, `1.5-pro`) с авто-обходом лимитов (429 квота).
  4. Добавлены все экраны: Дашборд с виджетами, Реестр ботов с тумблерами и рестартом, Редактор 5 полей промпта + тест-чат, Дела/Группы с общим лором, База игроков и журнал диалогов, Интерфейс рассылок, Глобальные настройки.
  5. Добавлен адаптер **Firebase Firestore** (`admin-panel/lib/firebase.ts`) для постоянного облачного хранилища.
  6. Написан оркестратор Telegram-ботов (`bots/runner.py` + `bots/bot_engine/agent.py`) на `aiogram 3.x`.
* **Затронутые файлы:**
  - `admin-panel/app/` (все страницы UI и API эндпоинты)
  - `admin-panel/lib/` (`auth.ts`, `gemini-rotator.ts`, `prisma.ts`, `firebase.ts`, `seed-data.ts`)
  - `admin-panel/prisma/schema.prisma`
  - `bots/runner.py`, `bots/bot_engine/agent.py`
  - `.env.example`, `admin-panel/.env.example`
* **Заметки для команды:**
  - Для локального запуска: `cd admin-panel && npm run dev`.
  - Все новые переменные окружения документированы в `.env.example`.

---

### 🗓️ 2026-08-20 14:40 — Инициализация репозитория экосистемы ботов
* **Автор / Агент:** Antigravity AI
* **Ветка:** `main`
* **Что сделано:**
  - Создан закрытый репозиторий `tg-bots-ecosystem` на GitHub.
  - Приглашен @saintrosexi в качестве коллаборатора.
  - Настроены `.gitignore`, шаблоны ботов `bots/template/`, общие модули `shared/` и гайды `docs/ARCHITECTURE.md`, `docs/GIT_WORKFLOW.md`, `docs/SCENARIOS.md`.
