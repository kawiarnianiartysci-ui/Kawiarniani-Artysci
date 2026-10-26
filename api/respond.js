import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, IS_PRODUCTION, escapeHtml, SITE_URL, htmlPage, verifyAndDecode, signPayload, emailHtml, nl2br, sendEmail, CLIENT_WAIT_INFO } from "./_shared.js";

async function obsluz(req, res) {
  const { action, data, sig, confirm, dates } = req.query;

  if (action !== "accept" && action !== "decline" && action !== "propose") {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy."));
    return;
  }

  const payload = verifyAndDecode(data, sig);
  if (!payload) {
    res.status(400).send(htmlPage("Nieprawidłowy link", "Ten link jest nieprawidłowy lub wygasł. Skontaktuj się z Joanną, jeśli to się powtarza."));
    return;
  }

  const { clientName, restaurantName, workshopName, date, groupSize, isKidsEvent, kidsCount, adultsCount, kidsPackageName, kidsAmountLabel } = payload;

  // Sekcja doklejana do maili, tylko gdy zapytanie dotyczy eventu dla dzieci —
  // całkowicie nieobecna (pusty string) dla zwykłych zapytań, więc istniejące
  // szablony maili wyglądają identycznie jak dziś.
  const kidsEventBlock = isKidsEvent ? `
      <p><strong>🎈 To zapytanie dotyczy eventu dla dzieci (urodziny/impreza).</strong></p>
      <ul>
        <li>Liczba dzieci: ${kidsCount ?? "-"}</li>
        <li>Liczba dorosłych: ${adultsCount ?? "-"}</li>
        <li>Wybrany pakiet: ${kidsPackageName || "-"}</li>
        <li>Kwota: ${kidsAmountLabel || "do ustalenia"}</li>
      </ul>
    ` : "";

  // === Trzecia ścieżka: artysta proponuje inne terminy zamiast akceptować/odrzucać ===
  // Osobna gałąź, bo (w odróżnieniu od accept/decline) potrzebuje dodatkowego
  // wejścia od artysty (tekst z datami) zanim cokolwiek wyśle — ta strona
  // formularza pełni tu tę samą rolę co krok "potwierdź" dla accept/decline.
  if (action === "propose") {
    const { clientEmail, clientPhone, restaurantEmail, artistEmail, artistName } = payload;
    const proposedDates = (dates || "").trim();
    const isClassic = !!restaurantEmail;

    if (!proposedDates) {
      const details = `<strong>${workshopName || ""}</strong> — ${restaurantName || ""}<br>Pierwotny termin: ${date || "do ustalenia"} · ${isKidsEvent ? `${kidsCount ?? "-"} dzieci + ${adultsCount ?? "-"} dorosłych` : `${groupSize || "-"} os.`} · Klient: ${clientName || ""}`;
      res.status(200).send(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Zaproponuj inne terminy</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#EDEBE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;}
  .box{background:#fff;padding:40px 32px;border-radius:16px;max-width:440px;width:100%;text-align:center;}
  h1{font-size:22px;font-weight:600;color:#1A1A1A;margin:0 0 14px;}
  p{color:#6B6862;font-size:15px;line-height:1.6;margin:0 0 20px;}
  textarea{width:100%;box-sizing:border-box;min-height:110px;border-radius:9px;border:1px solid #ccc;padding:12px;font-size:15px;font-family:inherit;margin:0 0 16px;resize:vertical;}
  button{width:100%;padding:13px 24px;border:none;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;background:#432A16;color:#fff;cursor:pointer;}
</style>
</head><body><div class="box"><h1>Zaproponuj inne terminy</h1><p>${details}</p>
<form method="GET" action="/api/respond">
  <input type="hidden" name="action" value="propose">
  <input type="hidden" name="data" value="${data}">
  <input type="hidden" name="sig" value="${sig}">
  <textarea name="dates" required placeholder="np. 12.09 po 16:00, 14.09 cały dzień"></textarea>
  <button type="submit">Wyślij propozycję</button>
</form>
</div></body></html>`);
      return;
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sends = [];
      const datesHtml = nl2br(proposedDates);

      const artistContact = `${artistName || "Artysta"}${artistEmail ? ` · ${artistEmail}` : ""}`;
      const clientContact = `${clientName || "Klient"}${clientEmail ? ` · ${clientEmail}` : ""}${clientPhone ? ` · ${clientPhone}` : ""}`;
      const restaurantContact = `${restaurantName || "Restauracja"}${restaurantEmail ? ` · ${restaurantEmail}` : ""}`;

      // Klient: zawsze, jeśli mamy jego adres.
      if (clientEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: clientEmail,
          subject: `Nowa propozycja terminu — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${clientName || ""},</p>
            ${kidsEventBlock}
            <p>Niestety pierwotny termin (${date || "do ustalenia"}) nie pasuje artyście. Proponuje inne terminy:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Prosimy ustalić szczegóły bezpośrednio z artystą${isClassic ? " i restauracją" : ""}:</p>
            <ul>
              <li>Artysta: ${artistContact}</li>
              ${isClassic ? `<li>Restauracja: ${restaurantContact}</li>` : ""}
            </ul>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      // Restauracja: tylko w ścieżce klasycznej — ten sam mail pełni też rolę
      // informacji "pierwotny termin odpada, nie trzymajcie stolika w zawieszeniu".
      if (isClassic) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: restaurantEmail,
          subject: `Artysta proponuje inny termin — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć!</p>
            ${kidsEventBlock}
            <p>Pierwotny termin (${date || "do ustalenia"}) nie pasuje artyście <strong>${artistName || workshopName || ""}</strong>. Proponuje inne terminy:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Prosimy ustalić szczegóły bezpośrednio z klientem i artystą — dalsze ustalenia są teraz po Waszej stronie:</p>
            <ul>
              <li>Klient: ${clientContact}</li>
              <li>Artysta: ${artistContact}</li>
            </ul>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      // Artysta: osobne potwierdzenie — on zna już swoje daty, potrzebuje
      // informacji, że sprawa poszła dalej i jest teraz po jego stronie.
      if (artistEmail) {
        sends.push(sendEmail(resend,{
          from: FROM_EMAIL,
          to: artistEmail,
          subject: `Propozycja terminów przekazana — ${workshopName || ""}`,
          html: emailHtml(`
            <p>Cześć ${artistName || ""}!</p>
            ${kidsEventBlock}
            <p>Przekazaliśmy Twoją propozycję terminów klientowi${isClassic ? " i restauracji" : ""}:</p>
            <p><strong>${datesHtml}</strong></p>
            <p>Sprawa jest teraz po Waszej stronie — ustalcie szczegóły bezpośrednio:</p>
            <ul>
              <li>Klient: ${clientContact}</li>
              ${isClassic ? `<li>Restauracja: ${restaurantContact}</li>` : ""}
            </ul>
            <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
          `),
        }));
      }

      sends.push(sendEmail(resend,{
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Artysta proponuje inny termin: ${restaurantName || ""} + ${workshopName || ""}`,
        html: emailHtml(`<p>Artysta ${artistName || workshopName || ""} zaproponował inne terminy dla zapytania od ${clientName || ""} (${restaurantName || "bez restauracji"}, pierwotny termin: ${date || "-"}).</p><p>Zaproponowane terminy:<br>${datesHtml}</p>${kidsEventBlock}`),
      }));

      await Promise.all(sends);

      res.status(200).send(htmlPage("Wysłano!", "Przekazaliśmy Twoją propozycję terminów. Dalsze ustalenia są teraz bezpośrednio między Wami."));
    } catch (err) {
      console.error(err);
      res.status(500).send(htmlPage("Błąd", "Coś poszło nie tak przy wysyłce propozycji. Spróbuj ponownie za chwilę lub napisz do Joanny."));
    }
    return;
  }

  const accepted = action === "accept";

  // Krok pośredni — chroni przed przypadkowym "kliknięciem" linku przez skanery
  // bezpieczeństwa w skrzynkach mailowych, które same otwierają linki z maila.
  if (confirm !== "1") {
    const confirmUrl = `/api/respond?action=${action}&data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}&confirm=1`;
    const title = accepted ? "Potwierdź akceptację terminu" : "Potwierdź, że nie możesz";
    const details = `<strong>${workshopName || ""}</strong> — ${restaurantName || ""}<br>Termin: ${date || "do ustalenia"} · ${isKidsEvent ? `${kidsCount ?? "-"} dzieci + ${adultsCount ?? "-"} dorosłych` : `${groupSize || "-"} os.`} · Klient: ${clientName || ""}`;
    res.status(200).send(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#EDEBE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;}
  .box{background:#fff;padding:40px 32px;border-radius:16px;max-width:440px;width:100%;text-align:center;}
  h1{font-size:22px;font-weight:600;color:#1A1A1A;margin:0 0 14px;}
  p{color:#6B6862;font-size:15px;line-height:1.6;margin:0 0 20px;}
  a.btn{display:inline-block;padding:13px 24px;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;background:${accepted ? "#432A16" : "#999"};color:#fff;}
</style>
</head><body><div class="box"><h1>${title}</h1><p>${details}</p><a class="btn" href="${confirmUrl}">${accepted ? "Tak, akceptuję ten termin" : "Tak, nie mogę w tym terminie"}</a></div></body></html>`);
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { clientEmail, clientPhone, restaurantEmail, artistEmail, artistName, artistInvoicing, artistRequirements } = payload;
    const sends = [];

    if (restaurantEmail) {
      const detailsList = accepted && (artistInvoicing || artistRequirements)
        ? `<p>Informacje od artysty:</p><ul>${artistInvoicing ? `<li>${artistInvoicing}</li>` : ""}${artistRequirements ? `<li>${artistRequirements}</li>` : ""}</ul>`
        : "";
      const clientContact = accepted
        ? `<p>Kontakt do klienta (np. w sprawie menu):<br>${clientName || ""}${clientEmail ? ` · ${clientEmail}` : ""}${clientPhone ? ` · ${clientPhone}` : ""}</p>`
        : "";
      // Gdy artysta zaakceptował, restauracja od razu odpowiada jednym
      // kliknięciem, czy ma wolny termin (akceptuję / proponuję inny / odrzucam).
      // Menu i cenę ustala z klientem dopiero PO akceptacji — wcześniej prosiliśmy
      // o kliknięcie "gdy wszystko ustalone", co myliło (Ptasie Radio, 10.2026).
      let finalizeButtons = "";
      if (accepted) {
        const confirmPayload = {
          clientName, clientEmail: clientEmail || "", clientPhone: clientPhone || "",
          restaurantName, restaurantEmail,
          artistName: artistName || "", workshopName: workshopName || "", artistEmail: artistEmail || "",
          date: date || "", groupSize: groupSize || "",
          isKidsEvent: isKidsEvent || undefined,
          kidsCount: isKidsEvent ? kidsCount : undefined,
          adultsCount: isKidsEvent ? adultsCount : undefined,
          kidsPackageName: isKidsEvent ? kidsPackageName : undefined,
          kidsAmountLabel: isKidsEvent ? kidsAmountLabel : undefined,
          ts: Date.now(),
        };
        const { data: cData, sig: cSig } = signPayload(confirmPayload);
        const linkFor = a => `${SITE_URL}/api/confirm?action=${a}&data=${cData}&sig=${cSig}`;
        finalizeButtons = `
          <p><strong>Prosimy o odpowiedź od razu — jednym kliknięciem:</strong></p>
          <p>
            <a href="${linkFor("confirm")}" style="background:#432A16;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;margin:0 10px 10px 0;display:inline-block;">Akceptuję datę — rezerwuję</a>
            <a href="${linkFor("propose")}" style="background:#fff;color:#432A16;border:2px solid #432A16;padding:10px 20px;border-radius:8px;text-decoration:none;margin:0 10px 10px 0;display:inline-block;">Proponuję inny termin</a>
            <a href="${linkFor("decline")}" style="background:#999;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;margin:0 0 10px 0;display:inline-block;">Odrzucam</a>
          </p>
          <p>Kliknięcie „Akceptuję" oznacza tylko, że termin jest u Was wolny i go rezerwujecie — nie trzeba mieć jeszcze ustalonego menu ani ceny. Po akceptacji <strong>prosimy o kontakt z klientem w ciągu 48 godzin</strong> w sprawie menu i ostatecznej ceny. Jeśli maile czyta u Was jedna osoba, przekażcie proszę tę wiadomość dalej, gdy jej nie ma.</p>
        `;
      }
      sends.push(sendEmail(resend,{
        from: FROM_EMAIL,
        to: restaurantEmail,
        subject: accepted
          ? `Prosimy o potwierdzenie terminu: ${workshopName || ""} — ${date || ""}`
          : `Artysta nie może w tym terminie — ${workshopName || ""}`,
        html: emailHtml(accepted
          ? `<p>Cześć!</p><p>Artysta <strong>${artistName || workshopName || ""}</strong> ma wolny termin <strong>${date || ""}</strong> na event dla ${groupSize || "-"} osób. Teraz czekamy na Waszą odpowiedź, czy ten termin pasuje restauracji.</p>${finalizeButtons}${kidsEventBlock}${detailsList}${clientContact}<p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`
          : `<p>Cześć!</p><p>Niestety artysta <strong>${artistName || workshopName || ""}</strong> nie może w terminie ${date || ""}. Poprosiliśmy klienta o wybranie innego terminu albo innego artysty — jeśli wyśle nowe zapytanie, dostaniecie od nas osobnego maila. Z Waszej strony nic nie trzeba robić.</p>${kidsEventBlock}<p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`),
      }));
    }

    // Ścieżka "Mam miejsce" (bez restauracji) — po akceptacji nie ma
    // trzeciej strony, która musi jeszcze dogadać szczegóły (confirm.js),
    // więc klient dostaje inny komunikat: artysta przyjął i sam się odezwie,
    // zamiast twardego "termin potwierdzony, do zobaczenia w {restauracji}".
    // Celowo restaurantName, nie restaurantEmail — restauracja mogła zostać
    // wybrana, ale nie mieć maila w arkuszu; to i tak ścieżka klasyczna,
    // klient ma wiedzieć, gdzie się wydarzy event (mail do restauracji i tak
    // zostanie pominięty niżej, niezależnie od tego wyboru tekstu).
    const isClassic = !!restaurantName;

    if (clientEmail) {
      sends.push(sendEmail(resend,{
        from: FROM_EMAIL,
        to: clientEmail,
        subject: accepted
          ? (isClassic ? "Artysta potwierdził termin — czekamy na restaurację" : "Twój termin został potwierdzony!")
          : "Artyście nie pasuje ten termin",
        html: emailHtml(accepted
          ? (isClassic
              ? `<p>Cześć ${clientName || ""}!</p>${kidsEventBlock}<p>Świetna wiadomość — artysta potwierdził Wasz termin (${date || ""}).</p><p>Teraz restauracja <strong>${restaurantName || ""}</strong> potwierdza, że ma wolny termin — dostaniesz od nas osobny mail, gdy to zrobi.</p>${CLIENT_WAIT_INFO}<p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`
              : `<p>Cześć ${clientName || ""}!</p>${kidsEventBlock}<p>Świetna wiadomość — artysta <strong>${artistName || workshopName || ""}</strong> przyjął Twoje zapytanie na termin ${date || "do ustalenia"} i skontaktuje się z Tobą wkrótce, żeby ustalić ostatnie szczegóły (np. dojazd).</p><p>Kontakt do artysty: ${artistName || ""}${artistEmail ? ` · ${artistEmail}` : ""}</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`)
          : `<p>Cześć ${clientName || ""},</p>${kidsEventBlock}<p>Niestety artyście (${workshopName || "wybrany warsztat"}) nie pasuje termin ${date || ""}. Prosimy o wybranie innego terminu lub zmianę artysty — wystarczy wysłać nowe zapytanie na stronie <a href="${SITE_URL}" style="color:#432A16;">kawiarnianiartysci.pl</a>.</p><p>Pozdrawiamy,<br>Kawiarniani Artyści</p>`),
      }));
    }

    sends.push(sendEmail(resend,{
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `${accepted ? "Zaakceptowano" : "Odrzucono"}: ${restaurantName || (isClassic ? "" : "bez restauracji (mam miejsce)")} + ${workshopName || ""}`,
      html: emailHtml(`<p>Artysta ${accepted ? "zaakceptował" : "odrzucił"} zapytanie od ${clientName || ""} (${isClassic ? restaurantName || "" : "bez restauracji — mam miejsce"}, ${date || ""}).</p>${kidsEventBlock}`),
    }));

    await Promise.all(sends);

    res.status(200).send(
      accepted
        ? htmlPage("Dziękujemy!", isClassic ? "Potwierdziłeś/aś termin. Restauracja i klient zostali poinformowani mailowo." : "Potwierdziłeś/aś termin. Klient został poinformowany mailowo i dostał Twój kontakt.")
        : htmlPage("Zapisano", isClassic ? "Poinformowaliśmy restaurację i klienta, że nie możesz w tym terminie." : "Poinformowaliśmy klienta, że nie możesz w tym terminie.")
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(htmlPage("Błąd", "Coś poszło nie tak przy wysyłce potwierdzenia. Spróbuj ponownie za chwilę lub napisz do Joanny."));
  }
}

// Błąd spoza bloków try (np. brak INQUIRY_SIGNING_SECRET w ustawieniach
// Vercela) — zamiast surowego "FUNCTION_INVOCATION_FAILED" czytelna strona;
// na wersjach podglądowych z dokładną przyczyną, żeby łatwiej ją znaleźć.
export default async function handler(req, res) {
  try {
    await obsluz(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send(htmlPage("Błąd", IS_PRODUCTION ? "Coś poszło nie tak. Spróbuj ponownie za chwilę lub napisz do Joanny." : `Błąd (wersja testowa): ${escapeHtml(err && err.message)}`));
  }
}
