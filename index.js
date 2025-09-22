import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import {Schedule} from "./services/schedule.js";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
    polling: true,
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4
        }
    }
});
const chatsSchedule = new Map()

// Команда страта бота
bot.onText(/\/start/, async (ctx) => {
    const chatId = ctx.chat.id;

    if (!chatsSchedule.has(chatId)) {
        chatsSchedule.set(chatId, new Schedule({ chatId, bot }));
    }

    const schedule = chatsSchedule.get(chatId)
    await schedule.startCheckSchedule();
});

// Команда остановки бота
bot.onText(/\/stop/, async (ctx) => {
    const chatId = ctx.chat.id;

    if (chatsSchedule.has(chatId)) {
        const schedule = chatsSchedule.get(chatId)

        schedule.stopCheckSchedule();
        chatsSchedule.delete(chatId)
    }
});