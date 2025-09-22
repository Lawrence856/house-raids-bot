import dotenv from 'dotenv';
import { Bot } from "grammy";
import {Schedule} from "./services/schedule.js";

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_TOKEN);
const chatsSchedule = new Map()

// Команда страта бота
bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;


    if (!chatsSchedule.has(chatId)) {
        chatsSchedule.set(chatId, new Schedule({ chatId, bot }));
    }

    const schedule = chatsSchedule.get(chatId)
    await schedule.startCheckSchedule();
});

// Команда остановки бота
bot.command('stop', async (ctx) => {
    const chatId = ctx.chat.id;

    if (chatsSchedule.has(chatId)) {
        const schedule = chatsSchedule.get(chatId)

        schedule.stopCheckSchedule();
        chatsSchedule.delete(chatId)
    }
});

bot.start()