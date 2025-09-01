import { google } from "googleapis";
import fs from "fs";

const CREDENTIALS = JSON.parse(fs.readFileSync("credentials.json")); // JSON сервисного аккаунта

// Авторизация Google API
const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

export const sheetsClient = google.sheets({ version: "v4", auth })