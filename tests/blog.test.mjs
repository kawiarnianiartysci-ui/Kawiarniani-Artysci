// Testy bloga — uruchamiane przy każdym buildzie na Vercelu ("npm run build").
// Nieudany test zatrzymuje wdrożenie, więc zepsuty parser nie trafi na stronę.
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseDoc, parseDocText, cleanHref, decodeEntities } from "../api/_blogDoc.js";
import { blogPostFromRow } from "../src/dane.js";
import { parseRoute, formatPostDate, blogImgPath, pageTitle, BLOG_TITLE } from "../src/seo.js";

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log("ok -", name); }
  catch (e) { failed++; console.error("FAIL -", name, "\n  ", e.message); }
};

const fixture = fs.readFileSync(new URL("./fixtures/doc-export.html", import.meta.url), "utf-8");
const doc = parseDoc(fixture, { imgSrc: i => `/blog-img/test/${i}-1080.webp` });

test("decodeEntities: liczbowe i nazwane", () => {
  assert.equal(decodeEntities("&#346;wi&#261;t &oacute; &ndash; &amp; &#x41;"), "Świąt ó – & A");
});
test("tytuł = pierwszy nagłówek 1, notatka w nawiasach przed nim pominięta", () => {
  assert.equal(doc.title, "Świąteczna integracja – test");
  assert.ok(!doc.html.includes("Notatka"));
});
test("wstęp = pierwszy akapit po tytule", () => {
  assert.ok(doc.intro.startsWith("Pierwszy akapit o integracji w Poznaniu."), doc.intro);
});
test("pogrubienie i kursywa z klas CSS", () => {
  assert.ok(doc.html.includes("<strong>Pogrubione</strong>"));
  assert.ok(doc.html.includes("<em>kursywa</em>"));
});
test("link do własnej strony → adres względny", () => {
  assert.ok(doc.html.includes('<a href="/integracja-firmowa">oferty</a>'));
});
test("link zewnętrzny → odwinięty z google.com/url, nowa karta", () => {
  assert.ok(doc.html.includes('<a href="https://example.com/a?b=1" target="_blank" rel="noopener">zewnętrzny</a>'), doc.html);
});
test("brak śmieci: komentarze, skrypty, style, klasy, h1, puste akapity", () => {
  for (const bad of ["[a]", "Komentarz", "script", "alert", "style=", "class=", "<h1", "<p></p>"])
    assert.ok(!doc.html.includes(bad), `znaleziono: ${bad}`);
});
test("zdjęcia: wyciągnięte z base64, zdjęcie z nagłówka trafia PRZED nagłówek", () => {
  assert.equal(doc.images.length, 2);
  assert.deepEqual(doc.images[0], { mime: "image/png", data: "iVBORw0KGgo=" });
  const img0 = doc.html.indexOf('<img src="/blog-img/test/0-1080.webp" alt="Świąteczna integracja – test — zdjęcie 1" loading="lazy">');
  assert.ok(img0 >= 0, doc.html);
  assert.ok(img0 < doc.html.indexOf("<h2>Dlaczego warsztat?</h2>"));
});
test("listy", () => {
  assert.ok(doc.html.includes("<ul>\n<li>punkt jeden</li>\n<li><strong>punkt dwa</strong></li>\n</ul>"), doc.html);
});
test("FAQ z sekcji Najczęstsze pytania, kończy się na następnym h2", () => {
  assert.deepEqual(doc.faq, [
    { q: "Ile osób może wziąć udział?", a: "Od 4 do 15 osób." },
    { q: "Czy dojedziecie do biura?", a: "Tak, większość artystów dojedzie." },
  ]);
});
test("liczba słów", () => { assert.ok(doc.words > 20 && doc.words < 80, String(doc.words)); });
test("cleanHref: odrzuca javascript:, skraca adres strony", () => {
  assert.equal(cleanHref("javascript:alert(1)"), null);
  assert.deepEqual(cleanHref("https://kawiarnianiartysci.pl"), { href: "/", external: false });
  assert.deepEqual(cleanHref("https://www.google.com/url?q=https://www.kawiarnianiartysci.pl/blog&amp;sa=D"), { href: "/blog", external: false });
});
test("parseDocText (eksport txt dla listy wpisów)", () => {
  const t = parseDocText("﻿[Notatka]\nŚwiąteczna integracja\nKrótko.\nTo jest pierwszy prawdziwy akapit wpisu o integracji.\n* punkt\n");
  assert.deepEqual(t, { title: "Świąteczna integracja", intro: "To jest pierwszy prawdziwy akapit wpisu o integracji.", words: 13 });
});

test("wiersz arkusza Blog", () => {
  assert.deepEqual(blogPostFromRow({
    link: "https://docs.google.com/document/d/1_OOqss8aB0Sv_QiT-4F4F2r96jNednYY1M0f5LIBw1E/edit?usp=sharing",
    data: "6.10.2026", adres: "Świąteczna Integracja", okazja: "integracja-firmowa", opublikowany: "TAK",
  }), { docId: "1_OOqss8aB0Sv_QiT-4F4F2r96jNednYY1M0f5LIBw1E", date: "2026-10-06", slug: "swiateczna-integracja", occasion: "integracja-firmowa", published: true });
  assert.equal(blogPostFromRow({ link: "https://docs.google.com/document/d/e/2PACX-abc/pub", data: "2026-10-06" }).docId, null);
  assert.equal(blogPostFromRow({ link: "x", data: "2026-1-5", opublikowany: "nie" }).date, "2026-01-05");
  assert.equal(blogPostFromRow({ link: "x", opublikowany: "nie" }).published, false);
});
test("adresy bloga", () => {
  assert.deepEqual(parseRoute("/blog"), { type: "blogList" });
  assert.deepEqual(parseRoute("/Blog/"), { type: "blogList" });
  assert.deepEqual(parseRoute("/blog/Świąteczna-X"), { type: "blogPost", slug: "swiateczna-x" });
  assert.deepEqual(parseRoute("/blog/a/b"), { type: "notfound" });
});
test("pomocnicze: data, adres zdjęcia, tytuł karty", () => {
  assert.equal(formatPostDate("2026-10-06"), "6 października 2026");
  assert.equal(formatPostDate(""), "");
  assert.equal(blogImgPath("wpis", 0, 640, "webp"), "/blog-img/wpis/0-640.webp");
  assert.equal(pageTitle({ landing: { type: "blog", title: "X" } }), "X");
  assert.equal(pageTitle({ landing: { type: "blog" } }), BLOG_TITLE);
});

if (failed) { console.error(`\n${failed} test(ów) nie przeszło — przerywam build.`); process.exit(1); }
console.log("\nWszystkie testy bloga przeszły.");
