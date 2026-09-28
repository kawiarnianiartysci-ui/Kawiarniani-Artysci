import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, IS_PRODUCTION, SITE_URL, signPayload, emailHtml, escapeHtml, nl2br, sendEmail } from "./_shared.js";
import { getSheetData } from "./_sheet.js";

// Prosty test formatu adresu — celowo odrzuca też znaki, które mogłyby
// "wyjść" z kodu HTML maila (<>"'&), bo adres klienta trafia do treści.
const EMAIL_RE = /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[^\s@<>"'&]+$/;
const isEmail = v => typeof v === "string" && v.length <= 200 && EMAIL_RE.test(v.trim());

// Wszystko, co wpisał klient, przechodzi przez escapeHtml (i przycięcie
// długości), zanim trafi do treści maila — bez tego dało się wkleić do
// formularza własne znaczniki HTML, np. fałszywy przycisk z linkiem.
const txt = (v, max = 300) => escapeHtml(String(v ?? "").trim().slice(0, max));
const longTxt = (v, max = 3000) => nl2br(String(v ?? "").trim().slice(0, max));
const num = v => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) && n >= 0 && n < 10000 ? n : undefined; };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body || {};

    if (!body.clientName || !isEmail(body.clientEmail)) {
      res.status(400).json({ error: "Brak imienia lub poprawnego adresu email klienta." });
      return;
    }

    // Brak klucza = źle ustawione zmienne środowiskowe w Vercelu (np. wersja
    // podglądowa bez zaznaczonego środowiska "Preview") — wyraźny wpis w
    // logach zamiast tajemniczego błędu.
    if (!process.env.RESEND_API_KEY) {
      console.error("Brak RESEND_API_KEY w zmiennych środowiskowych tego środowiska Vercela.");
      res.status(500).json({ error: "Nie udało się wysłać zapytania." });
      return;
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    const isKidsEvent = !!body.isKidsEvent;
    const isOwnPlace = !!body.isOwnPlace;

    const clientName  = txt(body.clientName, 200);
    const clientEmail = body.clientEmail.trim();
    const clientPhone = txt(body.clientPhone, 50);
    const message     = longTxt(body.message);
    const date        = txt(body.date, 100);
    const groupSize   = num(body.groupSize);
    const kidsCount   = isKidsEvent ? num(body.kidsCount) : undefined;
    const adultsCount = isKidsEvent ? num(body.adultsCount) : undefined;
    const kidsPackageName = isKidsEvent ? txt(body.kidsPackageName, 200) : undefined;
    const kidsAmountLabel = isKidsEvent ? txt(body.kidsAmountLabel, 200) : undefined;
    const requesterType   = body.requesterType === "business" ? "business" : body.requesterType === "private" ? "private" : undefined;
    const businessName    = txt(body.businessName, 200);
    const invoiceRequired = typeof body.invoiceRequired === "boolean" ? body.invoiceRequired : undefined;

    // ── Partnerzy: dane WYŁĄCZNIE z arkusza, szukane po id ─────────
    // Przeglądarka przysyła tylko id wybranego warsztatu/restauracji; adresy
    // email, nazwy i wymagania artysty serwer bierze sam z arkusza. Jeśli
    // arkusz chwilowo nie odpowiada, zapytanie i tak trafia do Joanny (z
    // ostrzeżeniem), żeby żaden klient nie przepadł.
    const warnings = [];
    let r = null, w = null;
    try {
      const sheet = await getSheetData();
      if (body.workshopId) {
        w = sheet.workshops.find(x => x.id === body.workshopId) || null;
        if (!w) warnings.push(`Nie znaleziono w arkuszu warsztatu o id „${txt(body.workshopId, 200)}" — mail do artysty NIE został wysłany.`);
      }
      if (!isOwnPlace && body.restaurantId) {
        r = sheet.restaurants.find(x => x.id === body.restaurantId) || null;
        if (!r) warnings.push(`Nie znaleziono w arkuszu restauracji o id „${txt(body.restaurantId, 200)}" — mail do restauracji NIE został wysłany.`);
      }
    } catch (err) {
      console.error("Arkusz:", err);
      warnings.push("Nie udało się pobrać arkusza Google — to zapytanie NIE trafiło do artysty ani restauracji. Prześlij je ręcznie.");
    }
    if (w && w.comingSoon) warnings.push(`Warsztat „${escapeHtml(w.name)}" ma w arkuszu comingSoon = TRUE (szkic) — mail do artysty NIE został wysłany.`);
    if (r && r.comingSoon) warnings.push(`Restauracja „${escapeHtml(r.name)}" ma w arkuszu comingSoon = TRUE (szkic) — mail do restauracji NIE został wysłany.`);

    // Nazwy: z arkusza, a gdy wpisu nie znaleziono — to, co przysłała
    // przeglądarka (tylko do wyświetlenia Joannie, nigdy jako adres).
    const workshopName   = w ? escapeHtml(w.name) : txt(body.workshopName, 200);
    const artistName     = w ? escapeHtml(w.artist) : txt(body.artistName, 200);
    const restaurantName = isOwnPlace ? "" : (r ? escapeHtml(r.name) : txt(body.restaurantName, 200));
    const artistEmail     = w && !w.comingSoon && isEmail(w.email) ? w.email.trim() : "";
    const restaurantEmail = r && !r.comingSoon && isEmail(r.email) ? r.email.trim() : "";
    const artistInvoicing    = w ? escapeHtml(w.invoicing) : "";
    const artistRequirements = w ? escapeHtml(w.requirements) : "";

    // Sekcja doklejana do każdego z 3 maili, tylko gdy zapytanie dotyczy
    // eventu dla dzieci — całkowicie nieobecna (pusty string) dla zwykłych
    // zapytań, więc istniejące szablony maili wyglądają identycznie jak dziś.
    const kidsEventBlock = isKidsEvent ? `
      <p><strong>🎈 To zapytanie dotyczy eventu dla dzieci (urodziny/impreza).</strong></p>
      <ul>
        <li>Liczba dzieci: ${kidsCount ?? "-"}</li>
        <li>Liczba dorosłych: ${adultsCount ?? "-"}</li>
        <li>Wybrany pakiet: ${kidsPackageName || "-"}</li>
        <li>Kwota: ${kidsAmountLabel || "do ustalenia"}</li>
      </ul>
    ` : "";

    // Ścieżka "Mam miejsce" (artysta dojeżdża do klienta, bez restauracji) —
    // sekcja doklejana tylko wtedy, całkowicie nieobecna dla zwykłych zapytań.
    const PLACE_TYPE_LABELS = { dom:"Dom", mieszkanie:"Mieszkanie w bloku", ogrod:"Ogród", sala:"Sala", osobna_sala:"Osobna sala", wspolna_sala:"Miejsce na wspólnej sali", inne:"Inne" };
    const yn = v => (v === "tak" ? "Tak" : v === "nie" ? "Nie" : "-");
    const placeNotes = longTxt(body.placeNotes, 2000);
    const placeInfoBlock = isOwnPlace ? `
      <p><strong>📍 Klient ma własne miejsce — warsztat odbędzie się bez restauracji.</strong></p>
      <ul>
        <li>Adres / lokalizacja: ${txt(body.placeAddress) || "-"}</li>
        <li>Typ miejsca: ${PLACE_TYPE_LABELS[body.placeType] || txt(body.placeType, 50) || "-"}</li>
        <li>Osobna sala / wydzielona przestrzeń: ${yn(body.placeHasSeparateRoom)}</li>
        <li>Metraż: ${txt(body.placeArea, 100) || "-"}</li>
        <li>Dostępne stoły i krzesła: ${yn(body.placeHasTables)}</li>
        <li>Dostęp do wody: ${yn(body.placeHasWater)}</li>
        <li>Dostęp do prądu: ${yn(body.placeHasPower)}</li>
        ${placeNotes ? `<li>Uwagi dodatkowe: ${placeNotes}</li>` : ""}
      </ul>
    ` : "";

    const requesterLine = isOwnPlace && requesterType ? `<p><strong>Zamawia jako:</strong> ${requesterType === "business" ? `Restauracja — ${businessName || "-"}` : "Osoba prywatna"}</p>` : "";
    const invoiceLine = isOwnPlace && invoiceRequired !== undefined ? `<p><strong>Wymagana faktura VAT:</strong> ${invoiceRequired ? "Tak" : "Nie"}</p>` : "";

    const payload = {
      clientName, clientEmail, clientPhone,
      restaurantName, restaurantEmail,
      artistName, workshopName, artistEmail,
      artistInvoicing, artistRequirements,
      groupSize: groupSize ?? "", date, message,
      isKidsEvent: isKidsEvent || undefined,
      kidsCount, adultsCount, kidsPackageName, kidsAmountLabel,
      ts: Date.now(),
    };
    const { data, sig } = signPayload(payload);
    const acceptUrl = `${SITE_URL}/api/respond?action=accept&data=${data}&sig=${sig}`;
    const declineUrl = `${SITE_URL}/api/respond?action=decline&data=${data}&sig=${sig}`;
    const proposeUrl = `${SITE_URL}/api/respond?action=propose&data=${data}&sig=${sig}`;

    const sends = [];

    if (artistEmail) {
      sends.push(sendEmail(resend, {
        from: FROM_EMAIL,
        to: artistEmail,
        subject: isOwnPlace
          ? `Nowe zapytanie: dojazd do klienta — ${workshopName || "warsztat"}`
          : `Nowe zapytanie: ${restaurantName || "restauracja"} — ${workshopName || "warsztat"}`,
        html: emailHtml(`
          <p>Cześć ${artistName || ""}!</p>
          <p>${isOwnPlace
            ? `Klient chce zaprosić Cię do siebie na warsztat „${workshopName || ""}" — bez restauracji, na własnym miejscu. Oto szczegóły:`
            : `Restauracja <strong>${restaurantName || ""}</strong> dostała zapytanie o Twój warsztat „${workshopName || ""}". Oto szczegóły:`}</p>
          ${requesterLine}
          ${invoiceLine}
          ${kidsEventBlock}
          ${placeInfoBlock}
          <ul>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize ?? "-"}</li>
            <li>Kontakt do klienta: ${clientName} — ${clientEmail}${clientPhone ? `, ${clientPhone}` : ""}</li>
            ${message ? `<li>Wiadomość od klienta: ${message}</li>` : ""}
          </ul>
          <p>Daj nam znać, czy ten termin Ci pasuje:</p>
          <p>
            <a href="${acceptUrl}" style="background:#432A16;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;margin-right:10px;display:inline-block;">Mogę — akceptuję</a>
            <a href="${declineUrl}" style="background:#999;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;margin-right:10px;display:inline-block;">Niestety nie mogę</a>
            <a href="${proposeUrl}" style="background:#fff;color:#432A16;border:2px solid #432A16;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Proponuję inne terminy</a>
          </p>
          <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
        `),
      }));
    }

    if (restaurantEmail) {
      sends.push(sendEmail(resend, {
        from: FROM_EMAIL,
        to: restaurantEmail,
        subject: "Nowe zapytanie o event — czekamy na potwierdzenie artysty",
        html: emailHtml(`
          <p>Cześć!</p>
          <p>Macie nowe zapytanie o wspólny event:</p>
          ${kidsEventBlock}
          <ul>
            <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""}</li>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize ?? "-"}</li>
            <li>Klient: ${clientName}</li>
          </ul>
          <p>Czekamy teraz na potwierdzenie terminu przez artystę — damy znać mailowo, jak tylko odpowie.</p>
          <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
        `),
      }));
    }

    // Kopia do Joanny — jedyny mail, który MUSI wyjść (patrz niżej).
    const ownerSend = sendEmail(resend, {
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `${warnings.length ? "⚠️ " : ""}Nowe zapytanie: ${restaurantName || (isOwnPlace ? "bez restauracji (mam miejsce)" : "-")} + ${workshopName || "-"}`,
      html: emailHtml(`
        ${warnings.length ? `<div style="background:#FDECEA;padding:10px 14px;border-radius:8px;"><strong>Uwaga:</strong><ul>${warnings.map(x => `<li>${x}</li>`).join("")}</ul></div>` : ""}
        <p>Nowe zapytanie na stronie:</p>
        ${requesterLine}
        ${invoiceLine}
        ${kidsEventBlock}
        ${placeInfoBlock}
        <ul>
          <li>Klient: ${clientName} (${clientEmail}${clientPhone ? ", " + clientPhone : ""})</li>
          <li>Restauracja: ${isOwnPlace ? "brak — klient ma własne miejsce" : `${restaurantName || "-"} ${restaurantEmail ? `(${restaurantEmail})` : "(mail nie wysłany — brak adresu w arkuszu albo patrz uwagi wyżej)"}`}</li>
          <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""} ${artistEmail ? `(${artistEmail})` : "(mail nie wysłany — brak adresu w arkuszu albo patrz uwagi wyżej)"}</li>
          <li>Termin: ${date || "do ustalenia"}</li>
          <li>Liczba osób: ${groupSize ?? "-"}</li>
          ${message ? `<li>Wiadomość: ${message}</li>` : ""}
        </ul>
      `),
    });

    // RODO: klient w ścieżce "Mam miejsce" podał swój adres domowy, który
    // trafia bezpośrednio do artysty — mail od razu informuje go o tym
    // wprost, zamiast żeby dowiedział się dopiero z odpowiedzi artysty.
    if (isOwnPlace && artistEmail) {
      sends.push(sendEmail(resend, {
        from: FROM_EMAIL,
        to: clientEmail,
        subject: "Zapytanie wysłane — Twój adres trafił do artysty",
        html: emailHtml(`
          <p>Cześć ${clientName}!</p>
          <p>Zapytanie o warsztat „${workshopName || ""}" trafiło do artysty <strong>${artistName || ""}</strong>. Ponieważ wybraliście opcję „Mam miejsce", Twoje dane kontaktowe i adres eventu zostały przekazane bezpośrednio wybranemu artyście, żeby mógł ocenić dojazd i przygotować się do warsztatu.</p>
          <p>Damy Ci znać mailowo, jak tylko artysta odpowie.</p>
          <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
        `),
      }));
    }

    // Maile do partnerów są "najlepiej jak się da" (błąd jednego nie blokuje
    // reszty), ale kopia do Joanny musi dojść — bez niej zapytanie by
    // przepadło, więc wtedy klient widzi błąd i może spróbować ponownie.
    const [ownerOk] = await Promise.all([ownerSend, ...sends]);
    if (!ownerOk) {
      res.status(500).json({ error: "Nie udało się wysłać zapytania." });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nie udało się wysłać zapytania.", ...(IS_PRODUCTION ? {} : { przyczyna: String(err && err.message) }) });
  }
}
