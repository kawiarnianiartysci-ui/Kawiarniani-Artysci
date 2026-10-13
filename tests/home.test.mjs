// Testy cen na stronie głównej — uruchamiane przy każdym buildzie na Vercelu.
// Pilnują, żeby index.html nadal zawierał teksty, w które serwer wstawia
// aktualne ceny z arkusza (inaczej zostałyby stare liczby wpisane na sztywno).
import assert from "node:assert/strict";
import fs from "node:fs";
import { homePrices, applyHomePrices, workshopTitle, restaurantTitle, workshopDescription, restaurantDescription } from "../src/seo.js";

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
  assert.match(indexHtml, /"lowPrice": "\d+"/);
  assert.match(indexHtml, /"highPrice": "\d+"/);
  assert.match(indexHtml, /Warsztaty od \d+ zł za osobę, a dla dzieci od \d+ zł\./);
});
test("applyHomePrices podmienia ceny w index.html", () => {
  const out = applyHomePrices(indexHtml, { adults: 45, kids: 30, low: 30, high: 250 });
  assert.match(out, /"lowPrice": "30"/);
  assert.match(out, /"highPrice": "250"/);
  assert.match(out, /Warsztaty od 45 zł za osobę, a dla dzieci od 30 zł\./);
});
test("tytuły profili mieszczą się w 62 znakach, najpierw odpada nazwa platformy", () => {
  assert.equal(workshopTitle({ name: "Art & Soul", artist: "Mira Feter" }), "Art & Soul — Mira Feter | Warsztaty w Poznaniu");
  assert.equal(workshopTitle({ name: "Ebru", artist: "Ayşe" }), "Ebru — Ayşe | Warsztaty w Poznaniu · Kawiarniani Artyści");
  const long = workshopTitle({ name: "Ślady natury - stwórz własną botaniczną dekorację z suszonych roślin", artist: "Lena Tsybulko" });
  assert.ok(long.length <= 62, long);
  assert.ok(long.startsWith("Ślady natury") && long.endsWith(" | Poznań"), long);
  assert.equal(workshopTitle({ name: "Ku lekkości! Warsztaty zespołowej improwizacji", artist: "Agnieszka" }), "Ku lekkości! Warsztaty zespołowej improwizacji | Poznań");
  const longPlace = restaurantTitle({ name: "Republika Słoneczna Kawiarnia i Bistro Ogrodowe z Ogrodem Zimowym" });
  assert.ok(longPlace.length <= 62 && longPlace.endsWith(", Poznań"), longPlace);
  assert.equal(restaurantTitle({ name: "Żuk" }), "Żuk, Poznań — eventy z warsztatami | Kawiarniani Artyści");
});
test("opisy profili do 155 znaków, cena zawsze zostaje", () => {
  const d = workshopDescription({ description: "słowo ".repeat(60), pricePerPerson: 120 });
  assert.ok(d.length <= 155, String(d.length));
  assert.ok(d.endsWith("Cena: 120 zł/os. Warsztat na eventy grupowe w Poznaniu."), d);
  assert.ok(restaurantDescription({ description: "słowo ".repeat(60) }).length <= 155);
  assert.equal(workshopDescription({ pricePerPerson: 50 }), "Cena: 50 zł/os. Warsztat na eventy grupowe w Poznaniu.");
});

if (failed) { console.error(`\n${failed} test(ów) nie przeszło`); process.exit(1); }
console.log("\nWszystkie testy strony głównej OK");
