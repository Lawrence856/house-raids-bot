import {sheetsApi} from "../api/google/sheetsApi/index.js";
import fs from "fs";
import path from "path";
import {
    FIVE_MINUTES_REMAINING,
    TWENTY_MINUTES_REMAINING,
    SHEET_HEAD_DATE_KEY,
    SHEET_HEAD_HOUSE_FORMAT_KEY,
    SHEET_HEAD_LOCATION_KEY,
    SHEET_HEAD_NOTE_KEY,
    SHEET_HEAD_SCREEN_LINK_KEY,
    SHEET_HEAD_TIME_KEY, READ_SHEET_INTERVAL
} from "../constants/index.js";
import dayjs from "dayjs";


export class Houses {
    constructor() {
        this.housesFile = path.join('./data/', "houses.json");
        this._houses = this._loadHousesFile()
    }

    _generateIdByDate(date) {
        return new Date(date).getTime().toString()
    }

    _saveHousesFile(data) {
        try {
            fs.writeFileSync(this.housesFile, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error("Ошибка записи houses.json:", e);
        }
    }

    _loadHousesFile() {
        if (fs.existsSync(this.housesFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.housesFile));
            } catch (e) {
                console.error("Ошибка чтения houses.json:", e);
                return [];
            }
        }
        return [];
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

    setHouses(payload) {
        this._houses = payload
        this._saveHousesFile(this._houses)
    }

    getHouses() {
        return this._houses
    }

    updateHouses(payload) {
        const index = this._houses.findIndex((house) => house.id === payload.id);

        if (index) {
            this._houses.splice(index, 1, payload)
            this._saveHousesFile(this._houses)
        }
    }

    deleteHouse (id) {
        const index = this._houses.findIndex((house) => house.id === id);

        if(index) {
            this._houses.splice(index, 1)
            this._saveHousesFile(this._houses)
        }
    }


    async _readSheet() {
        const { headers, rows } = await sheetsApi.getSheetData();

        if (!rows.length) return

        const houses = rows.reduce((acc, row) => {

            const date = row[headers.indexOf(SHEET_HEAD_DATE_KEY)]
            const time = row[headers.indexOf(SHEET_HEAD_TIME_KEY)]
            const location = row[headers.indexOf(SHEET_HEAD_LOCATION_KEY)]
            const format = row[headers.indexOf(SHEET_HEAD_HOUSE_FORMAT_KEY)]
            const screenshot = row[headers.indexOf(SHEET_HEAD_SCREEN_LINK_KEY)]
            const note = row[headers.indexOf(SHEET_HEAD_NOTE_KEY)]

            if (date === "Invalid Date") return acc

            const [day, mouth, year] = date.split('.');

            const houseDate = dayjs(`${year}-${mouth}-${day} ${time}`);
            const houseDateIso = houseDate.format();
            const id = this._generateIdByDate(houseDateIso)
            const hasId = this._houses.some((house) => house.id === id);

            if(hasId) {
                const event = this._houses.find((house) => house.id === id);
                const index = this._houses.findIndex((house) => house.id === id);

                acc.splice(index, 1, event);
            } else {
                const event = {
                    id,
                    date: houseDateIso,
                    location: location ?? null,
                    format: format ?? null,
                    screenshot: this._convertDriveLink(screenshot) ?? null,
                    note: note ?? null,
                    reminders: {
                        [TWENTY_MINUTES_REMAINING]: false,
                        [FIVE_MINUTES_REMAINING]: false
                    }
                }

                acc.push(event);
            }

            return acc
        }, [])

        this.setHouses(houses)
    }
    
    startReadingSheet() {
        this._readSheet()
        setInterval(() => this._readSheet(), READ_SHEET_INTERVAL)
    }
}