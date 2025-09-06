import express from "express";
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import {Schedule} from "./services/schedule.js";

dotenv.config();

const PORT = process.env.PORT || 8080

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const app = express();

app.get("/", (req, res) => {
    res.send("🤖 Telegram bot + Google Sheets работает!");
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});

// Команда для ручного запуска
bot.onText(/\/start/, async (ctx) => {
    const chatId = ctx.chat.id;
    const schedule = new Schedule({ chatId, bot });

    await schedule.startCheckSchedule();
    await bot.sendMessage(chatId, 'Бот включен');
});

// Сигналы завершения (Ctrl+C, kill, systemd, pm2 и т.д.)
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// 🟢 Обработчики завершения процесса
function shutdown(signal) {
    console.log(`\nПолучен сигнал ${signal}. Отключаем бота...`);

    // Отключаем поллинг
    bot.stopPolling()
        .then(() => {
            console.log("Бот отключён корректно ✅");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Ошибка при остановке:", err);
            process.exit(1);
        });
}