# 📝 ЖУРНАЛ ИЗМЕНЕНИЙ И СИНХРОНИЗАЦИИ (LAST UPDATES)

> ⚠️ **ОБЯЗАТЕЛЬНЫЙ ПРОТОКОЛ ДЛЯ ВСЕХ ИИ-АГЕНТОВ (Cursor, Windsurf, Claude, Copilot, Antigravity):**
> 1. **ПЕРЕД НАЧАЛОМ РАБОТЫ:** Прочитайте этот файл и **в своем ответе пользователю обязательно напишите**:
>    > *«Кстати, вот последние изменения, которые вносил другой разработчик:*
>    > *1. ...*
>    > *2. ...»*
> 2. **ПОСЛЕ ЗАВЕРШЕНИЯ РАБОТЫ:** Добавьте новую запись в самый верх этого журнала с описанием изменений и списком затронутых файлов.

---

## 📜 Хронология обновлений:

### 🗓️ 2026-08-21 14:25 — Выделенный Главный Бот-Хаб (`/hub`), Конструктор многошаговой воронки (фото, задержки), Блокировка ИИ во время онбординга, Команды `/cases` и ИИ-Шеф Бюро
* **Автор / Агент:** Antigravity AI (для @atdqueeng13 & @saintrosexi)
* **Ветка:** `main` (Раздельный запуск, Supabase Cloud PostgreSQL, 100% готовность к Vercel)
* **Что сделано (ПОЛНЫЙ ПЕРЕЧЕНЬ):**
  1. **Выделенный раздел Главного Бота-Хаба (`/hub`):**
     - В сайдбаре добавлен отдельный постоянный пункт **«⭐ Главный Бот (Хаб)»** (`admin-panel/components/Sidebar.tsx`).
     - Создана серверная страница `admin-panel/app/(dashboard)/hub/page.tsx` и клиентский интерфейс `hub-client.tsx`.
     - Архитектура **Singleton / Фиксированный Мастер**: Главный Бот неделим, его нельзя удалить или случайно превратить в подозреваемого.
     - Раздел **«Подозреваемые»** (`/bots`) очищен от настроек хаба и сфокусирован только на персонажах расследований с кнопкой перехода в Хаб.
  2. **Интерактивный конструктор многошаговой воронки онбординга:**
     - Поддержка от 1 до 20+ шагов в цепочке сообщений.
     - Для каждого шага настраивается:
       - **Текст сообщения** (поддержка Markdown, форматирования, списков и эмодзи).
       - **Задержка перед отправкой** (`delaySeconds`: 0с, 2с, 5с и т.д.).
       - **Медиа / Фото URL** (`mediaUrl`: прямая отправка картинок через `sendPhoto` в Telegram).
       - **Инлайн-кнопка** (`buttonText`: например, *"Получить инструкции 📜"*, *"Далее ➡️"*).
       - Кнопки перемещения шагов **Вверх ⬆️** и **Вниз ⬇️**, удаление и добавление новых шагов.
     - В модель `Bot` добавлено поле `onboardingSteps` (JSON).
  3. **Блокировка нейросети во время прохождения воронки (0 токенов):**
     - В модель `TelegramUser` добавлены поля `funnelStep` (Int) и `funnelCompleted` (Boolean).
     - Пока игрок не нажал все кнопки воронки (`funnelCompleted = false`), нейросеть **отключена**: бот отправляет только сценарные сообщения воронки и мягко напоминает завершить инструктаж при попытке писать произвольный текст.
  4. **Команда `/cases` (и `/menu`) для вызова каталога дел и оплаты Stars:**
     - Реализована команда **/cases** (и **/menu**), которая в любой момент выводит интерактивную инлайн-клавиатуру со списком доступных дел, количеством подозреваемых и ценами в **⭐ Telegram Stars**.
     - По завершению последнего шага воронки скрипт автоматически выдает игроку каталог расследований.
  5. **ИИ-Шеф Бюро (После завершения воронки):**
     - После онбординга (`funnelCompleted = true`) при текстовых сообщениях подключается ИИ-Шеф Бюро (Gemini 3.6 Flash).
     - В контекст ИИ автоматически подмешиваются актуальные дела дня из базы данных и текущий прогресс игрока: Шеф напоминает о незавершенных допросах, отвечает на вопросы и принимает команду обвинения **/accuse**.
  6. **Обработка вебхуков Telegram (`/api/bot-webhook/[botId]` & `/api/bot-runtime/hub`):**
     - Добавлена поддержка отправки фото (`sendPhoto`) при наличии `mediaUrl`, имитация задержек перед отправкой, обработка коллбэков `funnel_step:N` и `hub:cases`.
  7. **Полная интеграция с Cloud PostgreSQL (Supabase):**
     - Все API-ключи, боты, воронки, дела и диалоги сохраняются в реальном времени в Supabase PostgreSQL pooler (`aws-1-eu-west-1.pooler.supabase.com:6543`).
