import {sheetsClient} from "../clients.js";

export const sheetsApi = {
    async getSheetData() {
        const res = await sheetsClient.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "A1:Z", // диапазон
        });

        return {
            headers: res.data.values[0] || [],
            rows: res.data.values.slice(1),
        };
    }
}