import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import {Schedule} from "./services/schedule.js";

dotenv.config();


const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });


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


// Команда для ручного запуска
bot.onText(/\/start/, async (ctx) => {
    const chatId = ctx.chat.id;
    const schedule = new Schedule({ chatId, bot });

    await bot.sendMessage(chatId, 'Бот включен');
    await schedule.startCheckSchedule();
});

// Сигналы завершения (Ctrl+C, kill, systemd, pm2 и т.д.)
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
