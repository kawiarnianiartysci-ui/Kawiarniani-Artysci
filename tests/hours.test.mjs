// Testy filtra godzin (restauracje + dostępność artystów) — uruchamiane przy
// każdym buildzie na Vercelu, tak jak testy bloga.
import assert from "node:assert/strict";
import { parseHours, fitsHours, parseDurationHours } from "../src/dane.js";

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log("ok -", name); }
  catch (e) { failed++; console.error("FAIL -", name, "\n  ", e.message); }
};

const MON = "2026-10-12", THU = "2026-10-15", SAT = "2026-10-17";

test("parseHours: jeden przedział, zamknięte, kilka przedziałów", () => {
  const h = parseHours("pon=17:00-21:00;czw=;pt=08:00-12:00,18:00-22:00");
  assert.deepEqual(h.pon, [{ open: "17:00", close: "21:00" }]);
  assert.deepEqual(h.czw, []);
  assert.equal(h.pt.length, 2);
  assert.equal(h.sob, undefined);
});
test("pusta komórka = bez ograniczeń", () => {
  assert.equal(fitsHours(parseHours(""), MON, "10:00", 2), true);
});
test("brak daty albo godziny = bez ograniczeń", () => {
  const h = parseHours("pon=17:00-21:00");
  assert.equal(fitsHours(h, "", "10:00", 2), true);
  assert.equal(fitsHours(h, MON, "", 2), true);
});
test("warsztat musi się zmieścić razem z czasem trwania", () => {
  const h = parseHours("pon=17:00-21:00;wt=17:00-21:00;sr=17:00-21:00;czw=;pt=17:00-21:00;sob=15:00-20:00;nd=");
  assert.equal(fitsHours(h, MON, "17:00", 2), true);
  assert.equal(fitsHours(h, MON, "19:30", 2), false); // skończyłby się 21:30
  assert.equal(fitsHours(h, MON, "16:00", 2), false); // przed startem dostępności
  assert.equal(fitsHours(h, THU, "17:00", 1), false); // czwartek zamknięty
  assert.equal(fitsHours(h, SAT, "15:00", 2), true);
});
test("dzień nieopisany w komórce = niedostępny", () => {
  assert.equal(fitsHours(parseHours("pon=10:00-20:00"), SAT, "12:00", 1), false);
});
test("kilka przedziałów w jednym dniu", () => {
  const h = parseHours("pon=08:00-12:00,18:00-22:00");
  assert.equal(fitsHours(h, MON, "10:00", 2), true);
  assert.equal(fitsHours(h, MON, "11:00", 2), false);
  assert.equal(fitsHours(h, MON, "18:00", 2), true);
  assert.equal(fitsHours(h, MON, "14:00", 1), false);
});
test("czas trwania 0 (lokal, warsztat jeszcze niewybrany) — start przed zamknięciem", () => {
  const h = parseHours("pon=09:00-16:00");
  assert.equal(fitsHours(h, MON, "15:30", 0), true);
  assert.equal(fitsHours(h, MON, "16:00", 0), false);
});
test("czas trwania z zakresu bierze górną granicę", () => {
  assert.equal(parseDurationHours("2-3 godz"), 3);
  assert.equal(parseDurationHours("1,5 godz."), 1.5);
});

if (failed) { console.error(`\n${failed} test(ów) nie przeszło — przerywam build.`); process.exit(1); }
console.log("\nWszystkie testy godzin przeszły.");
