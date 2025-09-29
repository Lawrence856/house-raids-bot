import dotenv from 'dotenv';
import dayjs from "dayjs";
import { Bot } from "grammy";
import {HousesReminders} from "./services/houses-reminders.js";
import {Houses} from "./services/houses.js";

import 'dayjs/locale/ru.js';

dayjs.locale('ru')
dotenv.config();

const bot = new Bot(process.env.TELEGRAM_TOKEN);

const houses = new Houses()
const chatsReminders = new Map()

bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;


    if (!chatsReminders.has(chatId)) {
        chatsReminders.set(chatId, new HousesReminders({ houses, chatId, bot }));
    }

    const reminders = chatsReminders.get(chatId)
    reminders.startCheckReminders()
});

// Команда остановки бота
bot.command('stop', async (ctx) => {
    const chatId = ctx.chat.id;

    if (chatsReminders.has(chatId)) {
        const reminders = chatsReminders.get(chatId)

        reminders.stopCheckReminders()
        chatsReminders.delete(chatId)
    }
});

bot.start()
houses.startReadingSheet()