* **Затронутые файлы:**
  - `admin-panel/prisma/schema.prisma`
  - `admin-panel/components/Sidebar.tsx`
  - `admin-panel/app/(dashboard)/hub/page.tsx`
  - `admin-panel/app/(dashboard)/hub/hub-client.tsx`
  - `admin-panel/app/(dashboard)/bots/bots-client.tsx`
  - `admin-panel/app/(dashboard)/groups/groups-client.tsx`
  - `admin-panel/app/api/bot-runtime/hub/route.ts`
  - `admin-panel/app/api/bot-webhook/[botId]/route.ts`
  - `admin-panel/lib/seed-data.ts`
  - `admin-panel/lib/gemini-rotator.ts`
  - `admin-panel/.gitignore`
  - `docs/LAST_UPDATES.md`

---
* **Автор / Агент:** Antigravity AI (для @atdqueeng13 & @saintrosexi)
* **Ветка:** `main` (Запущено на `http://localhost:3000`)
* **Что сделано:**
  1. **Динамический запуск ботов (Plug & Play):**
     - Реализован эндпоинт `/api/bot-runtime/active-bots`, отдающий актуальный список активных ботов и дел.
     - Переписан `bots/runner.py`: оркестратор в цикле синхронизирует ботов с базой данных и на лету запускает `asyncio.Task` для любых добавленных ботов без правки `.env` или перезапуска скрипта.
     - Добавлен серверный Webhook-обработчик `/api/bot-webhook/[botId]` для прямой работы через Next.js без локального Python.
  2. **Изолированная память диалогов (Multi-turn Context):**
     - В `/api/bot-runtime/dialogue` диалоги изолированы строго по связке `(userId, botId)`. Контексты разных пользователей и разных ботов больше не перемешиваются.
     - В `gemini-rotator.ts` внедрена поддержка `history` для Gemini (`model.startChat`), OpenAI и Anthropic.
  3. **Сцена «В приемной» и Шкала давления:**
     - В `prompt-builder.ts` добавлен блок контекста допроса: подозреваемые знают, кто заходил в кабинет следователя до них, передают слухи из коридора.
     - Жесткая механика давления: невиновный при прижатии к стенке признается в своем реальном тайном секрете/алиби (`secretAlibi`), а убийца паникует и выдает шитую белыми нитками нескладную ложь.
  4. **Главный Бот-Хаб (`/api/bot-runtime/hub`):**
     - Каталог дел с инлайн-кнопками, выдача ссылок на подозреваемых (`t.me/...`), оплата Stars.
     - Механика финального обвинения `/accuse`: ИИ-судья оценивает догадку игрока, мотив и улики, выставляя оценку следствия (1–10) и раскрывая полную картину преступления.
  5. **Исполнитель рассылок (Broadcasts Worker):**
     - В `/api/broadcasts` добавлена реальная отправка сообщений и медиа через Telegram Bot API с безопасным rate limiting (~35мс между отправками) и обновлением счетчиков.
  6. **UX и защита от лимитов:**
     - В `agent.py` и webhook добавлена отправка статуса «печатает...» (`send_chat_action: typing`) и сплиттер длинных сообщений (>4000 символов) по абзацам.
* **Затронутые файлы:**
  - `admin-panel/prisma/schema.prisma`
  - `admin-panel/lib/prompt-builder.ts`
  - `admin-panel/lib/gemini-rotator.ts`
  - `admin-panel/lib/seed-data.ts`
  - `admin-panel/app/api/bot-runtime/active-bots/route.ts`
  - `admin-panel/app/api/bot-runtime/dialogue/route.ts`
  - `admin-panel/app/api/bot-runtime/hub/route.ts`
  - `admin-panel/app/api/bot-webhook/[botId]/route.ts`
  - `admin-panel/app/api/bots/route.ts` & `[id]/route.ts`
  - `admin-panel/app/api/groups/route.ts` & `[id]/route.ts`
  - `admin-panel/app/api/broadcasts/route.ts`
  - `bots/runner.py`
  - `bots/bot_engine/agent.py`
  - `docs/LAST_UPDATES.md`

