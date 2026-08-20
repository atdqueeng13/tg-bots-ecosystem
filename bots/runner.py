import asyncio
import os
import logging
from dotenv import load_dotenv
from bot_engine.agent import SherlockBotAgent

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("BotRunner")

ADMIN_API_URL = os.getenv("ADMIN_API_URL", "http://localhost:3000")

# Список токенов и ID ботов (загружаются из .env или базы данных)
BOT_CONFIGS = [
    {"bot_id": "BR-8921", "token": os.getenv("BOT_01_TOKEN", "")},
    {"bot_id": "BR-4432", "token": os.getenv("BOT_02_TOKEN", "")},
    {"bot_id": "BR-9901", "token": os.getenv("BOT_03_TOKEN", "")},
    {"bot_id": "BR-1004", "token": os.getenv("BOT_04_TOKEN", "")},
    {"bot_id": "BR-1005", "token": os.getenv("BOT_05_TOKEN", "")},
]

async def main():
    tasks = []
    active_count = 0

    for cfg in BOT_CONFIGS:
        token = cfg["token"].strip()
        if token and not token.startswith("1234567890"):
            agent = SherlockBotAgent(token=token, bot_id=cfg["bot_id"], admin_api_url=ADMIN_API_URL)
            tasks.append(asyncio.create_task(agent.start()))
            active_count += 1
        else:
            logger.info(f"Пропуск бота {cfg['bot_id']} (токен не указан в .env)")

    if active_count == 0:
        logger.warning(
            "Ни одного активного токена бота не найдено в .env!\n"
            "Укажите ваши реальные токены в .env (например: BOT_01_TOKEN=...) и перезапустите скрипт."
        )
        return

    logger.info(f"Успешно запущено {active_count} ботов экосистемы.")
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Оркестратор ботов остановлен пользователем.")
