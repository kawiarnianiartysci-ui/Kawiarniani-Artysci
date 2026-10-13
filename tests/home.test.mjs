// Testy cen na stronie głównej — uruchamiane przy każdym buildzie na Vercelu.
// Pilnują, żeby index.html nadal zawierał teksty, w które serwer wstawia
// aktualne ceny z arkusza (inaczej zostałyby stare liczby wpisane na sztywno).
import assert from "node:assert/strict";
import fs from "node:fs";
import { homePrices, applyHomePrices } from "../src/seo.js";

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log("ok -", name); }
  catch (e) { failed++; console.error("FAIL -", name, "\n  ", e.message); }
};

const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf-8");

const workshops = [
  { pricePerPerson: 35, forKids: true, kidsOnly: true },
  { pricePerPerson: 40, forKids: true },
  { pricePerPerson: 80 },
  { pricePerPerson: 200 },
  { pricePerPerson: 10, comingSoon: true },
  { pricePerPerson: 999, comingSoon: true },
  { pricePerPerson: null },
];

test("homePrices: dorośli bez kidsOnly, dzieci tylko forKids, pomija comingSoon", () => {
  assert.deepEqual(homePrices(workshops), { adults: 40, kids: 35, low: 35, high: 200 });
});
test("homePrices: brak cen = null (zostają liczby z index.html)", () => {
  assert.equal(homePrices([]), null);
  assert.equal(applyHomePrices("abc", null), "abc");
});
test("index.html zawiera wszystkie miejsca na ceny", () => {
  assert.match(indexHtml, /"priceRange": "[^"]*"/);
  assert.match(indexHtml, /"lowPrice": "\d+"/);
  assert.match(indexHtml, /"highPrice": "\d+"/);
  assert.match(indexHtml, /Warsztaty od \d+ zł za osobę, a dla dzieci od \d+ zł\./);
});
test("applyHomePrices podmienia ceny w index.html", () => {
  const out = applyHomePrices(indexHtml, { adults: 45, kids: 30, low: 30, high: 250 });
  assert.match(out, /"priceRange": "30–250 zł"/);
  assert.match(out, /"lowPrice": "30"/);
  assert.match(out, /"highPrice": "250"/);
  assert.match(out, /Warsztaty od 45 zł za osobę, a dla dzieci od 30 zł\./);
});

if (failed) { console.error(`\n${failed} test(ów) nie przeszło`); process.exit(1); }
console.log("\nWszystkie testy strony głównej OK");
