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

bot.command('stop', async (ctx) => {
    const chatId = ctx.chat.id;

    if (chatsReminders.has(chatId)) {
        const reminders = chatsReminders.get(chatId)

        reminders.stopCheckReminders()
        chatsReminders.delete(chatId)
    }
});

bot.command('houses_list', async (ctx) => {
    const chatId = ctx.chat.id;

    const housesList = houses.getHouses()

    let message = 'Список слетов:\n\n'

    housesList.forEach((house, index) => {
        const { date: isoDate, location, format } = house

        const date = dayjs(isoDate)
        message += `${index + 1}) `
        message += `Дата: ${date.format('DD-MM HH:mm')}, `
        message += `Локация: ${location}, `
        message += `Формат: ${format}x${format}\n`
    })

    bot.api.sendMessage(chatId, message)
})

bot.command('help', async (ctx) => {
    const chatId = ctx.chat.id;

    const commands = [
        { name: 'Включить бота', value: '/start' },
        { name: 'Выключить бота', value: '/stop' },
        { name: 'Получить краткую информацию по слетам', value: '/houses_list' },
    ]

    bot.api.sendMessage(chatId, `Команды бота.\n\n${commands.map(item => `${item.name}: ${item.value}`).join('\n')}`)
});

bot.start()
houses.startReadingSheet()