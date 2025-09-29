import dayjs from "dayjs";
import {
    FIVE_MINUTES_REMAINING,
    TWENTY_MINUTES_REMAINING,
    SHEET_HEAD_DATE_KEY,
    SHEET_HEAD_HOUSE_FORMAT_KEY,
    SHEET_HEAD_LOCATION_KEY,
    SHEET_HEAD_NOTE_KEY,
    SHEET_HEAD_TIME_KEY, CHECK_REMINDERS_INTERVAL
} from "../constants/index.js";

export class HousesReminders {
    constructor({ houses, bot, chatId }) {
        this._housesService = houses;
        this._bot = bot;
        this._chatId = chatId;
        this._checkRemindersIntervalId = null
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

    _checkReminders() {
        const houses = this._housesService.getHouses()
        const nowDate = dayjs();

        houses.forEach((house) => {
            const { id, date: isoDate, location, format, screenshot, note, reminders } = house

            const date = dayjs(isoDate)
            const time = date.format('HH:mm')

            const dateMessage = `- ${SHEET_HEAD_DATE_KEY}: ${date.format('DD MMMM')}`
            const timeMessage = `- ${SHEET_HEAD_TIME_KEY}: ${time}`
            const locationMessage = `- ${SHEET_HEAD_LOCATION_KEY}: ${location}`
            const houseFormatMessage = `- ${SHEET_HEAD_HOUSE_FORMAT_KEY}: ${format}x${format}`
            const noteMessage = `- ${SHEET_HEAD_NOTE_KEY}: ${note}`

            const isEventHasAlreadyDone = nowDate.isAfter(date)
            const isTwentyMinutesRemaining = nowDate.add(TWENTY_MINUTES_REMAINING, 'minute').isSame(date, 'minute')
            const isFiveMinutesRemaining = nowDate.add(FIVE_MINUTES_REMAINING, 'minute').isSame(date, 'minute')

            const isTwentyMinutesRemainHasBeenSent = reminders[TWENTY_MINUTES_REMAINING]
            const isFiveMinutesRemainHasBeenSent = reminders[FIVE_MINUTES_REMAINING]

            const withNoteMessage = note ? [noteMessage] : []
            const message = [dateMessage, locationMessage, timeMessage, houseFormatMessage, ...withNoteMessage].join('\n')

            // Уведомление за 20 минут
            if (isTwentyMinutesRemaining && !isTwentyMinutesRemainHasBeenSent) {
                this._sendMessage(`🏠Через 20 минут слет на дом!\n\n${message}`, screenshot);

                house.reminders[TWENTY_MINUTES_REMAINING] = true;
                this._housesService.updateHouses(house)
            }

            // Уведомление за 5 минут
            if (isFiveMinutesRemaining && !isFiveMinutesRemainHasBeenSent) {
                this._sendMessage( `🔥Через 5 минут слет на дом!\n\n${message}`, screenshot);

                house.reminders[FIVE_MINUTES_REMAINING] = true;
                this._housesService.updateHouses(house)
            }

            if(isEventHasAlreadyDone) {
                this._housesService.deleteHouse(house.id)
            }
        })
    }

    startCheckReminders() {
        if(this._checkRemindersIntervalId) {
            this._sendMessage('Бот уже запущен!')
        } else {
            this._checkReminders()
            this._checkRemindersIntervalId = setInterval(() => this._checkReminders(), CHECK_REMINDERS_INTERVAL);
            this._sendMessage('Бот запущен!')
        }

    }

    stopCheckReminders() {
        clearInterval(this._checkRemindersIntervalId);
        this._sendMessage('Бот приостановлен!')
    }
}