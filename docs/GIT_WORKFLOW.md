# Git Workflow для команды

Правила командной работы над ботами с использованием ИИ.

---

### 1. Создание ветки
Перед началом работы над новой задачей обновите `main` и создайте ветку:
```bash
git checkout main
git pull origin main
git checkout -b feature/ваша-задача
```

### 2. Именование веток
- `feature/bot-01-handlers` — добавление новых обработчиков для бота 1.
- `feature/shared-db-models` — добавление новых таблиц в базу данных.
- `fix/bot-02-crash` — исправление бага.
- `docs/scenario-update` — обновление документации.

### 3. Коммиты и Pull Request
```bash
git add .
git commit -m "feat: описание изменений"
git push -u origin feature/ваша-задача
```
Затем зайдите на GitHub в репозиторий и создайте Pull Request.