---
* **Автор / Агент:** Antigravity AI (для @atdqueeng13 & @saintrosexi)
* **Ветка:** `main` (Запущено на `http://localhost:3000`)
* **Что сделано:**
  1. **Удаление detective/RP терминологии:** Полностью очищены все заглушки и ролевые термины ("Реестр улик", "Следователи", "Субъекты", "Дела", "Уровень допуска", "Награда", "Легенда"). Система приведена к чистому виду Enterprise Админ-панели для Telegram-ботов.
  2. **Сплошной системный промпт бота (`prompt`):** Заменено разбиение на 6 полей единым монолитным полем для системного промпта бота, объединяющимся каскадом с глобальным промптом и групповым контекстом.
  3. **Пул API Ключей ИИ в Настройках (`/settings`):**
     - Добавлена полноценная таблица управления API ключами с полями: Название, Ключ, Статус (Активен / Cooldown 429 / Ошибка), Пинг / Запросы, Доступные модели.
     - Добавлено переключение режимов: **«Автосмена API (Ротация при исчерпании квоты 429)»** и **«Фиксированный активный ключ»**.
     - Добавлено модальное окно добавления ключей с мгновенной валидацией через API Google Gemini.
     - Кнопка проверки и обновления доступных моделей для каждого ключа.
  4. **Динамический список моделей Gemini (`/api/ai/models`):** Модели больше не захардкожены, а подтягиваются в реальном времени из активного Gemini API (`gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash` и др.).
  5. **Резервный бот (Fallback Bot):** В настройках заменен концепт «резервной модели» на полноценного **«Резервного бота»** (`fallbackBotId`), на которого автоматически перенаправляются запросы при отключении или ошибке целевого бота.
  6. **Сборка и продакшн:** Проведены `prisma db push`, `next build` без единой ошибки и перезапущен Next.js сервер.
* **Затронутые файлы:**
  - `admin-panel/prisma/schema.prisma`
  - `admin-panel/lib/prompt-builder.ts`
  - `admin-panel/lib/gemini-rotator.ts`
  - `admin-panel/lib/seed-data.ts`
  - `admin-panel/app/api/ai/models/route.ts`
  - `admin-panel/app/api/gemini-keys/route.ts`
  - `admin-panel/app/api/settings/route.ts`
  - `admin-panel/app/api/bots/route.ts` & `[id]/route.ts` & `[id]/test-chat/route.ts`
  - `admin-panel/app/api/bot-runtime/config/route.ts` & `dialogue/route.ts`
  - `admin-panel/app/api/groups/route.ts` & `[id]/route.ts`
  - `admin-panel/app/(dashboard)/settings/page.tsx` & `settings-client.tsx`
  - `admin-panel/app/(dashboard)/bots/bots-client.tsx` & `bots/[id]/bot-detail-client.tsx`
  - `admin-panel/app/(dashboard)/page.tsx` & `dashboard-client.tsx`
  - `admin-panel/app/(dashboard)/admins/admins-client.tsx`
  - `admin-panel/components/Sidebar.tsx`
  - `docs/LAST_UPDATES.md`

---

### 🗓️ 2026-08-21 02:30 — Полный редизайн Sherlock Admin и расширение функционала (Bento Grid, 6-факторные промпты, тестовый чат, реестр администраторов)
* **Автор / Агент:** Antigravity AI (для @atdqueeng13 & @saintrosexi)
* **Ветка:** `main` (Локально запущено на `http://localhost:3000`)
* **Что сделано:**
  1. **Дизайн-система:** Полный перевод панели на новый темный графитовый стиль (`#131313`, `#242424`, `#2c2c2c`), золотые акценты (`#ffbf00`/`#fbbc00`), шрифты `Inter` + `JetBrains Mono` и `Material Symbols Outlined`.
  2. **Боты (`/bots`):** Bento-сетка карточек ботов с тумблерами активности; модальное окно редактирования с 6-факторным системным промптом, тумблером «Виновный в этой группе» (`isGuilty`), просмотром логов сессий, «Предпросмотром итогового каскадного промпта» и живым «Тестовым чатом» с Gemini API.
  3. **Дашборд (`/`):** Bento-сетка ключевых метрик (активные/отключенные боты, статус Gemini API, запросы сегодня/за месяц), кнопка «Перезапустить все боты», таблица последних событий.
  4. **Группы (`/groups`):** Карточки групп со статусами и счетчиками ботов, модальное окно редактирования группового системного промпта и привязки/открепления ботов.
  5. **Пользователи (`/users`):** Обновленная таблица пользователей, поиск, пагинация, модальное окно добавления и досье с историей диалогов.
  6. **Рассылки (`/broadcasts`):** Форма создания рассылок с Markdown и медиа-вложениями, выбор аудитории (все/неактивные), мгновенная отправка или планирование по времени, история рассылок.
  7. **Администраторы (`/admins`):** Выделенный раздел в меню для управления учетными записями оперативников с допуском Уровня 4 (Полный доступ) и синхронизацией с Firebase.
  8. **Настройки (`/settings`):** Редактор глобального контекста, индикатор активной модели и автопереключение на резервную модель при сбое (Fallback).
  9. **Вход (`/login`):** Минималистичная форма входа по центру с переключателем видимости пароля.
