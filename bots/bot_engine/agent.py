import asyncio
import logging
import aiohttp
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton

logger = logging.getLogger(__name__)

def split_message(text: str, max_length: int = 4000) -> list[str]:
    """Безопасно разбивает длинное сообщение на части по абзацам"""
    if len(text) <= max_length:
        return [text]
    
    chunks = []
    current = ""
    for paragraph in text.split("\n\n"):
        if len(current + "\n\n" + paragraph) <= max_length:
            current = (current + "\n\n" + paragraph).strip()
        else:
            if current:
                chunks.append(current)
            if len(paragraph) <= max_length:
                current = paragraph
            else:
                for i in range(0, len(paragraph), max_length):
                    chunks.append(paragraph[i:i + max_length])
                current = ""
    if current:
        chunks.append(current)
    return chunks

class SherlockBotAgent:
    """
    Автономный агент Telegram-бота, динамически синхронизированный с Sherlock Admin.
    Поддерживает как Главного Бота-Хаба (меню дел, инлайн-кнопки, обвинение),
    так и Ботов-Подозреваемых (изолированная память, тайпинг, сплит сообщений).
    """
    def __init__(self, token: str, bot_id: str, is_main_hub: bool = False, admin_api_url: str = "http://localhost:3000"):
        self.token = token.strip()
        self.bot_id = bot_id
        self.is_main_hub = is_main_hub
        self.admin_api_url = admin_api_url.rstrip("/")
        self.bot = Bot(token=self.token)
        self.dp = Dispatcher()
        self._is_running = False

        self._register_handlers()

    def _register_handlers(self):
        if self.is_main_hub:
            self._register_hub_handlers()
        else:
            self._register_suspect_handlers()

    def _register_hub_handlers(self):
        """Обработчики для Главного Бота (Игровой Мастер)"""
        @self.dp.message(CommandStart())
        async def hub_start(message: Message):
            res = await self._call_hub_api(message.from_user, action="start")
            if res.get("text"):
                kb = self._build_keyboard(res.get("buttons", []))
                await message.answer(res["text"], parse_mode="Markdown", reply_markup=kb)

        @self.dp.message(Command("cases"))
        async def hub_cases(message: Message):
            res = await self._call_hub_api(message.from_user, action="cases")
            if res.get("text"):
                kb = self._build_keyboard(res.get("buttons", []))
                await message.answer(res["text"], parse_mode="Markdown", reply_markup=kb)

        @self.dp.message(Command("accuse"))
        async def hub_accuse(message: Message):
            res = await self._call_hub_api(message.from_user, action="accuse_select")
            if res.get("text"):
                kb = self._build_keyboard(res.get("buttons", []))
                await message.answer(res["text"], parse_mode="Markdown", reply_markup=kb)

        @self.dp.callback_query()
        async def hub_callbacks(call: CallbackQuery):
            await call.answer()
            data = call.data or ""

            if data.startswith("case:"):
                case_id = data.replace("case:", "")
                res = await self._call_hub_api(call.from_user, action="select_case", case_id=case_id)
                if res.get("text"):
                    kb = self._build_keyboard(res.get("buttons", []))
                    await call.message.answer(res["text"], parse_mode="Markdown", reply_markup=kb)

            elif data.startswith("accuse_menu:"):
                case_id = data.replace("accuse_menu:", "")
                res = await self._call_hub_api(call.from_user, action="accuse_select", case_id=case_id)
                if res.get("text"):
                    kb = self._build_keyboard(res.get("buttons", []))
                    await call.message.answer(res["text"], parse_mode="Markdown", reply_markup=kb)

            elif data.startswith("accuse_bot:"):
                parts = data.split(":")
                case_id = parts[1] if len(parts) > 1 else ""
                accused_id = parts[2] if len(parts) > 2 else ""
                await call.message.answer(
                    "⚖️ Вы выбрали обвиняемого.\n\nТеперь отправьте ответным сообщением ваше **детективное обоснование** (почему вы считаете его убийцей, мотив и улики):",
                    parse_mode="Markdown"
                )

        @self.dp.message()
        async def hub_text(message: Message):
            if not message.text:
                return
            
            # Text is treated as Accusation argument
            res = await self._call_hub_api(message.from_user, action="submit_accusation", accusation_reason=message.text)
            verdict = res.get("verdictText")
            if verdict:
                chunks = split_message(verdict)
                for chunk in chunks:
                    await message.answer(chunk)
            else:
                await message.answer("Для выбора дел используйте команду /start или /cases")

    def _register_suspect_handlers(self):
        """Обработчики для Ботов-Подозреваемых (Допрос)"""
        @self.dp.message(CommandStart())
        async def suspect_start(message: Message):
            await self._send_typing(message.chat.id)
            response = await self._process_interrogation(message.from_user, "/start")
            await self._send_split_response(message, response)

        @self.dp.message()
        async def suspect_text(message: Message):
            if not message.text:
                return
            await self._send_typing(message.chat.id)
            response = await self._process_interrogation(message.from_user, message.text)
            await self._send_split_response(message, response)

    async def _send_typing(self, chat_id: int):
        try:
            await self.bot.send_chat_action(chat_id=chat_id, action="typing")
        except Exception:
            pass

    async def _send_split_response(self, message: Message, response_text: str):
        chunks = split_message(response_text)
        for chunk in chunks:
            await message.answer(chunk)
            if len(chunks) > 1:
                await asyncio.sleep(0.3)

    def _build_keyboard(self, buttons_data: list) -> InlineKeyboardMarkup | None:
        if not buttons_data:
            return None
        rows = []
        for b in buttons_data:
            if b.get("url"):
                rows.append([InlineKeyboardButton(text=b["text"], url=b["url"])])
            elif b.get("callback_data"):
                rows.append([InlineKeyboardButton(text=b["text"], callback_data=b["callback_data"])])
        return InlineKeyboardMarkup(inline_keyboard=rows) if rows else None

    async def _call_hub_api(self, user: types.User, action: str, case_id: str = None, accusation_reason: str = None) -> dict:
        url = f"{self.admin_api_url}/api/bot-runtime/hub"
        payload = {
            "telegramId": str(user.id),
            "username": user.username,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "action": action,
            "caseId": case_id,
            "accusationReason": accusation_reason,
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=45)) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            logger.error(f"Hub API error: {e}")
        return {"text": "⚠️ Сервер детективного бюро временно недоступен."}

    async def _process_interrogation(self, user: types.User, user_message: str) -> str:
        url = f"{self.admin_api_url}/api/bot-runtime/dialogue"
        payload = {
            "botId": self.bot_id,
            "telegramId": str(user.id),
            "username": user.username,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "userMessage": user_message,
            "generateResponse": True
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=45)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("botResponse", "[Подозреваемый нервно молчит]")
                    else:
                        err = await resp.text()
                        logger.error(f"Interrogation API error ({resp.status}): {err}")
                        return "[СИСТЕМНЫЙ СБОЙ]: Подозреваемый растерялся и не может связать двух слов."
        except Exception as e:
            logger.error(f"Dialogue API connection error: {e}")
            return "[ОШИБКА СОЕДИНЕНИЯ]: Сервер панели управления недоступен."

    async def start(self):
        self._is_running = True
        logger.info(f"🟢 Запуск бота ID: {self.bot_id} (Главный Хаб: {self.is_main_hub})...")
        try:
            await self.dp.start_polling(self.bot)
        except asyncio.CancelledError:
            logger.info(f"🟡 Остановка бота ID: {self.bot_id} по сигналу.")
        finally:
            await self.bot.session.close()

    async def stop(self):
        self._is_running = False
        await self.dp.stop_polling()
        await self.bot.session.close()
