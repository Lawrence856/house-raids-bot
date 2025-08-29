import TelegramBot from 'node-telegram-bot-api';
import { google } from "googleapis";
import { fileURLToPath } from 'url';
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import 'dayjs/locale/ru.js';

dayjs.locale('ru')

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Настройки
const TELEGRAM_TOKEN = "8322186021:AAHo27YXKZWbYWU4IsoVNnfVISFI0ty2pKs"; // токен бота в телеграм
const CHAT_ID = "-4960799685"; // ID группового чата (узнаем позже)
const SHEET_ID = "1TP30GCDMK9wgAXYCpr0Z0kgIgABXfV4bndH0V17wsw4"; // id google таблицы

const CREDENTIALS = JSON.parse(fs.readFileSync("credentials.json")); // JSON сервисного аккаунта

// Название колонок в таблице
const SHEET_HEAD_DATE_KEY = 'Дата'
const SHEET_HEAD_TIME_KEY = 'Время'
const SHEET_HEAD_LOCATION_KEY = 'Лока'
const SHEET_HEAD_HOUSE_FORMAT_KEY = 'Формат места'
const SHEET_HEAD_SCREEN_LINK_KEY = 'Ссылка на скрин'
const SHEET_HEAD_NOTE_KEY = 'Примечание'

// Файл в котором храним оповещения отправленные в ТГ
const REMINDERS_FILE = path.join(__dirname, "reminders.json");

// Авторизация Google API
const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

// Телеграм бот
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

let checkScheduleIntervalId = null
let sentReminders = loadReminders();

function loadReminders() {
    if (fs.existsSync(REMINDERS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(REMINDERS_FILE));
        } catch (e) {
            console.error("Ошибка чтения reminders.json:", e);
            return {};
        }
    }
    return {};
}

function saveReminders(data) {
    try {
        fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Ошибка записи reminders.json:", e);
    }
}

// Функция для чтения таблицы
async function getSheetData() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "A1:Z100", // диапазон
    });

    return {
        headers: res.data.values[0] || [],
        rows: res.data.values.slice(1),
    };
}

// Отправка уведомлений
async function checkSchedule() {
    const { headers, rows } = await getSheetData();

    if (!rows.length) {
        bot.sendMessage(CHAT_ID, "Таблица пуста.");
        return;
    }

    const nowDate = dayjs();

    const dateIndex = headers.indexOf(SHEET_HEAD_DATE_KEY)
    const timeIndex = headers.indexOf(SHEET_HEAD_TIME_KEY)
    const locationIndex = headers.indexOf(SHEET_HEAD_LOCATION_KEY)
    const houseFormatIndex = headers.indexOf(SHEET_HEAD_HOUSE_FORMAT_KEY)
    const screenLinkIndex = headers.indexOf(SHEET_HEAD_SCREEN_LINK_KEY)
    const noteIndex = headers.indexOf(SHEET_HEAD_NOTE_KEY)

    rows.forEach((row) => {
        const date = row[dateIndex]
        const time = row[timeIndex]
        const location = row[locationIndex]
        const houseFormat = row[houseFormatIndex]
        const screenLink = row[screenLinkIndex]
        const note = row[noteIndex]

        const [day, mouth, year] = date.split('.');

        const eventDate = dayjs(`${year}-${mouth}-${day} ${time}`);
        const eventId = `id-${eventDate.format()}`;

        const dateMessage = `- ${SHEET_HEAD_DATE_KEY}: ${eventDate.format('DD MMMM')}`
        const timeMessage = `- ${SHEET_HEAD_TIME_KEY}: ${time}`
        const locationMessage = `- ${SHEET_HEAD_LOCATION_KEY}: ${location}`
        const houseFormatMessage = `- ${SHEET_HEAD_HOUSE_FORMAT_KEY}: ${houseFormat}`
        const screenLinkMessage = `- ${SHEET_HEAD_SCREEN_LINK_KEY}: ${screenLink}`
        const noteMessage = `- ${SHEET_HEAD_NOTE_KEY}: ${note}`

        if (!sentReminders[eventId]) {
            sentReminders[eventId] = {};
        }

        // Разница в минутах
        const is20MinDiff = nowDate.add(20, 'minute').isSame(eventDate, 'minute')
        const is5MinDiff = nowDate.add(5, 'minute').isSame(eventDate, 'minute')

        const withNoteMessage = note ? [noteMessage] : []
        const message = [dateMessage, locationMessage, timeMessage, houseFormatMessage, screenLinkMessage, ...withNoteMessage].join('\n')

        // Уведомление за 20 минут
        if (is20MinDiff && !sentReminders[eventId][20]) {
            bot.sendMessage(CHAT_ID, `Через 20 минут слет на дом!\n\n${message}`);

            sentReminders[eventId][20] = true;
            saveReminders(sentReminders);
        }

        // Уведомление за 5 минут
        if (is5MinDiff && !sentReminders[eventId][5]) {
            bot.sendMessage(CHAT_ID, `Через 5 минут слет на дом!!!\n\n${message}`);

            sentReminders[eventId][5] = true;
            saveReminders(sentReminders);
        }
    })
}

// 🟢 Обработчики завершения процесса
function shutdown(signal) {
    console.log(`\nПолучен сигнал ${signal}. Отключаем бота...`);

    // Отключаем поллинг
    bot.stopPolling()
        .then(() => {
            clearInterval(checkScheduleIntervalId)
            console.log("Бот отключён корректно ✅");
            process.exit(0);
        })
        .catch((err) => {
            clearInterval(checkScheduleIntervalId)
            console.error("Ошибка при остановке:", err);
            process.exit(1);
        });
}


// Команда для ручного запуска
bot.onText(/\/start/, () => {
    bot.sendMessage(CHAT_ID, 'Бот включен');

    checkSchedule();
    checkScheduleIntervalId = setInterval(checkSchedule, 20000); // Запускаем уведомления раз в 20 секунд
});

// Команда для ручного запуска
bot.onText(/\/stop/, () => {
    bot.sendMessage(CHAT_ID, 'Бот выключен');
    clearInterval(checkScheduleIntervalId)
});

bot.on('message', (msg) => {
    console.log(`id чата: ${msg.chat.id}`);
});

// Команда для ручного запуска
bot.onText(/\/get_chat_id/, (msg) => {
    bot.sendMessage(CHAT_ID, `id чата: ${msg.chat.id}`);
});

// Сигналы завершения (Ctrl+C, kill, systemd, pm2 и т.д.)
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