* **Затронутые файлы:**
  - `admin-panel/tailwind.config.js`
  - `admin-panel/app/globals.css`
  - `admin-panel/prisma/schema.prisma`
  - `admin-panel/lib/seed-data.ts`
  - `admin-panel/lib/prompt-builder.ts`
  - `admin-panel/components/Sidebar.tsx` & `Header.tsx`
  - `admin-panel/app/(dashboard)/layout.tsx`
  - `admin-panel/app/(dashboard)/page.tsx` & `dashboard-client.tsx`
  - `admin-panel/app/(dashboard)/bots/page.tsx` & `bots-client.tsx`
  - `admin-panel/app/(dashboard)/groups/page.tsx` & `groups-client.tsx`
  - `admin-panel/app/(dashboard)/users/page.tsx` & `users-client.tsx`
  - `admin-panel/app/(dashboard)/broadcasts/page.tsx` & `broadcasts-client.tsx`
  - `admin-panel/app/(dashboard)/admins/page.tsx` & `admins-client.tsx`
  - `admin-panel/app/(dashboard)/settings/page.tsx` & `settings-client.tsx`
  - `admin-panel/app/(auth)/login/page.tsx`
  - `admin-panel/app/api/bots/route.ts` & `[id]/route.ts` & `[id]/test-chat/route.ts` & `restart-all/route.ts`
  - `admin-panel/app/api/groups/route.ts` & `[id]/route.ts`
  - `admin-panel/app/api/broadcasts/route.ts`
  - `admin-panel/app/api/settings/route.ts`
  - `docs/LAST_UPDATES.md`

* **Автор / Агент:** Antigravity AI (для @atdqueeng13 & @saintrosexi)
* **Ветка:** `main` (Live на Vercel: `https://admin-panel-gilt-three.vercel.app`)
* **Что сделано:**
  1. Добавлена полноценная система управления администраторами с уровнями доступа (Уровень 4 — Полный доступ, Уровень 3, Уровень 2).
  2. Добавлен API `/api/admins` (CRUD для создания, получения и удаления администраторов с сохранением в БД и зеркалированием в Firebase).
  3. В интерфейс «Настройки» (`/settings`) добавлен блок «Реестр Администраторов (Допуск Уровень 4)» и модальное окно создания новых администраторов.
  4. Авторизация (`/login`) теперь динамически проверяет пользователей напрямую из базы данных.
* **Затронутые файлы:**
  - `admin-panel/prisma/schema.prisma`
  - `admin-panel/app/api/admins/route.ts`
  - `admin-panel/app/api/auth/login/route.ts`
  - `admin-panel/app/(dashboard)/settings/page.tsx` & `settings-client.tsx`
  - `admin-panel/lib/seed-data.ts`
  - `docs/LAST_UPDATES.md`

---

### 🗓️ 2026-08-20 16:10 — Интеграция Firebase Realtime Database (`sherlock-ec772-default-rtdb`)
* **Автор / Агент:** Antigravity AI (для @atdqueeng13 & @saintrosexi)
* **Ветка:** `main`
* **Что сделано:**
  1. Подключен URL базы данных `https://sherlock-ec772-default-rtdb.firebaseio.com`.
  2. Настроена синхронизация пользователей и диалогов в реальном времени.

---

### 🗓️ 2026-08-20 15:45 — Протокол уведомления пользователя об изменениях напарника
* **Автор / Агент:** Antigravity AI
* **Ветка:** `main`
* **Что сделано:**
  1. В правила всех ИИ добавлено требование выводить сводку «Кстати, вот изменения...».
