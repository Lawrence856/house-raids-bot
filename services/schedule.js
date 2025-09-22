import {sheetsApi} from "../api/google/sheetsApi/index.js";

import {
    FIVE_MINUTES_REMAINING,
    SHEET_HEAD_DATE_KEY,
    SHEET_HEAD_HOUSE_FORMAT_KEY,
    SHEET_HEAD_LOCATION_KEY, SHEET_HEAD_NOTE_KEY, SHEET_HEAD_SCREEN_LINK_KEY,
    SHEET_HEAD_TIME_KEY, TWENTY_MINUTES_REMAINING
} from "../constants/index.js";
import {loadReminders, saveReminders} from "../functions/index.js";
import dayjs from "dayjs";
import 'dayjs/locale/ru.js';
dayjs.locale('ru')

export class Schedule {
    constructor({ bot, chatId }) {
        this.bot = bot;
        this.chatId = chatId;
        this.reminders = loadReminders()
        this.checkScheduleIntervalId = null
    }

    async checkSchedule() {
        const { headers, rows } = await sheetsApi.getSheetData();

        if (!rows.length) {
            await this.bot.sendMessage(this.chatId, "Таблица пуста.");
            return;
        }

        const nowDate = dayjs();

        const dateIndex = headers.indexOf(SHEET_HEAD_DATE_KEY)
        const timeIndex = headers.indexOf(SHEET_HEAD_TIME_KEY)
        const locationIndex = headers.indexOf(SHEET_HEAD_LOCATION_KEY)
        const houseFormatIndex = headers.indexOf(SHEET_HEAD_HOUSE_FORMAT_KEY)
        const screenLinkIndex = headers.indexOf(SHEET_HEAD_SCREEN_LINK_KEY)
        const noteIndex = headers.indexOf(SHEET_HEAD_NOTE_KEY)

        // const eventsKeys = new Set(rows.map(row => {
        //     const date = row[dateIndex]
        //     const time = row[timeIndex]
        //
        //     const [day, mouth, year] = date.split('.');
        //
        //     const eventDate = dayjs(`${year}-${mouth}-${day} ${time}`);
        //     return eventDate.format();
        // }))

        rows.forEach((row) => {
            const date = row[dateIndex]
            const time = row[timeIndex]
            const location = row[locationIndex]
            const houseFormat = row[houseFormatIndex]
            const screenLink = row[screenLinkIndex]
            const note = row[noteIndex]

            const [day, mouth, year] = date.split('.');

            const eventDate = dayjs(`${year}-${mouth}-${day} ${time}`);
            const eventKey = eventDate.format();

            const dateMessage = `- ${SHEET_HEAD_DATE_KEY}: ${eventDate.format('DD MMMM')}`
            const timeMessage = `- ${SHEET_HEAD_TIME_KEY}: ${time}`
            const locationMessage = `- ${SHEET_HEAD_LOCATION_KEY}: ${location}`
            const houseFormatMessage = `- ${SHEET_HEAD_HOUSE_FORMAT_KEY}: ${houseFormat}`
            const noteMessage = `- ${SHEET_HEAD_NOTE_KEY}: ${note}`

            const imageUrl = this.convertDriveLink(screenLink)

            if (!this.reminders[eventKey]) {
                this.reminders[eventKey] = {};
            }

            const isTwentyMinutesRemaining = nowDate.add(TWENTY_MINUTES_REMAINING, 'minute').isSame(eventDate, 'minute')
            const isFiveMinutesRemaining = nowDate.add(FIVE_MINUTES_REMAINING, 'minute').isSame(eventDate, 'minute')

            const isTwentyMinutesRemainHasBeenSent = this.reminders[eventKey][TWENTY_MINUTES_REMAINING]
            const isFiveMinutesRemainHasBeenSent = this.reminders[eventKey][FIVE_MINUTES_REMAINING]

            const withNoteMessage = note ? [noteMessage] : []
            const message = [dateMessage, locationMessage, timeMessage, houseFormatMessage, ...withNoteMessage].join('\n')

            // Уведомление за 20 минут
            if (isTwentyMinutesRemaining && !isTwentyMinutesRemainHasBeenSent) {
                this.bot.sendPhoto(this.chatId, imageUrl, {
                    caption:  `🏠Через 20 минут слет на дом!\n\n${message}`
                });

                this.reminders[eventKey][TWENTY_MINUTES_REMAINING] = true;
                saveReminders(this.reminders);
            }

            // Уведомление за 5 минут
            if (isFiveMinutesRemaining && !isFiveMinutesRemainHasBeenSent) {
                this.bot.sendPhoto(this.chatId, imageUrl, {
                    caption: `🔥Через 5 минут слет на дом!\n\n${message}`
                });

                this.reminders[eventKey][FIVE_MINUTES_REMAINING] = true;
                saveReminders(this.reminders);
            }
        })

        // // Нужно для того, что бы не было утечек памяти
        // for (const key of Object.keys(this.reminders)) {
        //     if (!eventsKeys.has(key)) {
        //         delete this.reminders[key];
        //         saveReminders(this.reminders);
        //     }
        // }
    }

    async startCheckSchedule() {
        await this.checkSchedule()
        this.checkScheduleIntervalId = setInterval(() => this.checkSchedule(), 15000); // Запускаем уведомления раз в 15 секунд
    }

    stopCheckSchedule() {
        clearInterval(this.checkScheduleIntervalId);
    }

    convertDriveLink(url) {
        if (!url && typeof url !== 'string') return ''

        const regex = /\/d\/([^/]+)\//;
        const match = url.match(regex);

        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }

        return url;
    }
}