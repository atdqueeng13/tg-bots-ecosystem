import asyncio
import os
import logging
import aiohttp
from dotenv import load_dotenv
from bot_engine.agent import SherlockBotAgent

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("DynamicBotRunner")

ADMIN_API_URL = os.getenv("ADMIN_API_URL", "http://localhost:3000").rstrip("/")
POLL_INTERVAL_SECONDS = 10

class BotManager:
    def __init__(self, admin_api_url: str):
        self.admin_api_url = admin_api_url
        self.running_bots = {}  # { bot_id: { "agent": agent, "task": task, "token": token } }

    async def fetch_active_bots(self) -> list[dict]:
        url = f"{self.admin_api_url}/api/bot-runtime/active-bots"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("bots", [])
        except Exception as e:
            logger.debug(f"API /api/bot-runtime/active-bots недоступен ({e}), используем fallback...")
        return []

    async def sync_bots(self):
        db_bots = await self.fetch_active_bots()

        # Fallback to .env tokens if DB returned empty
        if not db_bots:
            env_main = os.getenv("MAIN_BOT_TOKEN", "").strip()
            if env_main and not env_main.startswith("1234567890"):
                db_bots.append({
                    "id": "hub_main",
                    "botId": "hub_main",
                    "name": "Главный Детективный Хаб",
                    "token": env_main,
                    "isMainHub": True
                })

            for i in range(1, 10):
                token = os.getenv(f"BOT_{i:02d}_TOKEN", "").strip()
                if token and not token.startswith("1234567890"):
                    db_bots.append({
                        "id": f"bot_{i:02d}",
                        "botId": f"bot_{i:02d}",
                        "name": f"Подозреваемый #{i}",
                        "token": token,
                        "isMainHub": False
                    })

        active_bot_ids = set()

        for b in db_bots:
            bot_id = b.get("id") or b.get("botId")
            token = (b.get("token") or "").strip()
            name = b.get("name", bot_id)
            is_main_hub = bool(b.get("isMainHub"))

            # Validate token format
            if not token or token.startswith("1234567890") or ":" not in token:
                continue

            active_bot_ids.add(bot_id)

            # Check if bot already running
            if bot_id in self.running_bots:
                current = self.running_bots[bot_id]
                # If token changed, restart
                if current["token"] != token:
                    logger.info(f"🔄 Токен бота {name} ({bot_id}) изменился. Перезапуск...")
                    current["task"].cancel()
                    agent = SherlockBotAgent(token=token, bot_id=bot_id, is_main_hub=is_main_hub, admin_api_url=self.admin_api_url)
                    task = asyncio.create_task(agent.start())
                    self.running_bots[bot_id] = {"agent": agent, "task": task, "token": token, "name": name}
            else:
                # Start new bot dynamically
                logger.info(f"🚀 [Plug & Play] Обнаружен новый активный бот: «{name}» (ID: {bot_id}, Главный: {is_main_hub}). Запуск...")
                agent = SherlockBotAgent(token=token, bot_id=bot_id, is_main_hub=is_main_hub, admin_api_url=self.admin_api_url)
                task = asyncio.create_task(agent.start())
                self.running_bots[bot_id] = {"agent": agent, "task": task, "token": token, "name": name}

        # Stop bots that were deactivated or deleted
        stopped_ids = []
        for bot_id, current in self.running_bots.items():
            if bot_id not in active_bot_ids:
                logger.info(f"🛑 Бот «{current.get('name', bot_id)}» отключен в панели. Остановка...")
                current["task"].cancel()
                stopped_ids.append(bot_id)

        for bot_id in stopped_ids:
            del self.running_bots[bot_id]

    async def run(self):
        logger.info(f"🌟 Детективный оркестратор ботов запущен. Синхронизация с {self.admin_api_url}...")
        while True:
            try:
                await self.sync_bots()
            except Exception as e:
                logger.error(f"Ошибка в цикле синхронизации ботов: {e}")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

async def main():
    manager = BotManager(admin_api_url=ADMIN_API_URL)
    await manager.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("🛑 Оркестратор ботов остановлен пользователем.")
