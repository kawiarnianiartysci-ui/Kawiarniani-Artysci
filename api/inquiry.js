import { Resend } from "resend";
import { FROM_EMAIL, OWNER_EMAIL, SITE_URL, signPayload, emailHtml } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const {
      clientName, clientEmail, clientPhone,
      restaurantName, restaurantEmail,
      artistName, workshopName, artistEmail,
      artistInvoicing, artistRequirements,
      groupSize, date, message,
      isKidsEvent, kidsCount, adultsCount, kidsPackageName, kidsAmountLabel,
      isOwnPlace, placeAddress, placeType, placeHasSeparateRoom, placeArea, placeHasTables, placeHasWater, placeNotes,
    } = req.body || {};

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
    const PLACE_TYPE_LABELS = { dom:"Dom", mieszkanie:"Mieszkanie w bloku", ogrod:"Ogród", sala:"Sala", inne:"Inne" };
    const yn = v => (v === "tak" ? "Tak" : v === "nie" ? "Nie" : "-");
    const placeInfoBlock = isOwnPlace ? `
      <p><strong>📍 Klient ma własne miejsce — warsztat odbędzie się bez restauracji.</strong></p>
      <ul>
        <li>Adres / lokalizacja: ${placeAddress || "-"}</li>
        <li>Typ miejsca: ${PLACE_TYPE_LABELS[placeType] || placeType || "-"}</li>
        <li>Osobna sala / wydzielona przestrzeń: ${yn(placeHasSeparateRoom)}</li>
        <li>Metraż: ${placeArea || "-"}</li>
        <li>Dostępne stoły i krzesła: ${yn(placeHasTables)}</li>
        <li>Dostęp do wody: ${yn(placeHasWater)}</li>
        ${placeNotes ? `<li>Uwagi dodatkowe: ${placeNotes}</li>` : ""}
      </ul>
    ` : "";

    if (!clientName || !clientEmail) {
      res.status(400).json({ error: "Brak imienia lub adresu email klienta." });
      return;
    }

    const payload = {
      clientName, clientEmail, clientPhone: clientPhone || "",
      restaurantName: restaurantName || "", restaurantEmail: restaurantEmail || "",
      artistName: artistName || "", workshopName: workshopName || "", artistEmail: artistEmail || "",
      artistInvoicing: artistInvoicing || "", artistRequirements: artistRequirements || "",
      groupSize: groupSize || "", date: date || "", message: message || "",
      isKidsEvent: isKidsEvent || undefined,
      kidsCount: isKidsEvent ? kidsCount : undefined,
      adultsCount: isKidsEvent ? adultsCount : undefined,
      kidsPackageName: isKidsEvent ? kidsPackageName : undefined,
      kidsAmountLabel: isKidsEvent ? kidsAmountLabel : undefined,
      ts: Date.now(),
    };
    const { data, sig } = signPayload(payload);
    const acceptUrl = `${SITE_URL}/api/respond?action=accept&data=${data}&sig=${sig}`;
    const declineUrl = `${SITE_URL}/api/respond?action=decline&data=${data}&sig=${sig}`;
    const proposeUrl = `${SITE_URL}/api/respond?action=propose&data=${data}&sig=${sig}`;

    const sends = [];

    if (artistEmail) {
      sends.push(resend.emails.send({
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
          ${kidsEventBlock}
          ${placeInfoBlock}
          <ul>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize || "-"}</li>
            <li>Kontakt do klienta: ${clientName}${clientEmail ? ` — ${clientEmail}` : ""}${clientPhone ? `, ${clientPhone}` : ""}</li>
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
      sends.push(resend.emails.send({
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
            <li>Liczba osób: ${groupSize || "-"}</li>
            <li>Klient: ${clientName}</li>
          </ul>
          <p>Czekamy teraz na potwierdzenie terminu przez artystę — damy znać mailowo, jak tylko odpowie.</p>
          <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
        `),
      }));
    }

    sends.push(resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `Nowe zapytanie: ${restaurantName || (isOwnPlace ? "bez restauracji (mam miejsce)" : "-")} + ${workshopName || "-"}`,
      html: emailHtml(`
        <p>Nowe zapytanie na stronie:</p>
        ${kidsEventBlock}
        ${placeInfoBlock}
        <ul>
          <li>Klient: ${clientName} (${clientEmail}${clientPhone ? ", " + clientPhone : ""})</li>
          <li>Restauracja: ${isOwnPlace ? "brak — klient ma własne miejsce" : `${restaurantName || "-"} ${restaurantEmail ? `(${restaurantEmail})` : "(brak adresu email w arkuszu)"}`}</li>
          <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""} ${artistEmail ? `(${artistEmail})` : "(brak adresu email w arkuszu)"}</li>
          <li>Termin: ${date || "do ustalenia"}</li>
          <li>Liczba osób: ${groupSize || "-"}</li>
          ${message ? `<li>Wiadomość: ${message}</li>` : ""}
        </ul>
      `),
    }));

    // RODO: klient w ścieżce "Mam miejsce" podał swój adres domowy, który
    // trafia bezpośrednio do artysty — mail od razu informuje go o tym
    // wprost, zamiast żeby dowiedział się dopiero z odpowiedzi artysty.
    if (isOwnPlace && clientEmail) {
      sends.push(resend.emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: "Zapytanie wysłane — Twój adres trafił do artysty",
        html: emailHtml(`
          <p>Cześć ${clientName || ""}!</p>
          <p>Zapytanie o warsztat „${workshopName || ""}" trafiło do artysty <strong>${artistName || ""}</strong>. Ponieważ wybraliście opcję „Mam miejsce", Twoje dane kontaktowe i adres eventu zostały przekazane bezpośrednio wybranemu artyście, żeby mógł ocenić dojazd i przygotować się do warsztatu.</p>
          <p>Damy Ci znać mailowo, jak tylko artysta odpowie.</p>
          <p>Pozdrawiamy,<br>Kawiarniani Artyści</p>
        `),
      }));
    }

    await Promise.all(sends);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nie udało się wysłać zapytania." });
  }
}
