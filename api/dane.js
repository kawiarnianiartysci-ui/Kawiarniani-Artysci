// Dane z arkusza dla przeglądarki (zapas, gdy strona nie dostała ich
// doklejonych przez api/page.js) — już bez adresów email partnerów.
import { getSheetData } from "./_sheet.js";

export default async function handler(req, res) {
  try {
    const { restText, workText } = await getSheetData();
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
    res.status(200).json({ r: restText, w: workText });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Nie udało się pobrać danych z arkusza." });
  }
}
