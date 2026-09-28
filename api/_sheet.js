// ══════════════════════════════════════════════════════════════
// 📊  Arkusz Google po stronie serwera
// ══════════════════════════════════════════════════════════════
// Serwer sam czyta dane partnerów (adresy email, nazwy) z arkusza, zamiast
// ufać temu, co przyśle przeglądarka — inaczej każdy mógłby podać dowolny
// adres i wysyłać przez naszą stronę maile podpisane "Kawiarniani Artyści".
//
// ⚠️ Linki MUSZĄ być identyczne jak CSV_RESTAURANTS_URL / CSV_WORKSHOPS_URL
// w src/App.jsx — przy zmianie publikacji arkusza zmień w obu miejscach.
const CSV_RESTAURANTS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/pub?gid=563383430&single=true&output=csv";
const CSV_WORKSHOPS_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/pub?gid=273766010&single=true&output=csv";

// Ten sam parser co w App.jsx (obsługuje cudzysłowy i przecinki w polach).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some(v => v !== "")) rows.push(row); }
  return rows;
}

function csvToObjects(text) {
  const [header, ...body] = parseCSV(text);
  if (!header) return [];
  return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const toBool = v => /^(true|1|tak|prawda)$/i.test((v || "").trim());

// Pamięć podręczna na kilka minut — ta sama instancja funkcji obsługuje
// zwykle wiele zapytań z rzędu, nie ma sensu za każdym razem pytać Google'a.
const CACHE_MS = 5 * 60 * 1000;
let cache = null; // { at, restaurants, workshops }

export async function getSheetData() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const [restText, workText] = await Promise.all([
    fetch(CSV_RESTAURANTS_URL).then(r => { if (!r.ok) throw new Error(`Arkusz (restauracje): ${r.status}`); return r.text(); }),
    fetch(CSV_WORKSHOPS_URL).then(r => { if (!r.ok) throw new Error(`Arkusz (warsztaty): ${r.status}`); return r.text(); }),
  ]);
  const restaurants = csvToObjects(restText).map(row => ({ ...row, comingSoon: toBool(row.comingSoon) }));
  const workshops = csvToObjects(workText).map(row => ({ ...row, comingSoon: toBool(row.comingSoon) }));
  cache = { at: Date.now(), restaurants, workshops };
  return cache;
}
