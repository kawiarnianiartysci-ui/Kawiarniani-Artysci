// ══════════════════════════════════════════════════════════════
// 📊  Arkusz Google po stronie serwera
// ══════════════════════════════════════════════════════════════
// Serwer sam czyta dane partnerów z arkusza — do zapytań (adresy email
// partnerów bierzemy stąd, nie z przeglądarki, żeby nikt nie mógł podać
// dowolnego adresu) i do podstron profili/okazji (tytuły, opisy, zdjęcia dla
// Google i podglądów linków). Linki, parser i zamiana wiersza na obiekt są
// w src/dane.js — dokładnie te same, których używa strona w przeglądarce.
import {
  CSV_RESTAURANTS_URL, CSV_WORKSHOPS_URL, csvToObjects,
  restaurantFromRow, workshopFromRow,
} from "../src/dane.js";

// Pamięć podręczna na kilka minut — ta sama instancja funkcji obsługuje
// zwykle wiele zapytań z rzędu, nie ma sensu za każdym razem pytać Google'a.
const CACHE_MS = 5 * 60 * 1000;
let cache = null; // { at, restText, workText, restaurants, workshops }

export async function getSheetData() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const [restText, workText] = await Promise.all([
    fetch(CSV_RESTAURANTS_URL).then(r => { if (!r.ok) throw new Error(`Arkusz (restauracje): ${r.status}`); return r.text(); }),
    fetch(CSV_WORKSHOPS_URL).then(r => { if (!r.ok) throw new Error(`Arkusz (warsztaty): ${r.status}`); return r.text(); }),
  ]);
  cache = {
    at: Date.now(),
    // Surowe teksty CSV — doklejane do strony, żeby przeglądarka nie musiała
    // drugi raz pobierać arkusza (strona startuje od razu, bez "Wczytywanie...").
    restText, workText,
    restaurants: csvToObjects(restText).map(restaurantFromRow),
    workshops: csvToObjects(workText).map(workshopFromRow),
  };
  return cache;
}
