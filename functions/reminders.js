import fs from "fs";
import path from "path";

const REMINDERS_FILE = path.join('./', "reminders.json");

export function loadReminders() {
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

export function saveReminders(data) {
    try {
        fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Ошибка записи reminders.json:", e);
    }
}

