# 📝 ЖУРНАЛ ИЗМЕНЕНИЙ И СИНХРОНИЗАЦИИ (LAST UPDATES)

> ⚠️ **ОБЯЗАТЕЛЬНЫЙ ПРОТОКОЛ ДЛЯ ВСЕХ ИИ-АГЕНТОВ (Cursor, Windsurf, Claude, Copilot, Antigravity):**
> 1. **ПЕРЕД НАЧАЛОМ РАБОТЫ:** Прочитайте этот файл и **в своем ответе пользователю обязательно напишите**:
>    > *«Кстати, вот последние изменения, которые вносил другой разработчик:*
>    > *1. ...*
>    > *2. ...»*
> 2. **ПОСЛЕ ЗАВЕРШЕНИЯ РАБОТЫ:** Добавьте новую запись в самый верх этого журнала с описанием изменений и списком затронутых файлов.

---

## 📜 Хронология обновлений:

### 🗓️ 2026-08-20 15:45 — Протокол уведомления пользователя об изменениях напарника
* **Автор / Агент:** Antigravity AI
* **Ветка:** `main`
* **Что сделано:**
  1. В правила всех ИИ (`.cursorrules`, `.windsurfrules`, `AGENT_RULES.md`) добавлено жесткое требование: перед началом работы читать `docs/LAST_UPDATES.md` и в ответе пользователю явно выводить сводку «Кстати, вот изменения, которые вносил другой разработчик...».
* **Затронутые файлы:**
  - `.cursorrules`, `.windsurfrules`, `AGENT_RULES.md`, `docs/LAST_UPDATES.md`

---

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
