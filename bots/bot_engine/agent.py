import asyncio
import logging
import aiohttp
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import Message

logger = logging.getLogger(__name__)

class SherlockBotAgent:
    """
    Автономный агент Telegram-бота, интегрированный с Sherlock Admin Panel.
    Синхронизирует промпты, лор и параметры с Next.js Backend.
    """
    def __init__(self, token: str, bot_id: str, admin_api_url: str = "http://localhost:3000"):
        self.token = token
        self.bot_id = bot_id
        self.admin_api_url = admin_api_url.rstrip("/")
        self.bot = Bot(token=self.token)
        self.dp = Dispatcher()
        self.config_cache = None

        self._register_handlers()

    def _register_handlers(self):
        @self.dp.message(CommandStart())
        async def start_handler(message: Message):
            greeting = await self.process_message(
                telegram_id=message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
                last_name=message.from_user.last_name,
                user_message="/start"
            )
            await message.answer(greeting)

        @self.dp.message()
        async def text_handler(message: Message):
            if not message.text:
                return

            response = await self.process_message(
                telegram_id=message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
                last_name=message.from_user.last_name,
                user_message=message.text
            )
            await message.answer(response)

    async def process_message(self, telegram_id: int, username: str | None, first_name: str | None, last_name: str | None, user_message: str) -> str:
        """
        Передает реплику на сервер Sherlock Admin:
        1. Сервер формирует полный контекст (глобальный промпт + лор дела + характер бота).
        2. Выполняет генерацию через Gemini API с авто-ротацией ключей.
        3. Записывает диалог и обновляет статистику юзера в базе данных.
        """
        url = f"{self.admin_api_url}/api/bot-runtime/dialogue"
        payload = {
            "botId": self.bot_id,
            "telegramId": str(telegram_id),
            "username": username,
            "firstName": first_name,
            "lastName": last_name,
            "userMessage": user_message,
            "generateResponse": True
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("botResponse", "[ОТВЕТ ПУСТ]")
                    else:
                        err_text = await resp.text()
                        logger.error(f"Admin API error ({resp.status}): {err_text}")
                        return "[СИСТЕМНЫЙ СБОЙ]: Не удалось получить ответ из реестра улик."
        except Exception as e:
            logger.error(f"Error communicating with Admin API: {e}")
            return "[ОШИБКА СОЕДИНЕНИЯ]: Сервер панели управления недоступен."

    async def start(self):
        logger.info(f"Запуск бота ID: {self.bot_id}...")
        try:
            await self.dp.start_polling(self.bot)
        finally:
            await self.bot.session.close()
