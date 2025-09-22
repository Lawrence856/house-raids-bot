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
        this._bot = bot;
        this._chatId = chatId;
        this._reminders = loadReminders()
        this._checkScheduleIntervalId = null
    }

    _convertDriveLink(url) {
        if (!url && typeof url !== 'string') return ''

        const regex = /\/d\/([^/]+)\//;
        const match = url.match(regex);

        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }

        return url;
    }

    _sendMessage(message, imageUrl) {
        if(imageUrl) {
            this._bot.api.sendPhoto(this._chatId, imageUrl, {
                caption:  message
            });
        } else {
            this._bot.api.sendMessage(this._chatId, message)
        }
    }

    async _checkSchedule() {
        const { headers, rows } = await sheetsApi.getSheetData();

        if (!rows.length) {
            await this._sendMessage("В таблице отсутсвуют записи о слетах.");
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
            const eventKey = eventDate.format();

            const dateMessage = `- ${SHEET_HEAD_DATE_KEY}: ${eventDate.format('DD MMMM')}`
            const timeMessage = `- ${SHEET_HEAD_TIME_KEY}: ${time}`
            const locationMessage = `- ${SHEET_HEAD_LOCATION_KEY}: ${location}`
            const houseFormatMessage = `- ${SHEET_HEAD_HOUSE_FORMAT_KEY}: ${houseFormat}`
            const noteMessage = `- ${SHEET_HEAD_NOTE_KEY}: ${note}`

            const imageUrl = this._convertDriveLink(screenLink)

            if (!this._reminders[eventKey]) {
                this._reminders[eventKey] = {};
            }

            const isEventHasAlreadyDone = nowDate.isAfter(eventDate)
            const isTwentyMinutesRemaining = nowDate.add(TWENTY_MINUTES_REMAINING, 'minute').isSame(eventDate, 'minute')
            const isFiveMinutesRemaining = nowDate.add(FIVE_MINUTES_REMAINING, 'minute').isSame(eventDate, 'minute')

            const isTwentyMinutesRemainHasBeenSent = this._reminders[eventKey][TWENTY_MINUTES_REMAINING]
            const isFiveMinutesRemainHasBeenSent = this._reminders[eventKey][FIVE_MINUTES_REMAINING]

            const withNoteMessage = note ? [noteMessage] : []
            const message = [dateMessage, locationMessage, timeMessage, houseFormatMessage, ...withNoteMessage].join('\n')

            // Уведомление за 20 минут
            if (isTwentyMinutesRemaining && !isTwentyMinutesRemainHasBeenSent) {
                this._sendMessage(`🏠Через 20 минут слет на дом!\n\n${message}`, imageUrl);

                this._reminders[eventKey][TWENTY_MINUTES_REMAINING] = true;
            }

            // Уведомление за 5 минут
            if (isFiveMinutesRemaining && !isFiveMinutesRemainHasBeenSent) {
                this._sendMessage( `🔥Через 5 минут слет на дом!\n\n${message}`, imageUrl);

                this._reminders[eventKey][FIVE_MINUTES_REMAINING] = true;
            }

            if(isEventHasAlreadyDone) {
                delete this._reminders[eventKey]
            }
        })

        saveReminders(this._reminders);
    }

    startCheckSchedule() {
        this._checkSchedule()
        this._checkScheduleIntervalId = setInterval(() => this._checkSchedule(), 15000); // Запускаем уведомления раз в 15 секунд

        this._sendMessage('Бот запущен!')
    }

    stopCheckSchedule() {
        clearInterval(this._checkScheduleIntervalId);
        this._sendMessage('Бот приостановлен!')
    }
}