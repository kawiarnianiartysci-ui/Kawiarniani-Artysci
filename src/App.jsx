import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// 🖼️  ZDJĘCIA — pliki w public/images/, nowe zdjęcia wgrywaj tam i dopisz stałą poniżej
// ══════════════════════════════════════════════════════════════
const LOGO_IMG = "/images/logo-img.png";
const GALLERY_MALOWANIE_1 = "/images/gallery-malowanie-1.jpg";
const GALLERY_MALOWANIE_2 = "/images/gallery-malowanie-2.jpg";
const GALLERY_MALOWANIE_3 = "/images/gallery-malowanie-3.jpg";
const GALLERY_MALOWANIE_4 = "/images/gallery-malowanie-4.jpg";
const ZUK_LOGO = "/images/zuk-logo.png";
const ZUK_GALLERY_1 = "/images/zuk-gallery-1.jpg";
const ZUK_GALLERY_2 = "/images/zuk-gallery-2.jpg";
const ZUK_GALLERY_3 = "/images/zuk-gallery-3.jpg";
const ZUK_GALLERY_4 = "/images/zuk-gallery-4.jpg";
const MAGAZYN_LOGO = "/images/magazyn-logo.png";
const MAGAZYN_GALLERY_1 = "/images/magazyn-gallery-1.jpg";
const MAGAZYN_GALLERY_2 = "/images/magazyn-gallery-2.jpg";
const MAGAZYN_GALLERY_3 = "/images/magazyn-gallery-3.jpg";
const EBRU_LOGO = "/images/ebru-logo.png";
const EBRU_GALLERY_1 = "/images/ebru-gallery-1.jpg";
const EBRU_GALLERY_2 = "/images/ebru-gallery-2.jpg";
const EBRU_GALLERY_3 = "/images/ebru-gallery-3.jpg";
const EBRU_GALLERY_4 = "/images/ebru-gallery-4.jpg";
const EBRU_COVER = "/images/ebru-cover.jpg";
const WORKSHOP_PAINTING_PHOTO = "/images/workshop-painting-photo.jpg";
const HERO_PHOTO = "/images/hero-photo.jpg";
const HERO_PHOTO_DZIECI = "/images/hero-photo-dzieci.jpg";


// ══════════════════════════════════════════════════════════════
// 🎨  KOLORY — zmień tutaj żeby zmienić wygląd całej strony
// ══════════════════════════════════════════════════════════════
const C = {
  bg: "#EDEBE6", card: "#FFFFFF", primary: "#432A16",
  accent: "#C5A050", text: "#1A1A1A", muted: "#6B6862",
  border: "#DDD9D2", tagBg: "#EAE8E3", selectedBg: "#F7EEDD",
};

// ══════════════════════════════════════════════════════════════
// ✏️  TEKST STRONY
// ══════════════════════════════════════════════════════════════
const COPY = {
  siteName:    "Kawiarniani Artyści",
  tagline:     "Warsztaty artystyczne w poznańskich kawiarniach — na panieński, baby shower, urodziny i integracje",
  heroTitle:   "Zaplanuj niezapomniane spotkanie.",
  heroSubtitle:"Łączymy restauracje i kawiarnie z artystycznymi działaniami podczas spotkań rodzinnych, wieczorów panieńskich, baby shower, urodzin lub integracji firmowych.",
  contactEmail:"kawiarnianiartysci@gmail.com",
};

// ══════════════════════════════════════════════════════════════
// 📊  RESTAURACJE I WARSZTATY — dane wczytywane z arkusza Google Sheets
// ══════════════════════════════════════════════════════════════
// Jak dodać nową restaurację/warsztat:
//  1. Wgraj zdjęcia do public/images/ (np. przez przeglądarkę GitHub).
//  2. Zduplikuj wiersz w odpowiedniej zakładce arkusza, wpisz dane
//     i nazwy wgranych plików (bez ścieżki, np. "moje-zdjecie.jpg").
// Zmiana pojawi się na stronie po odświeżeniu (do kilku minut na
// odświeżenie publikacji arkusza przez Google).
const CSV_RESTAURANTS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/pub?gid=563383430&single=true&output=csv";
const CSV_WORKSHOPS_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/pub?gid=273766010&single=true&output=csv";

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
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const toNum  = v => (v === "" || v == null ? null : Number(v));
const toBool = v => /^(true|1|tak|prawda)$/i.test((v || "").trim());
// jak toBool, ale puste pole zostaje "nieznane" zamiast fałszu —
// potrzebne tam, gdzie samo "puste" i "jawnie nie" muszą się różnić
const toTriBool = v => {
  const t = (v || "").trim();
  return t === "" ? undefined : toBool(t);
};
const imgPath = filename => (filename ? `/images/${filename.trim()}` : undefined);
const imgListPath = list => !list ? [] : list.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
  const [filename, ...mods] = entry.split("@");
  if (mods.length === 0) return imgPath(filename);
  const obj = { src: imgPath(filename) };
  mods.forEach(m => { const [k, v] = m.split("="); obj[k.trim()] = v?.trim(); });
  return obj;
});
const splitList = text => (text ? text.split(";").filter(Boolean) : []);
const parseVariants = text => splitList(text).map(part => {
  const [id, label, detail, price, priceMax] = part.split("|");
  const v = { id, label, detail, price: price ? Number(price) : null };
  if (priceMax) v.priceMax = Number(priceMax);
  return v;
});
// Wyciąga liczbę godzin z tekstu typu "2 godz.", "1,5 godz." albo "2-3 godz"
// (zakres — bierzemy górną granicę, żeby nie umówić warsztatu, który realnie
// nie zdąży się skończyć przed zamknięciem lokalu). Używane tylko do
// wyliczenia godziny zamknięcia, nie do wyświetlania (na to zostaje `duration`).
const parseDurationHours = text => {
  const nums = (text || "").replace(/,/g, ".").match(/\d+(\.\d+)?/g);
  return nums ? Math.max(...nums.map(Number)) : 0;
};
// "HH:MM" -> minuty od północy, do porównań czasu.
const timeToMinutes = t => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

// Godziny otwarcia lokalu, różne dla każdego dnia tygodnia — jedna kolumna
// w arkuszu ("hours"), format: "pon=15:00-21:00;wt=15:00-21:00;sr=;czw=...".
// Pusty zakres po "=" (albo brak dnia w tekście) = lokal zamknięty w ten dzień.
// Brak kolumny w ogóle (pusty tekst) = brak danych, filtr godzin nieaktywny.
const DAY_KEYS = ["nd", "pon", "wt", "sr", "czw", "pt", "sob"]; // index = Date.getDay()
const parseHours = text => {
  const byDay = {};
  splitList(text).forEach(part => {
    const [day, range] = part.split("=");
    if (!day) return;
    if (range) {
      const [open, close] = range.split("-");
      if (open && close) byDay[day.trim()] = { open: open.trim(), close: close.trim() };
    } else {
      byDay[day.trim()] = null; // jawnie zamknięte
    }
  });
  return byDay;
};
// "YYYY-MM-DD" -> klucz dnia tygodnia ("pon".."nd"), bez przesunięć strefy
// czasowej (stąd ręczne rozbicie zamiast new Date(string)).
const dayKeyFromDate = dateStr => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAY_KEYS[new Date(y, m - 1, d).getDay()];
};

function restaurantFromRow(row) {
  const photos = imgListPath(row.photos);
  const cover = photos[0] ? (typeof photos[0] === "string" ? photos[0] : photos[0].src) : undefined;
  return {
    id: row.id, name: row.name, comingSoon: toBool(row.comingSoon) || undefined,
    logo: imgPath(row.logo), photo: cover, photos,
    vibe: row.vibe, location: row.location, description: row.description, fullDescription: row.fullDescription,
    tagline: row.tagline || undefined,
    capacity: row.capacity, minPeople: toNum(row.minPeople), maxPeople: toNum(row.maxPeople),
    address: row.address, website: row.website, instagram: row.instagram,
    instagramUrl: row.instagramUrl || undefined, facebookUrl: row.facebookUrl || undefined,
    hasSeparateRoom: toBool(row.hasSeparateRoom) || undefined,
    variants: parseVariants(row.variants),
    email: row.email || undefined,
    requiresInvoice: toBool(row.requiresInvoice) || undefined,
    hours: parseHours(row.hours),
    acceptsKids: toBool(row.acceptsKids) || undefined,
    kidsVariants: parseVariants(row.kidsVariants),
  };
}

function workshopFromRow(row) {
  return {
    id: row.id, name: row.name, comingSoon: toBool(row.comingSoon) || undefined,
    logo: imgPath(row.logo), photo: imgPath(row.photo), photos: imgListPath(row.photos),
    artist: row.artist, bio: row.bio, duration: row.duration, pricePerPerson: toNum(row.pricePerPerson),
    minPeople: toNum(row.minPeople), maxPeople: toNum(row.maxPeople),
    description: row.description, includes: splitList(row.includes),
    website: row.website, instagram: row.instagram,
    instagramUrl: row.instagramUrl || undefined, facebookUrl: row.facebookUrl || undefined,
    email: row.email || undefined, gradientBg: row.gradientBg, gradientText: row.gradientText,
    requiresSeparateRoom: toBool(row.requiresSeparateRoom) || undefined,
    invoicing: row.invoicing || undefined, requirements: row.requirements || undefined,
    canInvoice: toTriBool(row.canInvoice),
    forKids: toBool(row.forKids) || undefined,
    kidsMinAge: toNum(row.kidsMinAge) ?? undefined,
    // Wyłącznik ścieżki "Mam miejsce" (artysta dojeżdża do klienta) — tylko
    // artyści z travelsToClient=tak są tam wybieralni, patrz withOwnPlaceTile w App().
    travelsToClient: toTriBool(row.travelsToClient),
    travelArea: row.travelArea || undefined,
  };
}

function useSheetData() {
  const [restaurants, setRestaurants] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(CSV_RESTAURANTS_URL).then(r => r.text()),
      fetch(CSV_WORKSHOPS_URL).then(r => r.text()),
    ])
      .then(([restText, workText]) => {
        setRestaurants(csvToObjects(restText).map(restaurantFromRow));
        setWorkshops(csvToObjects(workText).map(workshopFromRow));
      })
      .catch(() => setDataError(true))
      .finally(() => setDataLoading(false));
  }, []);

  return { restaurants, workshops, dataLoading, dataError };
}

// ══ CSS ══════════════════════════════════════════════════════
const PAN_PIZZA_FONT = "/fonts/pan-pizza.ttf";

const globalCSS = `
  @font-face {
    font-family: 'Pan Pizza';
    src: url(${PAN_PIZZA_FONT}) format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { background: ${C.bg}; margin: 0; }
  input, textarea, button, select { font-family: 'Montserrat', system-ui, sans-serif; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: ${C.primary} !important; }
  .card-h { transition: box-shadow 0.18s, transform 0.15s; }
  .card-h:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important; transform: translateY(-2px); }
  .gallery-thumb img { transition: transform 0.25s ease; }
  .gallery-thumb:hover img { transform: scale(1.08); }
  .chip { transition: all 0.15s; }
  .modal-fade { animation: fadeIn 0.2s ease; }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  a { color: inherit; }
  .wizard-list { display:flex; flex-direction:column; gap:14px; }
  @media (min-width: 640px) {
    .wizard-list { display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; align-items:stretch; }
  }
  @media (min-width: 1024px) {
    .wizard-list { grid-template-columns: repeat(3, 1fr); }
  }
  .card-title-clamp { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; text-overflow:ellipsis; }
  .home-cta-grid { display:flex; flex-direction:column; gap:16px; }
  @media (min-width: 640px) {
    .home-cta-grid { flex-direction:row; }
  }
  .hero-cta-btn { display:block; width:100%; box-sizing:border-box; }
  @media (min-width: 640px) {
    .hero-cta-btn { display:inline-block; width:auto; }
  }
  .hero-copy-wrap { margin-bottom:28px; }
  .hero-title { margin:0 0 14px; }
  .hero-subtitle { font-size:16px; line-height:1.65; margin:0 auto 20px; }
  @media (max-width: 640px) {
    .hero-copy-wrap { margin-bottom:14px; }
    .hero-title { margin:0 0 6px; }
    .hero-subtitle { font-size:14px; line-height:1.45; margin:0 auto 10px; }
  }
  .search-divider { width:1px; align-self:stretch; margin:8px 0; }
  @media (max-width: 640px) {
    .search-bar { flex-direction: column !important; border-radius: 20px !important; }
    .search-divider { width:100%; height:1px; align-self:auto; margin:2px 0; }
  }
  .wizard-nav-spacer { display:none; }
  @media (max-width: 640px) {
    .wizard-nav-bar { position:fixed; left:0; right:0; bottom:0; top:auto; max-width:none !important; margin:0 !important; padding:10px 28px !important; background:${C.bg}; box-shadow:0 -6px 20px rgba(0,0,0,0.14); z-index:200; }
    .wizard-nav-spacer { display:block; height:76px; }
  }
  @media (min-width: 641px) {
    .hero-video { transform: scale(1.15); transform-origin: 70% 68%; }
  }
  @media (max-width: 640px) {
    .mode-switcher { flex-wrap: nowrap !important; padding: 3px !important; }
    .mode-switcher-btn { padding: 7px 10px !important; font-size: 12px !important; }
    .mode-switcher-divider { margin: 8px 1px !important; }
  }
  .partner-logos-viewport { overflow: hidden; width: 100%; -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
  .partner-logos-track { display: flex; align-items: center; gap: 18px; width: max-content; animation-name: partner-logos-scroll; animation-timing-function: linear; animation-iteration-count: infinite; }
  .partner-logos-track:hover { animation-play-state: paused; }
  @keyframes partner-logos-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
`;

// ══ Profil modal ════════════════════════════════════════════

// ══ Galeria zdjęć — uniwersalna, do użycia w każdym profilu (restauracja/artysta) ══

function PhotoGallery({ photos }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (!photos || photos.length === 0) return null;

  const getSrc = p => typeof p === "string" ? p : p.src;
  const getPosition = p => typeof p === "string" ? "center" : (p.position || "center");
  const getFit = p => typeof p === "string" ? "cover" : (p.fit || "cover");

  if (expandedIdx === null) {
    return (
      <div style={{ marginBottom:22 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:8 }}>
          {photos.map((p, i) => (
            <div key={i} onClick={() => setExpandedIdx(i)} className="gallery-thumb" style={{ borderRadius:10, overflow:"hidden", cursor:"pointer", aspectRatio:"4 / 3", background:C.tagBg }}>
              <img src={getSrc(p)} alt={`Zdjęcie ${i + 1}`} loading="lazy" style={{ width:"100%", height:"100%", objectFit:getFit(p), objectPosition:getPosition(p), display:"block" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom:22 }}>
      <div onClick={() => setExpandedIdx(null)} style={{ borderRadius:12, overflow:"hidden", cursor:"zoom-out", marginBottom:8, background:"#111", display:"flex", justifyContent:"center", alignItems:"center" }}>
        <img src={getSrc(photos[expandedIdx])} alt={`Zdjęcie ${expandedIdx + 1}`} loading="lazy" style={{ width:"100%", maxHeight:280, objectFit:"contain", display:"block" }} />
      </div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
        {photos.map((p, i) => (
          <img key={i} src={getSrc(p)} onClick={() => setExpandedIdx(i)} alt={`Miniatura ${i + 1}`} loading="lazy"
            style={{ width:64, height:48, objectFit:getFit(p), objectPosition:getPosition(p), borderRadius:6, cursor:"pointer", flexShrink:0, border: i === expandedIdx ? `2px solid ${C.primary}` : "2px solid transparent", opacity: i === expandedIdx ? 1 : 0.7 }} />
        ))}
      </div>
      <div style={{ textAlign:"center", marginTop:8 }}>
        <button onClick={() => setExpandedIdx(null)} style={{ fontSize:11, color:C.muted, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Zwiń zdjęcia</button>
      </div>
    </div>
  );
}

const InstagramIcon = ({ size = 20, color = C.primary }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth="1.8" />
    <circle cx="17.3" cy="6.7" r="1.1" fill={color} />
  </svg>
);

const FacebookIcon = ({ size = 20, color = C.primary }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M13 21V13H16L16.5 10H13V8C13 7.17 13.5 6.5 14.5 6.5H16.5V3.5C16.5 3.5 14.9 3.2 13.4 3.2C10.5 3.2 8.7 5 8.7 8V10H6V13H8.7V21H13Z"
      fill={color} />
  </svg>
);

const WebsiteIcon = ({ size = 20, color = C.primary }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
    <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z" stroke={color} strokeWidth="1.6" />
  </svg>
);

function ProfileModal({ item, type, isSelected, onToggleSelect, selectedVariantId, onVariantSelect, onClose, kidsMode = false }) {
  const isRestaurant = type === "restaurant";

  const InfoPill = ({ text, href }) => (
    href && href !== "#"
      ? <a href={href} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", fontSize:12, padding:"5px 11px", background:C.tagBg, borderRadius:20, color:C.primary, textDecoration:"none", marginRight:6, marginBottom:6 }}>{text}</a>
      : text ? <span style={{ display:"inline-flex", alignItems:"center", fontSize:12, padding:"5px 11px", background:C.tagBg, borderRadius:20, color:C.muted, marginRight:6, marginBottom:6 }}>{text}</span>
      : null
  );

  return (
    <div className="modal-fade" onClick={e => e.target === e.currentTarget && onClose()} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:400,
      overflowY:"auto", padding:"20px 12px", display:"flex", alignItems:"flex-start", justifyContent:"center",
    }}>
      <div style={{ background:"#FFF", borderRadius:16, maxWidth:580, width:"100%", overflow:"hidden", marginBottom:40 }}>

        {/* Nagłówek — biały, z samą nazwą */}
        <div style={{ background:C.card, padding:"28px 28px 20px", position:"relative", textAlign:"center", borderBottom:`1px solid ${C.border}` }}>
          <button onClick={onClose} style={{ position:"absolute", top:10, right:10, background:C.tagBg, border:"none", color:C.muted, borderRadius:"50%", width:44, height:44, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>

          {item.logo ? (
            <div style={{ width:72, height:72, margin:"0 auto 14px" }}>
              <img src={item.logo} alt={item.name} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
            </div>
          ) : item.photo ? (
            <div style={{ width:72, height:72, margin:"0 auto 14px", borderRadius:14, overflow:"hidden" }}>
              <img src={item.photo} alt={item.name} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
          ) : null}
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:28, fontWeight:400, color:C.text, marginBottom:4 }}>{item.name}</div>
          <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.12em" }}>
            {isRestaurant ? `${item.vibe} · ${item.location}` : item.artist}
          </div>
          {isRestaurant && item.tagline && (
            <div style={{ fontSize:13, color:C.primary, fontStyle:"italic", marginTop:10 }}>{item.tagline}</div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding:"24px 24px 32px" }}>

          {/* Zdjęcia — na samej górze części informacyjnej */}
          {item.photos ? (
            <PhotoGallery photos={item.photos} />
          ) : item.photo ? (
            <div style={{ borderRadius:10, overflow:"hidden", marginBottom:20 }}>
              <img src={item.photo} alt={item.name} loading="lazy" style={{ width:"100%", height:180, objectFit:"cover", objectPosition: item.photo.includes("workshop-painting-photo") ? "center 25%" : "center", display:"block" }} />
            </div>
          ) : (
            <div style={{ marginBottom:20 }}>
              <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ width:64, height:44, borderRadius:6, background:C.tagBg, border:`1px dashed ${C.border}`, cursor:"pointer" }} />
                ))}
              </div>
              <div style={{ fontSize:10, color:C.muted, opacity:0.7, marginTop:8, letterSpacing:"0.06em", textAlign:"center" }}>
                Miejsce na zdjęcia
              </div>
            </div>
          )}

          {/* Informacje (czas trwania / lokalizacja) */}
          <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            {isRestaurant && item.address && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address.replace(/;/g, ","))}`} target="_blank" rel="noreferrer"
                style={{ fontSize:12, color:C.primary, textDecoration:"underline", marginRight:6, marginBottom:6 }}>
                {item.address.replace(/;/g, ",")}
              </a>
            )}
            {isRestaurant && item.hasSeparateRoom && (
              <span style={{ display:"inline-flex", alignItems:"center", fontSize:12, padding:"5px 11px", background:"transparent", border:`1px solid ${C.primary}`, borderRadius:20, color:C.primary, marginRight:6, marginBottom:6 }}>Osobna sala</span>
            )}
            {isRestaurant && kidsMode && item.acceptsKids && (
              <span style={{ display:"inline-flex", alignItems:"center", fontSize:12, padding:"5px 11px", background:"transparent", border:`1px solid ${C.primary}`, borderRadius:20, color:C.primary, marginRight:6, marginBottom:6 }}>Przyjazna dzieciom</span>
            )}
            {isRestaurant && item.maxPeople && <InfoPill text={kidsMode ? `Mieści do ${item.maxPeople} osób (dzieci + dorośli)` : `Mieści do ${item.maxPeople} osób`} />}
            {!isRestaurant && <InfoPill text={item.duration} />}
            {!isRestaurant && kidsMode && item.kidsMinAge && <InfoPill text={`od ${item.kidsMinAge} lat`} />}
            {!isRestaurant && item.requiresSeparateRoom && (
              <span style={{ fontSize:11, color:C.muted }}>* potrzebna osobna sala</span>
            )}
          </div>

          {/* Description */}
          <p style={{ fontSize:14, color:C.muted, lineHeight:1.75, margin:"0 0 22px", fontWeight:300 }}>
            {isRestaurant ? item.fullDescription : item.bio}
          </p>

          {/* Social media — na środku profilu. Tylko dla restauracji: przy
              warsztatach jedyną ścieżką kontaktu ma być kreator zapytania,
              nie bezpośrednie dane artysty. */}
          {isRestaurant && (item.website && item.website !== "#" || item.instagramUrl || item.facebookUrl) && (
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:22, flexWrap:"wrap" }}>
              {item.website && item.website !== "#" && (
                <a href={item.website} target="_blank" rel="noreferrer" aria-label="Strona www" style={{ display:"flex", alignItems:"center", justifyContent:"center", width:40, height:40, borderRadius:"50%", background:C.tagBg }}>
                  <WebsiteIcon />
                </a>
              )}
              {item.instagramUrl && (
                <a href={item.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" style={{ display:"flex", alignItems:"center", justifyContent:"center", width:40, height:40, borderRadius:"50%", background:C.tagBg }}>
                  <InstagramIcon />
                </a>
              )}
              {item.facebookUrl && (
                <a href={item.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" style={{ display:"flex", alignItems:"center", justifyContent:"center", width:40, height:40, borderRadius:"50%", background:C.tagBg }}>
                  <FacebookIcon />
                </a>
              )}
            </div>
          )}

          <div style={{ height:1, background:C.border, marginBottom:20 }} />

          {/* Packages / Includes */}
          {isRestaurant ? (
            <>
              <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", marginBottom:12 }}>Wybierz pakiet:</div>
              {item.variants.map(v => {
                const sel = selectedVariantId === v.id;
                return (
                  <div key={v.id} onClick={() => onVariantSelect(v.id)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, marginBottom:8, cursor:"pointer", background:"#F3E8D6", border:`1px solid ${sel ? C.primary : "transparent"}` }}>
                    <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0, border:`2px solid ${sel ? C.primary : C.border}`, background:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {sel && <div style={{ width:7, height:7, borderRadius:"50%", background:C.primary }} />}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight: sel ? 600 : 500, color:C.text }}>{v.label}</div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{v.detail}</div>
                    </div>
                    <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, color:C.primary, fontWeight:400 }}>
                      {v.price == null ? (
                        "cena do ustalenia"
                      ) : (
                        <>{v.priceMax ? `${v.price}–${v.priceMax}` : v.price} zł<span style={{ fontSize:11, color:C.muted, fontWeight:400, marginLeft:2 }}>{kidsMode ? "/dziecko" : "/os."}</span></>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", marginBottom:12 }}>Co jest wliczone:</div>
              {item.includes.map((inc, i) => (
                <div key={i} style={{ fontSize:13, color:C.muted, marginBottom:7, display:"flex", gap:8 }}>
                  <span style={{ color:C.primary, fontWeight:600, flexShrink:0 }}>+</span> {inc}
                </div>
              ))}
              <div style={{ marginTop:16, display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:32, color:C.primary, fontWeight:400 }}>{item.pricePerPerson} zł</span>
                <span style={{ fontSize:12, color:C.muted }}>{kidsMode ? "/dziecko" : "/os."} · {item.duration}</span>
              </div>
            </>
          )}

          {isRestaurant && (
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.5, marginTop:20 }}>
              Ceny pakietów są orientacyjne — dokładne menu ustalicie bezpośrednio z restauracją.
              {kidsMode && <><br />* Tort ustalacie indywidualnie z restauracją.</>}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => { if (!isSelected) onToggleSelect(); onClose(); }}
            style={{ marginTop: isRestaurant ? 12 : 24, width:"100%", background:C.primary, color:"#FFF", border:"none", borderRadius:999, padding:16, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            {isSelected
              ? "Dodaj ten pakiet"
              : isRestaurant ? "Wybierz tę restaurację" : "Dodaj ten warsztat"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══ Karta restauracji ════════════════════════════════════════

function RestaurantCard({ r, isSelected, selectedVariantId, onToggle, onVariantSelect, onProfile, kidsMode = false }) {
  const soon = r.comingSoon;
  const pricedVariants = r.variants.filter(v => v.price != null);
  const minPrice = pricedVariants.length ? Math.min(...pricedVariants.map(v => v.price)) : null;
  const unitLabel = kidsMode ? "/dziecko" : "/os.";
  return (
    <div className={soon ? "" : "card-h"} style={{ background: isSelected ? C.selectedBg : soon ? "#F5F4F1" : C.card, border:`2px solid ${isSelected ? C.primary : "transparent"}`, borderRadius:14, overflow:"hidden", boxShadow: isSelected ? "0 4px 16px rgba(67,42,22,0.14)" : soon ? "none" : "0 1px 5px rgba(0,0,0,0.07)", position:"relative", opacity: soon ? 0.78 : 1, display:"flex", flexDirection:"column", width:"100%" }}>

      {r.photo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative" }}>
          <img src={r.photo} alt={r.name} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition: r.photo.includes("magazyn-gallery-1") ? "center 12%" : r.photo.includes("zuk-gallery-0") ? "center 85%" : "center", display:"block" }} />
        </div>
      ) : r.logo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative", background:"#FFFFFF", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={r.logo} alt={r.name} loading="lazy" style={{ width:110, height:110, objectFit:"contain", display:"block" }} />
        </div>
      ) : null}

      {/* Wkrótce badge */}
      {soon && (
        <div style={{ position:"absolute", top:14, right:12, background:"#E8E4DC", borderRadius:10, padding:"3px 9px", fontSize:10, fontWeight:600, color:"#888", letterSpacing:"0.1em" }}>Wkrótce</div>
      )}

      <div onClick={soon ? undefined : onToggle} style={{ padding:"18px 20px 8px", cursor: soon ? "default" : "pointer", flex:"1 1 auto" }}>
        {isSelected && !soon && (
          <div style={{ position:"absolute", top:16, right:14, background:C.primary, borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#FFF" }}>✓</div>
        )}
        <div className="card-title-clamp" style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:21, fontWeight:400, lineHeight:1.25, color: soon ? "#999" : C.text, marginBottom:2 }}>{r.name}</div>
        <div style={{ fontSize:10, letterSpacing:"0.1em", color:C.muted, marginBottom:8 }}>{r.vibe} · {r.location}</div>
        <p style={{ fontSize:13, color:C.muted, margin:"0 0 12px", lineHeight:1.55, fontWeight:300 }}>{r.description}</p>

        {r.hasSeparateRoom && !soon && (
          <span style={{ display:"inline-block", fontSize:11, padding:"3px 9px", borderRadius:10, background:C.tagBg, color:C.muted, marginBottom:10 }}>Osobna sala</span>
        )}

        {isSelected && !soon && (
          <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.1em", marginBottom:8 }}>Wybierz pakiet:</div>
            {r.variants.map(v => {
              const sel = selectedVariantId === v.id;
              return (
                <div key={v.id} onClick={e => { e.stopPropagation(); onVariantSelect(v.id); }}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", borderRadius:9, marginBottom:7, cursor:"pointer", background:"#F3E8D6", border:`1px solid ${sel ? C.primary : "transparent"}` }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0, border:`2px solid ${sel ? C.primary : C.border}`, background:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {sel && <div style={{ width:7, height:7, borderRadius:"50%", background:C.primary }} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:C.text, fontWeight: sel ? 600 : 400 }}>{v.label}</div>
                    {v.detail && <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{v.detail}</div>}
                  </div>
                  <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:17, color:C.primary }}>
                    {v.price == null ? "cena do ustalenia" : `${v.priceMax ? `${v.price}–${v.priceMax}` : v.price} zł`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {soon ? (
          <div style={{ marginTop:12, fontSize:13, color:"#BBB", fontStyle:"italic" }}>Cena wkrótce</div>
        ) : !isSelected && (
          <div style={{ marginTop:12 }}>
            {minPrice == null ? (
              <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:16, color:C.primary }}>cena do ustalenia</span>
            ) : (
              <>
                <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:22, color:C.primary }}>od {minPrice} zł</span>
                <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>{unitLabel}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile link */}
      <div style={{ padding:"0 20px 16px" }}>
        <button onClick={e => { e.stopPropagation(); onProfile(); }} style={{ fontSize:12, color: soon ? "#BBB" : C.primary, background:"transparent", border:"none", cursor:"pointer", padding:"11px 0", minHeight:44, display:"inline-flex", alignItems:"center", fontWeight:500, textDecoration: soon ? "none" : "underline", fontFamily:"'Montserrat', system-ui, sans-serif" }}>
          {soon ? "Profil w przygotowaniu" : "Zobacz profil →"}
        </button>
      </div>
    </div>
  );
}

// ══ Karta warsztatu ══════════════════════════════════════════

function WorkshopCard({ w, isSelected, onToggle, onProfile, kidsMode = false }) {
  const soon = w.comingSoon;
  return (
    <div className={soon ? "" : "card-h"} style={{ background: isSelected ? C.selectedBg : soon ? "#F5F4F1" : C.card, border:`2px solid ${isSelected ? C.primary : "transparent"}`, borderRadius:14, overflow:"hidden", boxShadow: isSelected ? "0 4px 16px rgba(67,42,22,0.14)" : soon ? "none" : "0 1px 5px rgba(0,0,0,0.07)", position:"relative", opacity: soon ? 0.78 : 1, display:"flex", flexDirection:"column", width:"100%" }}>
      {w.photo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative" }}>
          <img src={w.photo} alt={w.name} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition: w.photo.includes("workshop-painting-photo") ? "center 25%" : "center", display:"block" }} />
        </div>
      ) : w.logo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative", background:"#ECE4D7", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={w.logo} alt={w.name} loading="lazy" style={{ width:110, height:110, objectFit:"contain", display:"block" }} />
        </div>
      ) : null}

      {/* Wkrótce badge */}
      {soon && (
        <div style={{ position:"absolute", top:14, right:12, background:"#E8E4DC", borderRadius:10, padding:"3px 9px", fontSize:10, fontWeight:600, color:"#888", letterSpacing:"0.1em" }}>Wkrótce</div>
      )}

      <div onClick={soon ? undefined : onToggle} style={{ padding:"18px 20px 8px", cursor: soon ? "default" : "pointer", flex:"1 1 auto" }}>
        {isSelected && !soon && (
          <div style={{ position:"absolute", top:16, right:14, background:C.primary, borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#FFF" }}>✓</div>
        )}
        <div className="card-title-clamp" style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, fontWeight:400, lineHeight:1.25, color: soon ? "#999" : C.text, marginBottom:2 }}>{w.name}</div>
        <div style={{ fontSize:10, letterSpacing:"0.1em", color:C.muted, marginBottom:8 }}>{w.artist}</div>
        <p style={{ fontSize:13, color:C.muted, margin:"0 0 12px", lineHeight:1.55, fontWeight:300 }}>{w.description}</p>

        {!soon && (
          <span style={{ fontSize:11, padding:"3px 9px", borderRadius:10, background: isSelected ? "rgba(255,255,255,0.6)" : C.tagBg, color:C.muted }}>{w.duration}</span>
        )}

        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, margin:"12px 0 14px" }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.08em", marginBottom:8 }}>W CENIE:</div>
          {w.includes.map((item, i) => (
            <div key={i} style={{ fontSize:12, color: soon ? "#BBB" : C.muted, marginBottom:5, display:"flex", gap:7 }}>
              <span style={{ color: soon ? "#CCC" : C.primary, fontWeight:600 }}>+</span> {item}
            </div>
          ))}
        </div>

        {w.requiresSeparateRoom && !soon && (
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, marginBottom:8 }}>
            Ten warsztat wymaga osobnej sali — na kolejnym kroku pokażemy miejsca, które ją mają.
          </div>
        )}

        {soon ? (
          <div style={{ fontSize:13, color:"#BBB", fontStyle:"italic" }}>Cena wkrótce</div>
        ) : (
          <div>
            <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:26, fontWeight:400, color:C.primary }}>{w.pricePerPerson} zł</span>
            <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>{kidsMode ? "/dziecko" : "/os."}</span>
          </div>
        )}
      </div>

      <div style={{ padding:"0 20px 16px" }}>
        <button onClick={e => { e.stopPropagation(); onProfile(); }} style={{ fontSize:12, color: soon ? "#BBB" : C.primary, background:"transparent", border:"none", cursor:"pointer", padding:"11px 0", minHeight:44, display:"inline-flex", alignItems:"center", fontWeight:500, textDecoration: soon ? "none" : "underline", fontFamily:"'Montserrat', system-ui, sans-serif" }}>
          {soon ? "Profil w przygotowaniu" : "Zobacz profil artysty →"}
        </button>
      </div>
    </div>
  );
}

// ══ Polityka prywatności / stopka ═══════════════════════════

function PrivacyPolicyModal({ onClose }) {
  const section = { marginBottom: 18 };
  const h = { fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:15, fontWeight:600, color:C.text, marginBottom:6 };
  const p = { fontSize:13, color:C.muted, lineHeight:1.7, margin:0 };
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:600, overflowY:"auto", padding:"20px 12px", display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
      <div style={{ background:"#FFF", borderRadius:16, maxWidth:640, width:"100%", padding:"32px 28px", marginBottom:40 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:26, fontWeight:400 }}>Polityka prywatności</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.muted, padding:4, lineHeight:1 }}>✕</button>
        </div>

        <div style={section}>
          <div style={h}>Administrator danych</div>
          <p style={p}>Administratorem danych osobowych zbieranych przez ten formularz jest Joanna C. — Kawiarniani Artyści, kontakt: {COPY.contactEmail}.</p>
        </div>

        <div style={section}>
          <div style={h}>Jakie dane zbieramy i po co</div>
          <p style={p}>Zbieramy dane podane dobrowolnie w formularzu zapytania: imię i nazwisko, adres e-mail, numer telefonu (opcjonalnie), preferowany termin oraz treść wiadomości. Dane te służą wyłącznie do obsługi zapytania — skontaktowania się z Tobą i dopasowania oferty restauracji/warsztatu.</p>
        </div>

        <div style={section}>
          <div style={h}>Podstawa prawna</div>
          <p style={p}>Art. 6 ust. 1 lit. b RODO (podjęcie działań przed zawarciem umowy, na żądanie osoby, której dane dotyczą) oraz lit. f RODO (prawnie uzasadniony interes administratora — udzielenie odpowiedzi na zapytanie).</p>
        </div>

        <div style={section}>
          <div style={h}>Komu przekazujemy dane</div>
          <p style={p}>Dane są przetwarzane za pomocą usługi Resend (dostawca zewnętrzny realizujący wysyłkę wiadomości e-mail) oraz przekazywane restauracji/artyście, których dotyczy zapytanie, w celu jego realizacji. Nie przekazujemy danych innym podmiotom ani nie wykorzystujemy ich w celach marketingowych bez odrębnej zgody.</p>
        </div>

        <div style={section}>
          <div style={h}>Okres przechowywania</div>
          <p style={p}>Dane przechowujemy przez czas potrzebny do obsługi zapytania oraz maksymalnie 12 miesięcy od ostatniego kontaktu, chyba że wcześniej poprosisz o ich usunięcie.</p>
        </div>

        <div style={section}>
          <div style={h}>Twoje prawa</div>
          <p style={p}>Masz prawo do dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz wniesienia sprzeciwu, a także skargi do Prezesa Urzędu Ochrony Danych Osobowych. Podanie danych jest dobrowolne, ale niezbędne do obsługi zapytania.</p>
        </div>

        <div style={section}>
          <div style={h}>Pliki cookies</div>
          <p style={p}>Strona nie zapisuje własnych plików cookies. Do wyświetlania czcionek korzystamy z Google Fonts — w związku z tym Twój adres IP może być przetwarzany przez Google przy wczytywaniu strony.</p>
        </div>

        <div>
          <div style={h}>Kontakt</div>
          <p style={p}>Pytania dotyczące przetwarzania danych możesz kierować na adres: {COPY.contactEmail}.</p>
        </div>
      </div>
    </div>
  );
}

// Regulamin dla Partnerów (Restauracja/Artysta) — treść przekazana przez
// Joannę (plik "Kawiarniani_Artysci_Regulamin_Partnerzy..."). Sekcje mają
// numerację dokładnie jak w oryginale (niektóre paragrafy celowo pomijają
// numer — tak było w źródłowym dokumencie, nie poprawiam tego tutaj).
const PARTNER_TERMS_SECTIONS = [
  { title:"§ 1. Postanowienia ogólne", items: [
    "1. Platforma „Kawiarniani Artyści” (dalej: „Platforma”) jest serwisem internetowym dostępnym pod adresem kawiarnianiartysci.pl, którego celem jest umożliwienie kontaktu i rezerwacji eventów grupowych łączących ofertę gastronomiczną restauracji/kawiarni („Restauracja”) z warsztatami artystycznymi prowadzonymi przez artystów („Artysta”), zwanych dalej łącznie „Partnerami”.",
    "2. Platforma pełni funkcję wyłącznie technologicznego pośrednika umożliwiającego kontakt i rezerwację. Platforma nie jest organizatorem Eventu ani stroną umowy zawieranej pomiędzy Klientem a Partnerami.",
    "3. Platforma świadczy usługi w zakresie umożliwienia rezerwacji restauracji oraz warsztatów artystycznych na potrzeby eventów grupowych, obejmujących swoim zasięgiem Poznań i okolice.",
    "4. Regulamin jest udostępniany nieodpłatnie na stronie Platformy w formie umożliwiającej jego pobranie, utrwalenie i wydrukowanie, przed zawarciem jakiejkolwiek umowy, zgodnie z ustawą z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną.",
    "5. Administratorem Platformy jest Joanna Cybulska, z którą można się skontaktować pod adresem e-mail: kawiarnianiartysci@gmail.com, w tym w sprawach zgłoszeń dotyczących treści niezgodnych z prawem.",
  ]},
  { title:"§ 2. Definicje", items: [
    "Użyte w Regulaminie pojęcia oznaczają:",
    "1. Platforma — serwis internetowy „Kawiarniani Artyści” dostępny pod adresem kawiarnianiartysci.pl wraz z jego funkcjonalnościami.",
    "2. Klient — osoba fizyczna dokonująca za pośrednictwem Platformy Zapytania o rezerwację Eventu; w zakresie, w jakim działa jako konsument w rozumieniu art. 22¹ Kodeksu cywilnego, zwana dalej „Konsumentem”, w pozostałych przypadkach — „Przedsiębiorcą”.",
    "3. Artysta — Partner prowadzący warsztaty artystyczne lub inne aktywności twórcze prezentowane na Platformie.",
    "4. Restauracja — Partner udostępniający lokal gastronomiczny oraz ofertę restauracyjną prezentowaną na Platformie.",
    "5. Partner — odpowiednio Artysta i/lub Restauracja.",
    "6. Event — wydarzenie organizowane przez Klienta z wykorzystaniem usług Restauracji i/lub Artysty, zarezerwowane za pośrednictwem Platformy.",
    "7. Zapytanie — zgłoszenie wysłane przez Klienta za pomocą formularza na Platformie, wyrażające wolę rezerwacji Eventu, przekazywane jednocześnie do wybranej Restauracji i wybranego Artysty.",
    "8. Zadatek — wpłata dokonywana przez Klienta po potwierdzeniu terminu Eventu przez Restaurację i Artystę, w wysokości 30% łącznej szacowanej kwoty Eventu.",
  ]},
  { title:"§ 3. Rejestracja i konta Partnerów (Restauracja, Artysta)", items: [
    "1. Restauracja lub Artysta mogą dołączyć do Platformy jako Partner poprzez wypełnienie formularza zgłoszeniowego dostępnego na Platformie, podając dane niezbędne do utworzenia profilu (nazwa, adres, numer NIP i numer KRS (jeżeli występuje), opis, oferta cenowa, dane kontaktowe, zdjęcia).",
    "2. Partner oświadcza, że dane oraz treści zamieszczane w jego profilu (w tym opisy, ceny, zdjęcia, informacje o pojemności lokalu) są prawdziwe, aktualne i nie naruszają praw osób trzecich ani przepisów prawa. Platforma nie ponosi odpowiedzialności za treść informacji zamieszczanych w profilach Restauracji i Partnerów.",
    "3. Platforma zastrzega sobie prawo do weryfikacji zgłoszenia Partnera przed publikacją profilu, a także do zawieszenia lub usunięcia profilu Partnera w przypadku uzyskania wiarygodnych informacji o nierzetelności Partnera, naruszeniu niniejszego Regulaminu lub przepisów prawa.",
    "4. Partner ponosi wyłączną odpowiedzialność za aktualność swojej oferty, w tym cennika i dostępnych terminów.",
  ]},
  { title:"§ 4. Zasady korzystania z Platformy przez Klienta", items: [
    "1. Korzystanie z formularza Zapytania nie wymaga założenia konta przez Klienta (chyba że funkcjonalność ta zostanie wprowadzona w przyszłości).",
    "2. Osoba dokonująca Zapytania oświadcza, że jest pełnoletnia — ze względu na charakter części ofert, w tym pakiety obejmujące napoje alkoholowe (np. wino, piwo, prosecco).",
    "3. Klient zobowiązany jest do podania prawdziwych danych kontaktowych niezbędnych do realizacji Zapytania (imię i nazwisko, adres e-mail, numer telefonu).",
  ]},
  { title:"§ 5. Procedura rezerwacji i płatności", items: [
    "1. Klient wybiera na Platformie Restaurację wraz z wybranym pakietem gastronomicznym oraz Warsztat artystyczny; Platforma prezentuje orientacyjny koszt na osobę oraz łączną szacowaną kwotę Eventu.",
    "2. Klient wysyła Zapytanie za pomocą formularza — Zapytanie trafia jednocześnie do wybranego Artysty oraz wybranej Restauracji.",
    "3. Artysta potwierdza dostępność terminu oraz liczbę uczestników; potwierdzenie przekazywane jest Restauracji.",
    "4. Po potwierdzeniu terminu przez Artystę, Restauracja potwierdza dostępność terminu Klientowi i informuje o konieczności wniesienia Zadatku w wysokości 30% łącznej szacowanej kwoty Eventu, płatnego w całości na rachunek Restauracji.",
    "5. Pozostałą część należności (70%) Klient wpłaca w całości na rachunek Restauracji, po zrealizowaniu Eventu.",
    "6. Po otrzymaniu Zadatku Restauracja przekazuje cześć Zadatku proporcjonalnie przypadającego na wynagrodzenie Artyście temu Artyście.",
    "7. Restauracja, po zrealizowaniu Eventu, przekazuje Artyście należną część wynagrodzenia za przeprowadzony Warsztat, zgodnie z ustaleniami dokonanymi między Restauracją a Artystą przy potwierdzaniu Zapytania.",
    "8. Rozliczenie należności między Restauracją a Artystą następuje w jeden z poniższych sposobów, zależnie od formy prowadzonej przez Artystę działalności:",
    "— jeżeli Artysta prowadzi zarejestrowaną działalność gospodarczą — wystawia Restauracji fakturę za swoją część wynagrodzenia;",
    "— jeżeli Artysta nie prowadzi działalności gospodarczej — Restauracja i Artysta zawierają odrębną umowę o dzieło regulującą to rozliczenie, wraz z wynikającymi z niej obowiązkami Restauracji jako płatnika.",
    "9. Platforma nie pośredniczy w przepływie środków pieniężnych — cała płatność od Klienta trafia na rachunek Restauracji, a rozliczenie z Artystą odbywa się bezpośrednio między Restauracją a Artystą, poza Platformą.",
    "10. Dokument sprzedaży wobec Klienta (fakturę lub paragon na łączną kwotę Eventu) wystawia Restauracja.",
    "11. Platforma nie ponosi odpowiedzialności za błędy w zakresie ceny wskazanej przez Partnera.",
  ]},
  { title:"§ 6. Zasady anulowania rezerwacji i zwrotu Zadatku", items: [
    "1. Odwołanie rezerwacji przez Klienta następuje poprzez zgłoszenie w formie wiadomości e-mail na adres kontaktowy Platformy lub bezpośrednio do Restauracji/Artysty, z potwierdzeniem otrzymania zgłoszenia.",
    "2. Zasady zwrotu Zadatku w przypadku odwołania Eventu przez Klienta:",
    "— odwołanie na więcej niż 14 dni przed Eventem — pełny zwrot Zadatku;",
    "— odwołanie na mniej niż 14 dni przed Eventem — Zadatek nie podlega zwrotowi.",
    "3. W przypadku odwołania Eventu przez Restaurację lub Artystę, Restauracja zwraca Klientowi pełną wpłaconą kwotę Zadatku, bez obowiązku zwrotu kwoty dwukrotnie wyższej. Jeżeli przyczyną odwołania jest Artysta, rozliczenie z tego tytułu między Restauracją a Artystą następuje odrębnie, poza Platformą.",
  ]},
  { title:"§ 7. Prawo odstąpienia od umowy zawartej na odległość", items: [
    "1. Zgodnie z art. 38 pkt 12 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, Konsumentowi nie przysługuje prawo odstąpienia od umowy o świadczenie usług związanych z wydarzeniami rozrywkowymi, sportowymi lub kulturalnymi, jeżeli w umowie oznaczono dzień lub okres świadczenia usługi — co dotyczy usług rezerwowanych za pośrednictwem Platformy.",
    "2. Przed potwierdzeniem rezerwacji Klient zostanie w sposób wyraźny poinformowany o wyłączeniu prawa odstąpienia, o którym mowa w ust. 1 (np. poprzez odpowiedni checkbox lub czytelny komunikat w formularzu Zapytania).",
  ]},
  { title:"§ 8. Odpowiedzialność Platformy i wyłączenia odpowiedzialności", items: [
    "1. Platforma pełni funkcję wyłącznie technologicznego pośrednika umożliwiającego kontakt i rezerwację pomiędzy Klientem a Partnerami.",
    "2. Umowa o realizację Eventu zawierana jest bezpośrednio pomiędzy Klientem a Restauracją i/lub Artystą — Platforma nie jest stroną tej umowy.",
    "3. Platforma nie ponosi odpowiedzialności za jakość, terminowość ani sposób wykonania usługi przez Restaurację lub Artystę.",
    "4. Powyższe wyłączenie nie dotyczy odpowiedzialności Platformy za jej własne działania, a także szkody wyrządzone z winy umyślnej lub wskutek rażącego niedbalstwa w zakresie funkcjonowania samej Platformy.",
  ]},
  { title:"§ 9. Odpowiedzialność za treści i profile Partnerów", items: [
    "1. Treści zamieszczane w profilach Partnerów (opisy, zdjęcia, ceny, informacje o pojemności lokalu itp.) są wprowadzane za pośrednictwem platformy przez formularz zgłoszeniowy.",
    "3. Klient może zgłosić nieprawidłowość lub nieaktualność informacji zamieszczonych w profilu Partnera na adres e-mail kontaktowy Platformy. Platforma podejmie działania wyjaśniające i, w uzasadnionych przypadkach, może zawiesić widoczność profilu do czasu wyjaśnienia zgłoszenia.",
  ]},
  { title:"§ 10. Reklamacje i rozwiązywanie sporów między stronami", items: [
    "1. Platforma nie jest stroną umowy o realizację Eventu, nie ponosi odpowiedzialności za spory dotyczące jej wykonania powstałe między Klientem a Partnerem.",
    "3. Reklamacje dotyczące wyłącznie funkcjonowania samej Platformy (np. błędów technicznych formularza rezerwacyjnego) można zgłaszać na adres e-mail kontaktowy Platformy.",
  ]},
  { title:"§ 11. Zmiana Regulaminu i warunków współpracy z Partnerami", items: [
    "1. Platforma zastrzega sobie prawo do zmiany niniejszego Regulaminu, w tym warunków współpracy z Partnerami oraz wprowadzenia opłat za korzystanie z Platformy przez Partnerów.",
    "2. O planowanej zmianie zarejestrowani Partnerzy zostaną poinformowani z co najmniej 14-dniowym wyprzedzeniem, bezpośrednio na wskazany adres e-mail.",
    "3. Partner, który nie akceptuje zmiany, ma prawo usunąć swoje konto przed jej wejściem w życie, bez dodatkowych sankcji.",
    "4. Zmiany Regulaminu nie mają zastosowania do rezerwacji już potwierdzonych i opłaconych przed dniem wejścia zmian w życie.",
  ]},
  { title:"§ 12. Ochrona danych osobowych (RODO)", items: [
    "1. Administratorem danych osobowych Klienta zbieranych w formularzu Zapytania (imię i nazwisko, adres e-mail, numer telefonu, preferowany termin Eventu, treść wiadomości) jest Platforma.",
    "2. Restauracja oraz Artysta, którym przekazywane są dane Klienta w celu realizacji Zapytania, są wobec tych danych odrębnymi administratorami — przekazanie danych nie stanowi powierzenia przetwarzania.",
    "3. Dane przetwarzane są w celu i na podstawie niezbędności do podjęcia działań przed zawarciem umowy oraz jej wykonania (art. 6 ust. 1 lit. b RODO).",
    "4. Przy formularzu Zapytania Klient jest informowany, do jakich konkretnie podmiotów (nazwa wybranej Restauracji i Artysty) zostaną przekazane jego dane, oraz proszony o odrębną zgodę na to przekazanie.",
    "5. Szczegółowe informacje dotyczące przetwarzania danych osobowych, w tym praw osoby, której dane dotyczą (dostęp, sprostowanie, usunięcie, sprzeciw), znajdują się w Polityce Prywatności dostępnej na Platformie.",
  ]},
  { title:"§ 13. Postanowienia końcowe", items: [
    "1. Prawem właściwym dla niniejszego Regulaminu jest prawo polskie.",
    "2. W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają powszechnie obowiązujące przepisy prawa polskiego.",
    "3. Regulamin wchodzi w życie z dniem 16.07.2026.",
  ]},
];

function PartnerTermsModal({ onClose }) {
  const section = { marginBottom: 18 };
  const h = { fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:15, fontWeight:600, color:C.text, marginBottom:6 };
  const p = { fontSize:13, color:C.muted, lineHeight:1.7, margin:"0 0 6px" };
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:600, overflowY:"auto", padding:"20px 12px", display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
      <div style={{ background:"#FFF", borderRadius:16, maxWidth:640, width:"100%", padding:"32px 28px", marginBottom:40 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:24, fontWeight:400 }}>Regulamin Platformy „Kawiarniani Artyści”</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.muted, padding:4, lineHeight:1 }}>✕</button>
        </div>
        <p style={{ ...p, marginBottom:22, fontStyle:"italic" }}>Regulamin dla Partnerów (Restauracji i Artystów) oraz zasad korzystania z Platformy przez Klientów.</p>

        {PARTNER_TERMS_SECTIONS.map(s => (
          <div key={s.title} style={section}>
            <div style={h}>{s.title}</div>
            {s.items.map((it, i) => <p key={i} style={p}>{it}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  return (
    <>
      <div style={{ textAlign:"center", padding:"20px 16px", fontSize:11, color:C.muted, borderTop:`1px solid ${C.border}` }}>
        © {new Date().getFullYear()} {COPY.siteName} ·{" "}
        <button onClick={() => setShowPrivacy(true)} style={{ background:"none", border:"none", color:C.muted, textDecoration:"underline", cursor:"pointer", fontSize:11, padding:0 }}>
          Polityka prywatności
        </button>
      </div>
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
    </>
  );
}

// Klient nie może zarezerwować terminu wcześniej niż za 14 dni roboczych
function minBookingDateStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < 14) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  // uwaga: toISOString() konwertuje na UTC i cofa datę o dzień w polskiej
  // strefie czasowej — budujemy string YYYY-MM-DD z lokalnych wartości
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const MIN_BOOKING_DATE = minBookingDateStr();

// Godziny do wyboru — zarówno w panelu na stronie głównej, jak i przy
// edycji terminu w podsumowaniu (krok 3).
const TIME_OPTIONS = [];
for (let h = 10; h <= 18; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 18) TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

// ══ Ekran powitalny ══════════════════════════════════════════

// Sekunda, od której zaczyna się (i zapętla) wideo w tle — pomija powolny
// początek klipu, żeby szybciej było widać ludzi przy malowaniu.
const HERO_VIDEO_START = 5;

// Dekoracyjna ikonka zegara przy polu Godzina — czysto ozdobna,
// `pointerEvents:"none"` żeby nie blokować kliknięcia w pole pod spodem.
function ClockIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", opacity:0.85 }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// ══ Własny kalendarz i lista godzin (zamiast natywnych <input type="date">
// / <select>) ═══════════════════════════════════════════════════
// Na Androidzie systemowy date-picker i lista <select> renderują się jako
// natywne okno telefonu — kolor i rozmiar sterowane są motywem systemu
// (ciemny/jasny), nie CSS-em strony; `color-scheme` tylko częściowo to
// naprawia. Żeby mieć pełną kontrolę (jasny motyw, mały rozmiar, spójny
// wszędzie), rysujemy własny miesięczny kalendarz i własną listę godzin.
const PL_MONTHS = ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
const PL_MONTHS_SHORT = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
const PL_WEEKDAYS = ["pon","wt","śr","czw","pt","sob","nd"];

function dateToStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${PL_MONTHS_SHORT[d.getMonth()]}`;
}

// Wspólny wygląd rozwijanego panelu (kalendarz/lista godzin) — ten sam,
// co istniejące popovery "Liczba osób"/"Liczba dzieci" w paskach filtrów.
const dropdownPopoverStyle = { position:"absolute", top:"calc(100% + 8px)", left:0, background:"#FFF", border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 10px 32px rgba(0,0,0,0.14)", padding:16, zIndex:50, cursor:"default" };

const calendarNavBtnStyle = { width:26, height:26, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", color:C.primary, cursor:"pointer", fontSize:14, lineHeight:1, flexShrink:0 };

function MiniCalendar({ value, onChange, min }) {
  const seed = value ? new Date(value + "T00:00:00") : (min ? new Date(min + "T00:00:00") : new Date());
  const [viewMonth, setViewMonth] = useState(new Date(seed.getFullYear(), seed.getMonth(), 1));
  const minDate = min ? new Date(min + "T00:00:00") : null;

  const year = viewMonth.getFullYear(), month = viewMonth.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // pon = 0, zamiast domyślnej niedzieli w JS
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div style={{ width:236 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={calendarNavBtnStyle}>‹</button>
        <div style={{ fontSize:13, fontWeight:600, color:C.primary, textTransform:"capitalize" }}>{PL_MONTHS[month]} {year}</div>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={calendarNavBtnStyle}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2, marginBottom:2 }}>
        {PL_WEEKDAYS.map(w => <div key={w} style={{ fontSize:10, color:C.muted, textAlign:"center" }}>{w}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const cellDate = new Date(year, month, d);
          const cellStr = dateToStr(cellDate);
          const disabled = minDate && cellDate < minDate;
          const selected = value === cellStr;
          return (
            <button key={i} disabled={disabled} onClick={() => onChange(cellStr)} style={{
              width:"100%", aspectRatio:"1", border:"none", borderRadius:8, fontSize:12,
              cursor: disabled ? "default" : "pointer",
              background: selected ? C.primary : "transparent",
              color: disabled ? "#CCC" : selected ? "#FFF" : C.text,
              fontWeight: selected ? 600 : 400,
            }}>{d}</button>
          );
        })}
      </div>
    </div>
  );
}

function TimeOptionsList({ value, onChange }) {
  return (
    <div style={{ maxHeight:216, overflowY:"auto", width:120 }}>
      {TIME_OPTIONS.map(t => {
        const selected = value === t;
        return (
          <div key={t} onClick={() => onChange(t)} style={{
            padding:"9px 12px", fontSize:13, cursor:"pointer", borderRadius:8,
            color: selected ? C.primary : C.text, fontWeight: selected ? 600 : 400,
            background: selected ? C.selectedBg : "transparent",
          }}>{t}</div>
        );
      })}
    </div>
  );
}

// Panel filtrów na stronie głównej — jeden wspólny zaokrąglony pasek
// podzielony cienką linią. Pole z wybraną wartością dostaje tylko
// delikatne brązowe obramowanie (bez wypełnienia); puste pola są całkiem
// puste, bez tekstu zastępczego typu "Dowolne". Liczba osób, Data i Godzina —
// Godzina wybierana tu (nie dopiero w podsumowaniu), żeby filtr godzin
// zamknięcia restauracji mógł zawężać listę miejsc w kroku 2. Miejsce
// zostaje pominięte (patrz brief reorganizacji).
function HomeFilterBar({ groupSize, setGroupSize, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) {
  const [openField, setOpenField] = useState(null);
  const barRef = useRef(null);
  const toggle = f => setOpenField(openField === f ? null : f);

  useEffect(() => {
    if (!openField) return;
    const onOutside = e => { if (barRef.current && !barRef.current.contains(e.target)) setOpenField(null); };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [openField]);

  const openPeople = () => { if (groupSize == null) setGroupSize(10); toggle("people"); };

  const segStyle = active => ({
    flex:1, minWidth:0, padding:"10px 18px", cursor:"pointer", position:"relative",
    borderRadius:999,
    border: `1px solid ${active ? C.primary : "transparent"}`,
  });
  const segLabel = active => ({ fontSize:9, fontWeight:700, color: active ? C.primary : C.muted, letterSpacing:"0.06em", whiteSpace:"nowrap" });
  const segValue = active => ({ fontSize:13, color: active ? C.primary : C.text, fontWeight: active ? 600 : 400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minHeight:16 });

  return (
    <div ref={barRef} style={{ maxWidth:1160, margin:"0 auto 28px", position:"relative" }}>
      <div className="search-bar" style={{ display:"flex", alignItems:"stretch", background:"#FFF", border:`1px solid ${C.border}`, borderRadius:999, boxShadow:"0 4px 18px rgba(0,0,0,0.07)", padding:5 }}>

        <div onClick={openPeople} style={segStyle(!!groupSize)}>
          <div style={segLabel(!!groupSize)}>LICZBA OSÓB</div>
          <div style={segValue(!!groupSize)}>{groupSize ? `${groupSize} os.` : ""}</div>
          {openField === "people" && (
            <div className="modal-fade" onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"calc(100% + 8px)", left:0, background:"#FFF", border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 10px 32px rgba(0,0,0,0.14)", padding:20, minWidth:200, zIndex:50, cursor:"default" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"center" }}>
                <button onClick={() => setGroupSize(Math.max(5, (groupSize ?? 10) - 1))} style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:18, color:C.primary }}>−</button>
                <span style={{ fontSize:22, fontWeight:600, color:C.primary, minWidth:30, textAlign:"center" }}>{groupSize ?? 10}</span>
                <button onClick={() => setGroupSize(Math.min(20, (groupSize ?? 10) + 1))} style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:18, color:C.primary }}>+</button>
              </div>
            </div>
          )}
        </div>

        <div className="search-divider" style={{ background:C.border }} />

        <div onClick={() => toggle("date")} style={segStyle(!!selectedDate)}>
          <div style={segLabel(!!selectedDate)}>DATA</div>
          <div style={segValue(!!selectedDate)}>{selectedDate ? formatDateShort(selectedDate) : ""}</div>
          {openField === "date" && (
            <div className="modal-fade" onClick={e => e.stopPropagation()} style={dropdownPopoverStyle}>
              <MiniCalendar value={selectedDate} min={MIN_BOOKING_DATE} onChange={d => { setSelectedDate(d); setOpenField(null); }} />
            </div>
          )}
        </div>

        <div className="search-divider" style={{ background:C.border }} />

        <div onClick={() => toggle("time")} style={segStyle(!!selectedTime)}>
          <div style={segLabel(!!selectedTime)}>GODZINA</div>
          <div style={segValue(!!selectedTime)}>{selectedTime || ""}</div>
          <ClockIcon color={selectedTime ? C.primary : C.muted} />
          {openField === "time" && (
            <div className="modal-fade" onClick={e => e.stopPropagation()} style={dropdownPopoverStyle}>
              <TimeOptionsList value={selectedTime} onChange={t => { setSelectedTime(t); setOpenField(null); }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Panel filtrów ekranu startowego trybu "Eventy dla dzieci" — wizualnie
// identyczny wzorzec co HomeFilterBar, ale 4 pola: Liczba dzieci (liczy
// się do ceny), Liczba dorosłych (czysto informacyjne — dla ilu przygotować
// miejsca), Data, Godzina (godzina jest tu konieczna, bo bez niej filtr
// godzin otwarcia restauracji nigdy by się nie aktywował — patrz isKidsCompatible).
function KidsFilterBar({ kidsCount, setKidsCount, adultsCount, setAdultsCount, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) {
  const [openField, setOpenField] = useState(null);
  const barRef = useRef(null);
  const toggle = f => setOpenField(openField === f ? null : f);

  useEffect(() => {
    if (!openField) return;
    const onOutside = e => { if (barRef.current && !barRef.current.contains(e.target)) setOpenField(null); };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [openField]);

  const openKids = () => { if (kidsCount == null) setKidsCount(8); toggle("kids"); };
  const openAdults = () => { if (adultsCount == null) setAdultsCount(0); toggle("adults"); };

  const segStyle = active => ({ flex:1, minWidth:0, padding:"10px 16px", cursor:"pointer", position:"relative", borderRadius:999, border:`1px solid ${active ? C.primary : "transparent"}` });
  const segLabel = active => ({ fontSize:9, fontWeight:700, color: active ? C.primary : C.muted, letterSpacing:"0.06em", whiteSpace:"nowrap" });
  const segValue = active => ({ fontSize:13, color: active ? C.primary : C.text, fontWeight: active ? 600 : 400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minHeight:16 });

  const stepper = (value, setValue, min, max) => (
    <div className="modal-fade" onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"calc(100% + 8px)", left:0, background:"#FFF", border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 10px 32px rgba(0,0,0,0.14)", padding:20, minWidth:200, zIndex:50, cursor:"default" }}>
      <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"center" }}>
        <button onClick={() => setValue(Math.max(min, value - 1))} style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:18, color:C.primary }}>−</button>
        <span style={{ fontSize:22, fontWeight:600, color:C.primary, minWidth:30, textAlign:"center" }}>{value}</span>
        <button onClick={() => setValue(Math.min(max, value + 1))} style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:18, color:C.primary }}>+</button>
      </div>
    </div>
  );

  return (
    <div ref={barRef} style={{ maxWidth:1160, margin:"0 auto 28px", position:"relative" }}>
      <div className="search-bar" style={{ display:"flex", alignItems:"stretch", background:"#FFF", border:`1px solid ${C.border}`, borderRadius:999, boxShadow:"0 4px 18px rgba(0,0,0,0.07)", padding:5 }}>
        <div onClick={openKids} style={segStyle(!!kidsCount)}>
          <div style={segLabel(!!kidsCount)}>LICZBA DZIECI</div>
          <div style={segValue(!!kidsCount)}>{kidsCount ? `${kidsCount}` : ""}</div>
          {openField === "kids" && stepper(kidsCount ?? 8, setKidsCount, 1, 30)}
        </div>
        <div className="search-divider" style={{ background:C.border }} />
        <div onClick={openAdults} style={segStyle(adultsCount != null)}>
          <div style={segLabel(adultsCount != null)}>LICZBA DOROSŁYCH</div>
          <div style={segValue(adultsCount != null)}>{adultsCount != null ? `${adultsCount}` : ""}</div>
          {openField === "adults" && stepper(adultsCount ?? 0, setAdultsCount, 0, 30)}
        </div>
        <div className="search-divider" style={{ background:C.border }} />
        <div onClick={() => toggle("date")} style={segStyle(!!selectedDate)}>
          <div style={segLabel(!!selectedDate)}>DATA</div>
          <div style={segValue(!!selectedDate)}>{selectedDate ? formatDateShort(selectedDate) : ""}</div>
          {openField === "date" && (
            <div className="modal-fade" onClick={e => e.stopPropagation()} style={dropdownPopoverStyle}>
              <MiniCalendar value={selectedDate} min={MIN_BOOKING_DATE} onChange={d => { setSelectedDate(d); setOpenField(null); }} />
            </div>
          )}
        </div>
        <div className="search-divider" style={{ background:C.border }} />
        <div onClick={() => toggle("time")} style={segStyle(!!selectedTime)}>
          <div style={segLabel(!!selectedTime)}>GODZINA</div>
          <div style={segValue(!!selectedTime)}>{selectedTime || ""}</div>
          <ClockIcon color={selectedTime ? C.primary : C.muted} />
          {openField === "time" && (
            <div className="modal-fade" onClick={e => e.stopPropagation()} style={dropdownPopoverStyle}>
              <TimeOptionsList value={selectedTime} onChange={t => { setSelectedTime(t); setOpenField(null); }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Para kafelków wyboru ścieżki — używana na ekranie powitalnym (gdzie
// "warsztat" jest domyślnie wizualnie wyróżniony) i na górze kroku 1
// kreatora (gdzie brązowy = faktycznie wybrana w tej chwili ścieżka,
// co pozwala przełączyć się na drugą bez powrotu na stronę główną).
const DEFAULT_PATH_TILE_LABELS = {
  workshop:   { label:"Wybierz warsztat", sub:"Wiem, co chcemy robić" },
  restaurant: { label:"Wybierz restaurację/kawiarnię", sub:"Wiem, gdzie chcemy być" },
};

function PathTiles({ activeKey, onSelect, labels = DEFAULT_PATH_TILE_LABELS }) {
  const tile = key => {
    const active = activeKey === key;
    const { label, sub } = labels[key];
    return (
      <button key={key} onClick={() => onSelect(key)} style={{
        flex:1, textAlign:"center", display:"flex", flexDirection:"column", justifyContent:"center", minHeight:64,
        background: active ? C.selectedBg : C.card,
        border: `1.5px solid ${active ? C.primary : C.border}`,
        borderRadius:999, padding:"10px 26px", cursor:"pointer",
      }}>
        <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:15, fontWeight:500, lineHeight:1.25, marginBottom:3, color:C.primary }}>{label}</div>
        <div style={{ fontSize:11, color:C.muted }}>{sub}</div>
      </button>
    );
  };
  // Object.keys() zamiast dwóch zaszytych na sztywno kafelków — dzięki temu
  // ten sam komponent obsługuje też opcjonalny trzeci kafelek "Mam miejsce"
  // (patrz withOwnPlaceTile), bez zmiany wyglądu ani zachowania dla
  // dotychczasowych dwóch użyć (workshop/restaurant).
  return (
    <div className="home-cta-grid">
      {Object.keys(labels).map(tile)}
    </div>
  );
}

const KIDS_PATH_TILE_LABELS = {
  workshop:   { label:"Wybierz warsztat", sub:"Wiem, co chcemy robić" },
  restaurant: { label:"Wybierz miejsce", sub:"Wiem, gdzie chcemy być" },
};

// Trzeci, opcjonalny kafelek startowy — "Mam miejsce" (artysta dojeżdża do
// klienta, bez restauracji). Doklejany do PathTiles obok "workshop"/"restaurant"
// wszędzie tam, gdzie się one pojawiają (ekran główny, przełącznik w kroku 1),
// ale TYLKO gdy w arkuszu jest choć jeden artysta z travelsToClient=tak
// (wywołujący sam sprawdza to na przekazanej liście `workshops`). Osobny,
// widoczny od razu kafelek (a nie coś ukrytego w środku kreatora) — łatwiej
// go znaleźć niż poprzednią wersję zagnieżdżoną w kroku 2.
const OWN_PLACE_TILE = { label:"Mam miejsce, zaproście artystę", sub:"Przyjedziemy do Was" };
function withOwnPlaceTile(labels, workshops) {
  return workshops.some(w => w.travelsToClient === true) ? { ...labels, ownplace: OWN_PLACE_TILE } : labels;
}

// Sekcja "Kim jesteśmy" — wspólna dla ekranu klienta i widoku Współpraca.
function AboutUsSection() {
  return (
    <div style={{ maxWidth:760, margin:"0 auto", padding:"0 16px 48px", textAlign:"center" }}>
      <h2 style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:"clamp(26px,3.5vw,36px)", fontWeight:300, margin:"0 0 20px", color:C.text }}>
        Kim jesteśmy
      </h2>
      <p style={{ fontSize:14, color:C.text, lineHeight:1.75, margin:"0 auto 16px", maxWidth:600, fontWeight:300 }}>
        Kawiarnie i restauracje od zawsze były czymś więcej niż miejscem spożywania posiłków — to tam rodziły się rozmowy, pomysły i sztuka. Kawiarniani Artyści to nasz sposób, żeby to przywrócić: łączymy lokalne restauracje i kawiarnie z artystami prowadzącymi warsztaty artystyczne i nie tylko, tworząc nowy sposób spędzania czasu w gronie znajomych, rodziny czy współpracowników.
      </p>
      <p style={{ fontSize:14, color:C.text, lineHeight:1.75, margin:"0 auto 36px", maxWidth:600, fontWeight:300 }}>
        Prowadzi nas Joanna — z zawodu grafik komputerowy, z zamiłowania organizatorka kameralnych warsztatów malarskich. Wierzy, że najlepsze wspomnienia rodzą się tam, gdzie jest dobra kawa, jedzenie, dobre towarzystwo oraz odrobina wspólnej twórczości.
      </p>

      <div style={{ fontSize:13, color:C.text, lineHeight:2 }}>
        <div>E-mail: <a href="mailto:kawiarnianiartysci@gmail.com" style={{ color:C.primary }}>kawiarnianiartysci@gmail.com</a></div>
        <div>Instagram: <a href="https://www.instagram.com/kawiarniani_artysci/" target="_blank" rel="noreferrer" style={{ color:C.primary }}>@kawiarniani_artysci</a></div>
      </div>

      <img src={LOGO_IMG} alt={COPY.siteName} loading="lazy" style={{ width:75, height:75, objectFit:"contain", display:"block", margin:"28px auto 0" }} />
    </div>
  );
}

// Domyślne kroki (widok klienta — "Wam"/"osób"). Wersja dla zakładki
// "Eventy dla dzieci" (KIDS_HOW_IT_WORKS_STEPS) mówi o dziecku wprost.
const HOW_IT_WORKS_STEPS = [
  { n:"1", t:"Wybieracie warsztat i miejsce", d:"Malowanie, rękodzieło albo inna aktywność — w kawiarni lub restauracji, która Wam pasuje." },
  { n:"2", t:"Wysyłacie krótkie zapytanie", d:"Termin, liczba osób, kilka słów od Was." },
  { n:"3", t:"Dogrywamy szczegóły i potwierdzamy", d:"Kontaktujemy się z restauracją i artystą, ustalamy menu i finalną cenę, a potem potwierdzamy termin." },
];
const KIDS_HOW_IT_WORKS_STEPS = [
  { n:"1", t:"Wybieracie warsztat i miejsce", d:"Malowanie, rękodzieło albo inna kreatywna zabawa — w kawiarni, która lubi młodych gości." },
  { n:"2", t:"Wysyłacie krótkie zapytanie", d:"Termin, liczba dzieci, wiek, kilka słów od Was." },
  { n:"3", t:"Dogrywamy szczegóły i potwierdzamy", d:"Kontaktujemy się z miejscem i artystą, ustalamy menu i finalną cenę, potem potwierdzamy termin." },
];

// Krótki, NIEklikalny opis 3-krokowego procesu — wizualnie inny niż
// kafelki akcji (bez ramki-pigułki, bez cienia), żeby nie sugerować
// interakcji. Używany na HomeScreen (klient) i analogicznie na
// KidsHomeScreen (z tekstami dostosowanymi do kontekstu dziecięcego).
function HowItWorksSteps({ steps = HOW_IT_WORKS_STEPS }) {
  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"8px 16px 48px" }}>
      <h2 style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:"clamp(24px,3vw,30px)", fontWeight:300, textAlign:"center", margin:"0 0 28px", color:C.text }}>
        Jak to działa
      </h2>
      <div style={{ display:"grid", gap:20 }}>
        {steps.map(s => (
          <div key={s.n} style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:C.tagBg, color:C.primary, fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{s.n}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:15, marginBottom:4, color:C.text }}>{s.t}</div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Odmiana polska: 1 -> forma jednostkowa, 2-4 (poza 12-14) -> forma "kilka",
// pozostałe (5+ i 12-14) -> forma dopełniaczowa.
function pluralPL(n, [one, few, many]) {
  if (n === 1) return one;
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

// Pasek zaufania — liczby + logotypy partnerów. Wspólny dla HomeScreen (widok
// klienta) i KidsHomeScreen (analogicznie, ale przefiltrowany do partnerów
// dostępnych w opcji dla dzieci).
// Gdy loga mieszczą się w jednym rzędzie — statyczny, wyśrodkowany rząd.
// Gdy jest ich więcej, niż się mieści — zamiast zawijania na drugi wiersz
// (które zostawiało samotny "ogonek" logotypów pod spodem), rząd przewija
// się w nieskończoność w poziomie; lista jest zduplikowana, żeby pętla była
// płynna (translateX(-50%) trafia dokładnie w początek drugiej kopii).
const PARTNER_LOGOS_SCROLL_THRESHOLD = 6;

function PartnerLogosBar({ restaurants, workshops }) {
  const partnerLogos = [...restaurants, ...workshops].filter(x => x.logo);
  const scrolling = partnerLogos.length > PARTNER_LOGOS_SCROLL_THRESHOLD;
  const trackLogos = scrolling ? [...partnerLogos, ...partnerLogos] : partnerLogos;

  return (
    <div style={{ maxWidth:760, margin:"0 auto", padding:"0 16px 56px", textAlign:"center" }}>
      <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.08em", marginBottom:14 }}>
        {workshops.length} {pluralPL(workshops.length, ["warsztat","warsztaty","warsztatów"])} · {restaurants.length} {pluralPL(restaurants.length, ["miejsce","miejsca","miejsc"])} w Poznaniu
      </div>
      {partnerLogos.length > 0 && (
        scrolling ? (
          <div className="partner-logos-viewport">
            <div className="partner-logos-track" style={{ animationDuration:`${partnerLogos.length * 3}s` }}>
              {trackLogos.map((p, i) => (
                <img key={`${p.id}-${i}`} src={p.logo} alt={p.name} loading="lazy" style={{ height:40, objectFit:"contain", opacity:0.75, flexShrink:0 }} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", gap:18, justifyContent:"center", flexWrap:"wrap", alignItems:"center" }}>
            {partnerLogos.map(p => (
              <img key={p.id} src={p.logo} alt={p.name} loading="lazy" style={{ height:40, objectFit:"contain", opacity:0.75 }} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function HomeScreen({ restaurants, workshops, onStart, groupSize, setGroupSize, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) {
  const videoRef = useRef(null);
  const pathTilesRef = useRef(null);
  const activeRestaurants = restaurants.filter(r => !r.comingSoon);
  const activeWorkshops = workshops.filter(w => !w.comingSoon);

  const seekToStart = () => { if (videoRef.current) videoRef.current.currentTime = HERO_VIDEO_START; };
  const handleEnded = () => { seekToStart(); videoRef.current?.play(); };
  const scrollToPathTiles = () => pathTilesRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });

  return (
    <div>
      {/* 1. Hero — wideo + nazwa + podtytuł + CTA */}
      <div style={{ position:"relative", width:"100%", height:"clamp(340px, 46vw, 460px)", overflow:"hidden" }}>
        <video ref={videoRef} className="hero-video" autoPlay muted playsInline preload="auto" poster={HERO_PHOTO}
          onLoadedMetadata={seekToStart} onEnded={handleEnded}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 68%" }}>
          <source src="/videos/hero.mov" />
        </video>
        {/* delikatna faktura papieru/tektury */}
        <div style={{ position:"absolute", inset:0, opacity:0.12, mixBlendMode:"multiply", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {/* przejście: przezroczyste u góry → kolor tła strony u dołu (delikatniejsze) */}
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg, rgba(237,235,230,0) 0%, rgba(237,235,230,0.05) 50%, rgba(237,235,230,0.35) 70%, rgba(237,235,230,0.75) 85%, ${C.bg} 97%)` }} />
      </div>

      <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 16px 56px" }}>
        <div className="hero-copy-wrap" style={{ textAlign:"center", maxWidth:760, marginLeft:"auto", marginRight:"auto" }}>
          <h1 className="hero-title" style={{ fontFamily:"'Pan Pizza', cursive", fontSize:"clamp(48px,8.5vw,76px)", fontWeight:400, lineHeight:1.2, color:C.primary }}>
            {COPY.siteName}
          </h1>
          <p className="hero-subtitle" style={{ color:C.text, fontWeight:500, maxWidth:500, marginLeft:"auto", marginRight:"auto" }}>
            {COPY.heroSubtitle}
          </p>
          <button onClick={scrollToPathTiles} className="hero-cta-btn" style={{ background:C.primary, color:"#FFF", border:"none", borderRadius:999, padding:"11px 32px", fontSize:15, fontWeight:600, fontFamily:"'Montserrat', system-ui, sans-serif", cursor:"pointer" }}>
            Zobacz warsztaty
          </button>
        </div>

        {/* 2. Panel: liczba osób + data + godzina */}
        <HomeFilterBar
          groupSize={groupSize} setGroupSize={setGroupSize}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          selectedTime={selectedTime} setSelectedTime={setSelectedTime}
        />

        {/* 3. Dwa kafelki startowe */}
        <div ref={pathTilesRef} style={{ marginBottom:16, scrollMarginTop:20 }}>
          <PathTiles activeKey="workshop" onSelect={onStart} labels={withOwnPlaceTile(DEFAULT_PATH_TILE_LABELS, workshops)} />
        </div>
      </div>

      {/* 4. Jak to działa */}
      <HowItWorksSteps />

      {/* 5. Pasek zaufania */}
      <PartnerLogosBar restaurants={activeRestaurants} workshops={activeWorkshops} />

      {/* 6. Kim jesteśmy */}
      <AboutUsSection />
    </div>
  );
}

function KidsHomeScreen({ restaurants, workshops, onStart, kidsCount, setKidsCount, adultsCount, setAdultsCount, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) {
  const kidsRestaurants = restaurants.filter(r => !r.comingSoon && r.acceptsKids && r.kidsVariants && r.kidsVariants.length > 0);
  const kidsWorkshops = workshops.filter(w => !w.comingSoon && w.forKids);

  return (
    <div>
      {/* Baner nad tytułem — analogicznie do HERO_PHOTO/hero.mov w HomeScreen,
          tylko że tu zdjęcie zamiast wideo (na razie brak nagrania z warsztatów dziecięcych). */}
      <div style={{ position:"relative", width:"100%", height:"clamp(260px, 42vw, 440px)", overflow:"hidden", background:C.selectedBg }}>
        <img src={HERO_PHOTO_DZIECI} alt="Warsztat malarski dla dzieci" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 68%", display:"block" }} />
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg, rgba(247,238,221,0) 0%, rgba(247,238,221,0.05) 50%, rgba(247,238,221,0.35) 70%, rgba(247,238,221,0.75) 85%, ${C.bg} 97%)` }} />
      </div>

      <div style={{ maxWidth:1160, margin:"0 auto", padding:"32px 16px 24px" }}>
        <div style={{ textAlign:"center" }}>
          <h1 style={{ fontFamily:"'Pan Pizza', cursive", fontSize:"clamp(40px,7vw,64px)", fontWeight:400, lineHeight:1.2, color:C.primary, margin:"0 0 14px" }}>
            Mali Kawiarniani Artyści
          </h1>
          <p style={{ color:C.text, fontWeight:500, maxWidth:480, margin:"0 auto 28px", fontSize:15, lineHeight:1.6 }}>
            Gotowe pakiety urodzinowe — warsztat i miejsce w jednym, cena liczona za dziecko.
          </p>
        </div>

        <KidsFilterBar
          kidsCount={kidsCount} setKidsCount={setKidsCount}
          adultsCount={adultsCount} setAdultsCount={setAdultsCount}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          selectedTime={selectedTime} setSelectedTime={setSelectedTime}
        />

        <div style={{ marginBottom:16 }}>
          <PathTiles activeKey="workshop" onSelect={onStart} labels={withOwnPlaceTile(KIDS_PATH_TILE_LABELS, workshops.filter(w => w.forKids))} />
        </div>
      </div>

      <HowItWorksSteps steps={KIDS_HOW_IT_WORKS_STEPS} />

      <PartnerLogosBar restaurants={kidsRestaurants} workshops={kidsWorkshops} />
    </div>
  );
}

// ══ Pasek postępu kreatora ═══════════════════════════════════

function WizardProgressBar({ step, path, onStepClick }) {
  const labels = path === "restaurant"
    ? ["Miejsce", "Warsztat", "Podsumowanie"]
    : path === "ownplace"
      ? ["Warsztat", "Twoje miejsce", "Podsumowanie"]
      : ["Warsztat", "Miejsce", "Podsumowanie"];
  return (
    <div style={{ display:"flex", alignItems:"flex-start", maxWidth:1160, margin:"0 auto", padding:"18px 16px 0" }}>
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        const clickable = done && !!onStepClick;
        return (
          <div key={l} style={{ display:"flex", alignItems:"center", flex: n < labels.length ? 1 : "0 0 auto" }}>
            <div
              onClick={clickable ? () => onStepClick(n) : undefined}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:0, padding:"6px 8px", borderRadius:10, cursor: clickable ? "pointer" : "default" }}
            >
              <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, background: active || done ? C.primary : C.tagBg, color: active || done ? "#FFF" : C.muted }}>
                {done ? "✓" : n}
              </div>
              <span className="wizard-progress-label" style={{ fontSize:9, color: active ? C.primary : C.muted, fontWeight: active ? 600 : 400, whiteSpace:"nowrap", textAlign:"center" }}>{l}</span>
            </div>
            {n < labels.length && <div style={{ flex:1, height:2, background: done ? C.primary : C.border, margin:"0 6px", marginTop:12 }} />}
          </div>
        );
      })}
    </div>
  );
}

// ══ Krok 1 / krok 2 — wybór warsztatu lub restauracji ═══════

function PickStep({ kind, items, selectedId, selectedVariantId, onToggle, onVariantSelect, onProfile, onFallback, onBackToStep1, notice, kidsMode = false }) {
  const isRestaurant = kind === "restaurant";
  const empty = items.length === 0;
  return (
    <div style={{ maxWidth:1160, margin:"0 auto", padding:"20px 16px 20px" }}>
      {!empty && notice && (Array.isArray(notice) ? notice.length > 0 : true) && (
        <div style={{ fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
          {Array.isArray(notice) ? notice.map((n, i) => <div key={i}>{n}</div>) : notice}
        </div>
      )}
      {empty ? (
        <div style={{ textAlign:"center", padding:"40px 20px", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:14, color:C.muted, lineHeight:1.6, maxWidth:420, margin:"0 auto 20px" }}>
            {isRestaurant
              ? "Ten warsztat nie odbywa się jeszcze w żadnym z dostępnych miejsc. Zmień wybór albo napisz do nas — poszukamy lokalu."
              : "Żaden dostępny warsztat nie pasuje jeszcze do tego miejsca. Zmień wybór albo napisz do nas — poszukamy artysty."}
          </p>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={onBackToStep1} style={{ padding:"12px 22px", borderRadius:9, border:`1px solid ${C.border}`, background:"#FFF", color:C.text, fontSize:13, fontWeight:600, cursor:"pointer", minHeight:44 }}>Zmień wybór</button>
            <button onClick={onFallback} style={{ padding:"12px 22px", borderRadius:9, border:"none", background:C.primary, color:"#FFF", fontSize:13, fontWeight:600, cursor:"pointer", minHeight:44 }}>Napisz do nas</button>
          </div>
        </div>
      ) : (
        <div className="wizard-list">
          {items.map(item => (
            isRestaurant ? (
              <RestaurantCard key={item.id} r={item}
                isSelected={selectedId === item.id}
                selectedVariantId={selectedId === item.id ? selectedVariantId : null}
                onToggle={() => onToggle(item.id)}
                onVariantSelect={onVariantSelect}
                onProfile={() => onProfile(item)}
                kidsMode={kidsMode} />
            ) : (
              <WorkshopCard key={item.id} w={item}
                isSelected={selectedId === item.id}
                onToggle={() => onToggle(item.id)}
                onProfile={() => onProfile(item)}
                kidsMode={kidsMode} />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ══ Krok 2 (wariant "Mam miejsce") — wywiad o miejscu klienta ═
// Zastępuje listę restauracji, gdy wybrany artysta dojeżdża do klienta
// (travelsToClient=tak) i klient przełączył się na "Mam miejsce". Stan
// (`value`/`onChange`) jest podniesiony do App(), więc powrót na ten krok
// (np. przez "zmień" w kroku 3) pokazuje wcześniej wpisane dane, tak samo
// jak data/godzina na ekranie głównym.
const PLACE_TYPE_OPTIONS = [
  { id:"dom", label:"Dom" },
  { id:"mieszkanie", label:"Mieszkanie w bloku" },
  { id:"ogrod", label:"Ogród" },
  { id:"sala", label:"Sala" },
  { id:"inne", label:"Inne" },
];

function YesNoToggle({ value, onChange }) {
  const opt = (v, l) => (
    <button type="button" onClick={() => onChange(v)} style={{
      flex:1, padding:"10px 14px", borderRadius:8, cursor:"pointer",
      border:`1.5px solid ${value === v ? C.primary : C.border}`,
      background: value === v ? C.selectedBg : "#FAFAF8",
      color: value === v ? C.primary : C.text, fontSize:13, fontWeight: value === v ? 600 : 500,
    }}>{l}</button>
  );
  return <div style={{ display:"flex", gap:8 }}>{opt("tak","Tak")}{opt("nie","Nie")}</div>;
}

function PlaceInterviewForm({ value, onChange, travelArea, kidsMode = false }) {
  const inp = { width:"100%", padding:"11px 13px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, color:C.text, background:"#FAFAF8", minHeight:44, fontFamily:"'Montserrat', system-ui, sans-serif" };
  const lbl = { display:"block", fontSize:11, fontWeight:600, color:C.muted, marginBottom:5, letterSpacing:"0.08em" };
  const set = k => v => onChange({ ...value, [k]: v });
  // Wpisywane w arkuszu jako sama liczba (np. "50", czasem zakres "100-120") —
  // dopisujemy skrót "km", chyba że ktoś już go wpisał ręcznie.
  const travelAreaDisplay = travelArea && !/km/i.test(travelArea) ? `${travelArea} km` : travelArea;

  return (
    <div style={{ maxWidth:480, margin:"0 auto", padding:"20px 16px 20px" }}>
      {travelArea && (
        <div style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:18, lineHeight:1.5, background:C.selectedBg, border:`1px solid ${C.primary}`, borderRadius:10, padding:"12px 16px" }}>
          Artysta dojeżdża w promieniu do {travelAreaDisplay}.
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Adres / lokalizacja eventu *</label>
        <input type="text" placeholder="ul. Przykładowa 12, Poznań" value={value.address} onChange={e => set("address")(e.target.value)} style={inp} />
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Typ miejsca</label>
        <select value={value.placeType} onChange={e => set("placeType")(e.target.value)} style={inp}>
          <option value="">Wybierz...</option>
          {PLACE_TYPE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Osobna sala / wydzielona przestrzeń?</label>
        <YesNoToggle value={value.hasSeparateRoom} onChange={set("hasSeparateRoom")} />
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Metraż / ile mniej więcej miejsca</label>
        <input type="text" placeholder="np. ok. 25 m²" value={value.area} onChange={e => set("area")(e.target.value)} style={inp} />
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Dostępne stoły i krzesła?</label>
        <YesNoToggle value={value.hasTables} onChange={set("hasTables")} />
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Dostęp do wody?</label>
        <YesNoToggle value={value.hasWater} onChange={set("hasWater")} />
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Dostęp do prądu?</label>
        <YesNoToggle value={value.hasPower} onChange={set("hasPower")} />
      </div>

      <div style={{ marginBottom:4 }}>
        <label style={lbl}>Uwagi dodatkowe</label>
        <textarea rows={3} placeholder="Piętro, parking, winda, cokolwiek warto wiedzieć przed przyjazdem..." value={value.notes} onChange={e => set("notes")(e.target.value)} style={{ ...inp, resize:"vertical", minHeight:70 }} />
      </div>
    </div>
  );
}

// ══ Krok 3 — podsumowanie i formularz kontaktowy ═════════════

function Step4ContactForm({ restaurant, variant, workshop, groupSize, selectedDate, onDateChange, selectedTime, onTimeChange, ppp, total, workshopOnlyTotal, onEditStep, onSubmitted, kidsMode = false, kidsCount, adultsCount, ownPlace = false, placeInfo }) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", message:"" });
  const [consent, setConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [editingTermin, setEditingTermin] = useState(false);
  const [terminOpenField, setTerminOpenField] = useState(null); // "date" | "time" | null — który z własnych popoverów jest otwarty
  const set = k => e => setForm({ ...form, [k]: e.target.value });
  const inp = { width:"100%", padding:"11px 13px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, color:C.text, background:"#FAFAF8", minHeight:44 };
  const lbl = { display:"block", fontSize:11, fontWeight:600, color:C.muted, marginBottom:5, letterSpacing:"0.08em" };
  const errStyle = { color:"#C0392B", fontSize:11, marginTop:5 };

  const send = () => {
    const nextErrors = {};
    if (!form.name) nextErrors.name = "Podaj imię i nazwisko.";
    if (!form.email) nextErrors.email = "Podaj adres email.";
    if (!consent) nextErrors.consent = "Zaznacz zgodę na przetwarzanie danych osobowych.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSending(true); setError("");
    fetch("/api/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: form.name,
        clientEmail: form.email,
        clientPhone: form.phone,
        restaurantName: restaurant?.name || "",
        restaurantEmail: restaurant?.email || "",
        artistName: workshop?.artist || "",
        workshopName: workshop?.name || "",
        artistEmail: workshop?.email || "",
        artistInvoicing: workshop?.invoicing || "",
        artistRequirements: workshop?.requirements || "",
        groupSize: kidsMode ? kidsCount : groupSize,
        date: selectedTime ? `${selectedDate}, ${selectedTime}` : selectedDate,
        message: form.message,
        isKidsEvent: kidsMode || undefined,
        kidsCount: kidsMode ? kidsCount : undefined,
        adultsCount: kidsMode ? adultsCount : undefined,
        kidsPackageName: kidsMode ? (variant?.label || "") : undefined,
        kidsAmountLabel: kidsMode ? (total > 0
          ? `${total.toLocaleString("pl-PL")} zł`
          : workshopOnlyTotal > 0
            ? `${workshopOnlyTotal.toLocaleString("pl-PL")} zł za warsztat, cena restauracji do ustalenia`
            : "do ustalenia") : undefined,
        // Ścieżka "Mam miejsce" (artysta dojeżdża do klienta, bez restauracji) —
        // pola z wywiadu o miejscu, w całości trafiają do maila artysty.
        isOwnPlace: ownPlace || undefined,
        placeAddress: ownPlace ? (placeInfo?.address || "") : undefined,
        placeType: ownPlace ? (placeInfo?.placeType || "") : undefined,
        placeHasSeparateRoom: ownPlace ? (placeInfo?.hasSeparateRoom || "") : undefined,
        placeArea: ownPlace ? (placeInfo?.area || "") : undefined,
        placeHasTables: ownPlace ? (placeInfo?.hasTables || "") : undefined,
        placeHasWater: ownPlace ? (placeInfo?.hasWater || "") : undefined,
        placeHasPower: ownPlace ? (placeInfo?.hasPower || "") : undefined,
        placeNotes: ownPlace ? (placeInfo?.notes || "") : undefined,
      }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => { setSending(false); onSubmitted(); })
      .catch(() => { setSending(false); setError("Nie udało się wysłać zapytania. Spróbuj ponownie."); });
  };

  const summaryRowsTop = [
    { label:"Warsztat", value: workshop ? `${workshop.name} (${workshop.artist})` : "—", step:1 },
    { label:"Miejsce", value: ownPlace
      ? `${placeInfo?.address || "Wasz adres"} (dojazd artysty)`
      : (restaurant ? `${restaurant.name}${variant ? " · " + variant.label : ""}` : "—"), step:2 },
  ];
  const summaryRowsBottom = kidsMode ? [
    { label:"Liczba dzieci", value: kidsCount != null ? `${kidsCount}` : "—" },
    { label:"Liczba dorosłych", value: adultsCount != null ? `${adultsCount}` : "—" },
    // Gdy restauracja poda swoją cenę (normalne sumowanie) — jedna łączna
    // kwota, jak dotychczas. Dopóki jej nie znamy — cena warsztatu i
    // restauracji pokazują się osobno, żeby nie znikała cała kwota.
    ...(total > 0
      ? [{ label:"Kwota", value:`${total.toLocaleString("pl-PL")} zł` }]
      : [
          { label:"Cena za warsztat", value: workshopOnlyTotal > 0 ? `${workshopOnlyTotal.toLocaleString("pl-PL")} zł` : "—" },
          { label:"Cena za restaurację", value:"Zostanie ustalona indywidualnie z restauracją" },
        ]),
  ] : [
    { label:"Liczba osób", value: `${groupSize} osób` },
    { label:"Kwota", value: total > 0 ? `${total.toLocaleString("pl-PL")} zł` : "—" },
  ];
  const terminValue = selectedDate
    ? `${new Date(selectedDate).toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"})}${selectedTime ? ", " + selectedTime : ""}`
    : "do ustalenia";
  const rowStyle = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${C.border}` };
  const zmienBtnStyle = { background:"none", border:"none", color:C.primary, fontSize:11, textDecoration:"underline", cursor:"pointer", padding:"10px 0", minHeight:44, flexShrink:0 };

  return (
    <div style={{ maxWidth:480, margin:"0 auto", padding:"24px 16px 60px" }}>
      <h2 style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:24, fontWeight:400, margin:"0 0 18px", textAlign:"center", color:C.text }}>
        Wyślij zapytanie o rezerwację
      </h2>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"6px 20px", marginBottom:20 }}>
        {summaryRowsTop.map(row => (
          <div key={row.label} style={rowStyle}>
            <div>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.08em" }}>{row.label.toUpperCase()}</div>
              <div style={{ fontSize:13, color:C.text }}>{row.value}</div>
            </div>
            {onEditStep && row.step && (
              <button onClick={() => onEditStep(row.step)} style={zmienBtnStyle}>zmień</button>
            )}
          </div>
        ))}

        <div style={editingTermin ? { ...rowStyle, alignItems:"flex-start" } : rowStyle}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.08em" }}>TERMIN</div>
              {editingTermin && (
                <button onClick={() => { setEditingTermin(false); setTerminOpenField(null); }} style={zmienBtnStyle}>gotowe</button>
              )}
            </div>
            {editingTermin ? (
              <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                <div style={{ position:"relative" }}>
                  <button onClick={() => setTerminOpenField(f => f === "date" ? null : "date")}
                    style={{ border:`1px solid ${C.border}`, borderRadius:8, background:"#FAFAF8", fontSize:13, color:C.text, fontFamily:"'Montserrat', system-ui, sans-serif", padding:"7px 9px", minHeight:38, textAlign:"left", cursor:"pointer" }}>
                    {selectedDate ? formatDateShort(selectedDate) : "Data"}
                  </button>
                  {terminOpenField === "date" && (
                    <div className="modal-fade" onClick={e => e.stopPropagation()} style={dropdownPopoverStyle}>
                      <MiniCalendar value={selectedDate} min={MIN_BOOKING_DATE} onChange={d => { onDateChange(d); setTerminOpenField(null); }} />
                    </div>
                  )}
                </div>
                <div style={{ position:"relative" }}>
                  <button onClick={() => setTerminOpenField(f => f === "time" ? null : "time")}
                    style={{ border:`1px solid ${C.border}`, borderRadius:8, background:"#FAFAF8", fontSize:13, color:C.text, fontFamily:"'Montserrat', system-ui, sans-serif", padding:"7px 9px", minHeight:38, textAlign:"left", cursor:"pointer" }}>
                    {selectedTime || "Godzina"}
                  </button>
                  {terminOpenField === "time" && (
                    <div className="modal-fade" onClick={e => e.stopPropagation()} style={dropdownPopoverStyle}>
                      <TimeOptionsList value={selectedTime} onChange={t => { onTimeChange(t); setTerminOpenField(null); }} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize:13, color:C.text }}>{terminValue}</div>
            )}
          </div>
          {!editingTermin && (
            <button onClick={() => setEditingTermin(true)} style={zmienBtnStyle}>zmień</button>
          )}
        </div>

        {summaryRowsBottom.map((row, i) => (
          <div key={row.label} style={i === summaryRowsBottom.length - 1 ? { ...rowStyle, borderBottom:"none" } : rowStyle}>
            <div>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.08em" }}>{row.label.toUpperCase()}</div>
              <div style={{ fontSize:13, color:C.text }}>{row.value}</div>
            </div>
          </div>
        ))}

        <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, padding:"0 0 12px" }}>
          {/* Ścieżka "Mam miejsce": bez restauracji nie ma menu ani tortu do
              ustalenia, a cena warsztatu jest stała — inna, krótsza notka. */}
          {ownPlace && "Cena jest stała — to koszt samego warsztatu, bez opłaty za dojazd."}
          {/* Gdy cena restauracji jeszcze nieznana, wiersze "Cena za warsztat" /
              "Cena za restaurację" powyżej już to tłumaczą — bez dodatkowej notki. */}
          {!ownPlace && !(kidsMode && total <= 0) && "Kwota orientacyjna. Ostateczną cenę potwierdza restauracja przy ustalaniu menu."}
          {!ownPlace && !(kidsMode && total <= 0) && kidsMode && <br />}
          {!ownPlace && kidsMode && "* Tort ustalacie indywidualnie z restauracją."}
        </div>
      </div>

      {[
        { k:"name",  l:"Imię i nazwisko *", t:"text",  p:"Anna Kowalska" },
        { k:"email", l:"Email *",           t:"email", p:"anna@email.com" },
        { k:"phone", l:"Telefon",           t:"tel",   p:"+48 500 000 000" },
      ].map(f => (
        <div key={f.k} style={{ marginBottom:14 }}>
          <label style={lbl}>{f.l}</label>
          <input type={f.t} placeholder={f.p} value={form[f.k]} onChange={set(f.k)} style={inp} />
          {errors[f.k] && <div style={errStyle}>{errors[f.k]}</div>}
        </div>
      ))}
      <div style={{ marginBottom:18 }}>
        <label style={lbl}>Dodatkowe uwagi</label>
        <textarea rows={3} placeholder="Okazja, szczególne wymagania, pytania..." value={form.message} onChange={set("message")} style={{ ...inp, resize:"vertical", minHeight:70 }} />
      </div>
      <label style={{ display:"flex", gap:9, alignItems:"flex-start", fontSize:11, color:C.muted, lineHeight:1.5, marginBottom:6, cursor:"pointer" }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop:2, flexShrink:0, width:18, height:18 }} />
        <span>Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zapytania. Więcej informacji w{" "}
          <button type="button" onClick={e => { e.preventDefault(); setShowPrivacy(true); }} style={{ background:"none", border:"none", padding:0, color:C.primary, textDecoration:"underline", cursor:"pointer", fontSize:11 }}>
            Polityce prywatności
          </button>.
        </span>
      </label>
      {errors.consent && <div style={{ ...errStyle, marginBottom:12 }}>{errors.consent}</div>}
      {error && <p style={{ color:"#C0392B", fontSize:12, marginBottom:12 }}>{error}</p>}
      <button onClick={send} disabled={sending} style={{ width:"100%", background:C.primary, color:"#FFF", border:"none", borderRadius:999, padding:16, fontSize:15, fontWeight:600, cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1, minHeight:52 }}>
        {sending ? "Wysyłanie..." : "Wyślij zapytanie"}
      </button>
      <p style={{ fontSize:11, color:"#B8B4AE", textAlign:"center", marginTop:12, marginBottom:0 }}>Odpowiadamy w ciągu 24 godz.</p>

      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

// ══ Ekran potwierdzenia ══════════════════════════════════════

function ConfirmationScreen({ onBackToHome }) {
  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"80px 16px", textAlign:"center" }}>
      <div style={{ width:64, height:64, borderRadius:"50%", background:C.primary, color:"#FFF", fontSize:30, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>✓</div>
      <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:28, fontWeight:400, marginBottom:12, color:C.text }}>Zapytanie wysłane!</div>
      <p style={{ color:C.muted, fontSize:14, lineHeight:1.65, margin:"0 0 28px" }}>Odpiszemy w ciągu 24 godzin.</p>
      <button onClick={onBackToHome} style={{ background:C.primary, color:"#FFF", border:"none", borderRadius:9, padding:"14px 28px", fontSize:14, fontWeight:600, cursor:"pointer", minHeight:44 }}>
        Wróć na stronę główną
      </button>
    </div>
  );
}

// ══ Stały dolny pasek kreatora ═══════════════════════════════

function WizardStickyBar({ restaurant, workshop, groupSize, ppp, total, canAdvance, nextLabel, onNext, onBack, priceUnavailableLabel, workshopOnlyPpp, workshopOnlyTotal }) {
  // Gdy nie znamy jeszcze pełnej ceny (restauracja niewybrana albo jej
  // pakiet jest "ustalany indywidualnie"), ale znamy cenę warsztatu —
  // pokazujemy tę cząstkową cenę zamiast samej nazwy. Gdy restauracja poda
  // swoją cenę, total > 0 i wraca normalne sumowanie obu cen.
  const showWorkshopOnly = !(total > 0) && workshopOnlyTotal > 0;
  const summary = priceUnavailableLabel || (restaurant || workshop
    ? [restaurant?.name, workshop?.name].filter(Boolean).join(" + ")
    : "");
  const navBtn = { WebkitAppearance:"none", appearance:"none", border:"none", borderRadius:999, fontWeight:600, minHeight:44, width:104, padding:"8px 10px", fontSize:13, lineHeight:1.25, textAlign:"center" };
  return (
    <div style={{ maxWidth:1160, margin:"0 auto 20px", padding:"0 16px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", alignItems:"center", gap:10, background:C.tagBg, borderRadius:999, padding:6 }}>
        <button onClick={onBack} style={{ ...navBtn, background:"transparent", border:`1.5px solid ${C.primary}`, color:C.primary, cursor:"pointer" }}>Wstecz</button>
        <div style={{ textAlign:"center", minWidth:0, overflow:"hidden" }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:18, color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {total > 0 ? `${total.toLocaleString("pl-PL")} zł` : showWorkshopOnly ? `${workshopOnlyTotal.toLocaleString("pl-PL")} zł` : summary}
          </div>
          {total > 0 && <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{groupSize} × {ppp} zł</div>}
          {showWorkshopOnly && <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>cena za warsztat · {groupSize} × {workshopOnlyPpp} zł</div>}
        </div>
        <button onClick={onNext} disabled={!canAdvance} style={{ ...navBtn, background: canAdvance ? C.primary : "#DDD9D2", color: canAdvance ? "#FFF" : "#9A968D", cursor: canAdvance ? "pointer" : "default" }}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

// ══ Główna aplikacja ════════════════════════════════════════

const ARTIST_FORM_URL     = "https://docs.google.com/forms/d/e/1FAIpQLSf1rSqcKIau2nNEU03Gc62pn5sT6wO35MbF6l4w5icxMdAmug/viewform?usp=header";
const RESTAURANT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSexblazM7leUObytgMAh3Ek8mQBdMnYYFunpI4peNGMUhVmVg/viewform?usp=header";

// Widok "Współpraca" — informacje o procesie + linki do formularzy zgłoszeniowych
function PartnersView({ openTermsOnMount }) {
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (openTermsOnMount) setShowTerms(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = [
    { n:"1", t:"Klient wybiera lokal i artystę", d:"Na stronie klient wybiera restaurację/kawiarnię oraz warsztat, który chce zorganizować u siebie." },
    { n:"2", t:"Artysta akceptuje termin", d:"Artysta dostaje zapytanie z proponowaną datą i liczbą osób — potwierdza je lub proponuje zmianę." },
    { n:"3", t:"Restauracja czeka na potwierdzenie", d:"Lokal od razu widzi zapytanie klienta i czeka na akceptację ze strony artysty, zanim event zostanie ostatecznie ustalony." },
  ];

  return (
    <>
    <div style={{ maxWidth:760, margin:"0 auto", padding:"56px 16px 48px" }}>
      <div style={{ textAlign:"center", marginBottom:44 }}>
        <h1 style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:300, margin:"0 0 14px", lineHeight:1.15 }}>
          Współpraca dla artystów i restauracji
        </h1>
        <p style={{ fontSize:15, color:C.muted, fontWeight:300, margin:"0 auto", maxWidth:560, lineHeight:1.7 }}>
          Kawiarniani Artyści łączy lokale gastronomiczne z artystami prowadzącymi warsztaty. Tak wygląda cały proces:
        </p>
      </div>

      <div style={{ display:"grid", gap:14, marginBottom:48 }}>
        {steps.map(s => (
          <div key={s.n} style={{ display:"flex", gap:16, alignItems:"flex-start", background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:C.tagBg, color:C.primary, fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{s.n}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14, marginBottom:4, color:C.text }}>{s.t}</div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ maxWidth:760, margin:"0 auto", padding:"0 16px 48px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px,1fr))", gap:16 }}>
        <div style={{ textAlign:"center", padding:"30px 24px", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, fontWeight:400, marginBottom:8 }}>Jestem artystą / prowadzę warsztaty</div>
          <p style={{ fontSize:13, color:C.muted, margin:"0 0 16px", lineHeight:1.6 }}>Dołącz jako partner i przyjmuj zapytania na warsztaty w lokalach naszych partnerów.</p>
          <a href={ARTIST_FORM_URL} target="_blank" rel="noreferrer" style={{ display:"inline-block", background:C.primary, color:"#FFF", textDecoration:"none", borderRadius:9, padding:"12px 24px", fontSize:14, fontWeight:600 }}>Formularz zgłoszeniowy</a>
        </div>
        <div style={{ textAlign:"center", padding:"30px 24px", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, fontWeight:400, marginBottom:8 }}>Prowadzę restaurację / kawiarnię</div>
          <p style={{ fontSize:13, color:C.muted, margin:"0 0 16px", lineHeight:1.6 }}>Zgłoś swój lokal i dotrzyj do klientów szukających wyjątkowych eventów grupowych.</p>
          <a href={RESTAURANT_FORM_URL} target="_blank" rel="noreferrer" style={{ display:"inline-block", background:C.primary, color:"#FFF", textDecoration:"none", borderRadius:9, padding:"12px 24px", fontSize:14, fontWeight:600 }}>Formularz zgłoszeniowy</a>
        </div>
      </div>
      <div style={{ textAlign:"center", marginTop:20 }}>
        <button onClick={() => setShowTerms(true)} style={{ background:"none", border:"none", color:C.muted, textDecoration:"underline", cursor:"pointer", fontSize:12, padding:0 }}>
          Regulamin dla Partnerów
        </button>
      </div>
    </div>

    <AboutUsSection />

    <Footer />
    {showTerms && <PartnerTermsModal onClose={() => setShowTerms(false)} />}
    </>
  );
}

export default function App() {
  const { restaurants, workshops, dataLoading, dataError } = useSheetData();
  // Pozwala na bezpośredni link do regulaminu Partnerów (np. wklejony w
  // Google Formsie), np. https://www.kawiarnianiartysci.pl/?regulamin=partnerzy
  // — otwiera od razu widok Współpraca z rozwiniętym regulaminem.
  const openPartnerTermsOnLoad = new URLSearchParams(window.location.search).get("regulamin") === "partnerzy";
  const [mode,            setMode]            = useState(openPartnerTermsOnLoad ? "b2b" : "client"); // "client" | "b2b" | "kids"
  const [path,            setPath]            = useState(null);     // null | "workshop" | "restaurant" | "ownplace" — null = ekran powitalny
  const [wizardStep,      setWizardStep]      = useState(1);         // 1..3
  const [submitted,       setSubmitted]       = useState(false);
  const [selectedR,       setSelectedR]       = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedW,       setSelectedW]       = useState(null);
  const [groupSize,       setGroupSize]       = useState(null);
  const [kidsCount,       setKidsCount]       = useState(null);      // tryb "kids" — liczba dzieci, liczy się do ceny
  const [adultsCount,     setAdultsCount]     = useState(null);      // tryb "kids" — wyłącznie informacyjne
  // "Mam miejsce" to trzeci top-level path (obok "workshop"/"restaurant"),
  // nie osobny toggle — patrz const path poniżej ("workshop"|"restaurant"|"ownplace").
  const [placeInfo,       setPlaceInfo]       = useState({ address:"", placeType:"", hasSeparateRoom:"", area:"", hasTables:"", hasWater:"", hasPower:"", notes:"" });
  const [profileItem,     setProfileItem]     = useState(null);
  const [selectedDate,    setSelectedDate]    = useState("");
  const [selectedTime,    setSelectedTime]    = useState("");

  // ══ Google Analytics 4 ══════════════════════════════════════
  useEffect(() => {
    const measurementId = "G-KCXWSP03Y1";
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", measurementId);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet"; document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = globalCSS; document.head.appendChild(style);
  }, []);

  // Podpięcie pod historię przeglądarki — strzałka "wstecz" (na komputerze
  // i telefonie) ma cofać o krok WEWNĄTRZ aplikacji, a nie wychodzić z niej.
  // Każde przejście "do przodu" (wybór ścieżki, kolejny krok kreatora, tryb
  // Współpraca, wysłanie zapytania) dopisuje wpis do historii; przycisk
  // wstecz przegląda przez te wpisy zamiast opuszczać stronę od razu.
  const isPoppingRef = useRef(false);
  useEffect(() => {
    const onPopState = e => {
      isPoppingRef.current = true;
      const s = e.state;
      if (s) {
        setMode(s.mode); setPath(s.path); setWizardStep(s.wizardStep); setSubmitted(s.submitted);
        if (s.profileItem) {
          const list = s.profileItem.type === "restaurant" ? restaurants : workshops;
          const found = list.find(x => x.id === s.profileItem.itemId);
          setProfileItem(found ? { item: found, type: s.profileItem.type } : null);
        } else {
          setProfileItem(null);
        }
      } else {
        setMode(m => (m === "kids" ? "kids" : "client")); setPath(null); setWizardStep(1); setSubmitted(false); setProfileItem(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [restaurants, workshops]);

  useEffect(() => {
    if (isPoppingRef.current) { isPoppingRef.current = false; return; }
    const atRoot = (mode === "client" || mode === "kids") && path === null && wizardStep === 1 && !submitted && !profileItem;
    if (atRoot) return;
    const profileState = profileItem ? { itemId: profileItem.item.id, type: profileItem.type } : null;
    window.history.pushState({ mode, path, wizardStep, submitted, profileItem: profileState }, "");
  }, [mode, path, wizardStep, submitted, profileItem]);

  // Każda zmiana ścieżki/kroku przewija na górę strony — bez tego np.
  // kliknięcie kafelka na dole ekranu powitalnego zostawiało gościa
  // w tym samym miejscu przewinięcia, w środku nowej strony.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path, wizardStep]);

  // Przełącznik ścieżki dostępny też na górze kroku 1 (nie tylko na
  // stronie głównej) — pozwala zmienić zdanie, co wybieramy najpierw,
  // bez powrotu do ekranu powitalnego. "Path" ustala tylko kolejność
  // kroków 1/2 — nie czyścimy już wcześniejszych wyborów (workshop/
  // restauracja), żeby np. wybrany wcześniej warsztat nie znikał, gdy
  // klient przełączy się na przeglądanie restauracji.
  const switchPath = p => {
    if (p === path) return;
    setPath(p); setWizardStep(1);
  };

  const handleToggleR = rId => {
    if (selectedR === rId) { setSelectedR(null); setSelectedVariant(null); return; }
    setSelectedR(rId);
    const r = restaurants.find(r => r.id === rId);
    const firstVariant = mode === "kids" ? r?.kidsVariants?.[0] : r?.variants?.[0];
    setSelectedVariant(firstVariant?.id ?? null);
  };

  const resetToHome = () => {
    setPath(null); setWizardStep(1); setSubmitted(false);
    setSelectedR(null); setSelectedVariant(null); setSelectedW(null);
    setGroupSize(null); setSelectedDate(""); setSelectedTime("");
    setKidsCount(null); setAdultsCount(null);
    setPlaceInfo({ address:"", placeType:"", hasSeparateRoom:"", area:"", hasTables:"", hasWater:"", hasPower:"", notes:"" });
  };

  // Przełącznik trybu kreatora (client/kids) w nagłówku — porównanie z samym
  // `mode` przy kliknięciu myli się, gdy klient wpadł "po drodze" do widoku
  // Współpraca (mode === "b2b"): resetujemy tylko, gdy FAKTYCZNIE zmienia się
  // tryb kreatora, śledzony niezależnie od przejściowych wizyt w b2b.
  const lastWizardModeRef = useRef(mode === "kids" ? "kids" : "client");
  const goWizardMode = m => {
    if (lastWizardModeRef.current !== m) resetToHome();
    lastWizardModeRef.current = m;
    setMode(m);
  };

  const workshop   = workshops.find(w => w.id === selectedW);
  const restaurant = restaurants.find(r => r.id === selectedR);

  // Zgodność niezależna od jeszcze niewybranej liczby osób — sprawdza czy
  // zakresy min/max obu stron w ogóle się przecinają (a nie czy pasują do
  // aktualnej wartości groupSize, która na tym etapie może się jeszcze zmienić).
  const isCompatible = (w, r) => {
    if (!w || !r) return true;
    if (w.requiresSeparateRoom && !r.hasSeparateRoom) return false;
    if (r.requiresInvoice && w.canInvoice === false) return false;
    // Warsztat musi zmieścić się w godzinach otwarcia lokalu W TEN KONKRETNY
    // dzień tygodnia (różne dni = różne godziny, część dni bywa zamknięta
    // całkowicie). Czas trwania liczony jako górna granica, gdy podany jest
    // zakres np. "2-3 godz". Filtrujemy tylko gdy mamy komplet danych: datę,
    // godzinę startu i wypełnione godziny otwarcia dla tego lokalu w ogóle
    // (lokal bez żadnych godzin w arkuszu = jeszcze nie ograniczamy).
    if (selectedDate && selectedTime && r.hours && Object.keys(r.hours).length > 0) {
      const today = r.hours[dayKeyFromDate(selectedDate)];
      if (today === undefined || today === null) return false; // brak wpisu dla tego dnia lub jawnie zamknięte
      const start = timeToMinutes(selectedTime);
      const end = start + parseDurationHours(w.duration) * 60;
      if (start < timeToMinutes(today.open) || end > timeToMinutes(today.close)) return false;
    }
    return Math.max(w.minPeople, r.minPeople) <= Math.min(w.maxPeople, r.maxPeople);
  };
  // Krok 1 (nic jeszcze nie wybrane po drugiej stronie) pokazuje wszystko;
  // krok 2 zawęża do pozycji zgodnych z tym, co wybrano w kroku 1.
  // Restauracja bez wypełnionych `variants` (pakietów "dla dorosłych") nie ma
  // z czego policzyć ceny w zwykłej ścieżce — traktujemy to jako świadomy
  // sygnał "tylko tryb dla dzieci" (np. Latająca Filiżanka ma tylko
  // kidsVariants) i nie pokazujemy jej tutaj. "Wkrótce" nadal pokazujemy
  // zawsze, tak jak dotychczas.
  const compatibleRestaurants = restaurants.filter(r => r.comingSoon || (r.variants.length > 0 && isCompatible(workshop, r)));
  const compatibleWorkshops   = workshops.filter(w => w.comingSoon || isCompatible(w, restaurant));

  // Krok 1 ścieżki "Mam miejsce" — tylko artyści z travelsToClient=tak
  // (żadnego dopasowania do restauracji, bo jej tu w ogóle nie ma).
  const ownPlaceWorkshops = workshops.filter(w => w.comingSoon || w.travelsToClient === true);

  const variant    = restaurant?.variants.find(v => v.id === selectedVariant);
  const ppp        = (variant?.price ?? 0) + (workshop?.pricePerPerson ?? 0);
  const total      = ppp * groupSize;

  // ── Tryb "Eventy dla dzieci" ──────────────────────────────────
  // Zasady jak isCompatible dla dorosłych (osobna sala / faktura / godziny),
  // plus wymóg forKids+acceptsKids+kidsVariants, plus liczebność liczona
  // względem KONKRETNEJ wpisanej liczby dzieci/dorosłych, nie zakresu.
  const isKidsCompatible = (w, r) => {
    if (w && !w.forKids) return false;
    if (r && (!r.acceptsKids || !r.kidsVariants || r.kidsVariants.length === 0)) return false;
    if (!w || !r) return true;
    if (w.requiresSeparateRoom && !r.hasSeparateRoom) return false;
    if (r.requiresInvoice && w.canInvoice === false) return false;
    if (selectedDate && selectedTime && r.hours && Object.keys(r.hours).length > 0) {
      const today = r.hours[dayKeyFromDate(selectedDate)];
      if (today === undefined || today === null) return false;
      const start = timeToMinutes(selectedTime);
      const end = start + parseDurationHours(w.duration) * 60;
      if (start < timeToMinutes(today.open) || end > timeToMinutes(today.close)) return false;
    }
    if (kidsCount != null) {
      if (w.minPeople != null && kidsCount < w.minPeople) return false;
      if (w.maxPeople != null && kidsCount > w.maxPeople) return false;
      if (r.maxPeople != null && (kidsCount + (adultsCount || 0)) > r.maxPeople) return false;
    }
    return true;
  };
  // Widokowe obiekty restauracji dla trybu dzieci: `variants` podmienione na
  // `kidsVariants` tego samego wpisu — dzięki temu RestaurantCard/ProfileModal
  // renderują pakiety dziecięce BEZ ŻADNYCH zmian w logice wyboru pakietu,
  // czytają dokładnie ten sam kształt danych co dla dorosłych.
  const toKidsRestaurantView = r => ({ ...r, variants: r.kidsVariants });
  const compatibleRestaurantsKids = restaurants
    .filter(r => r.comingSoon || isKidsCompatible(workshop, r))
    .map(toKidsRestaurantView);
  const compatibleWorkshopsKids = workshops.filter(w => w.comingSoon || isKidsCompatible(w, restaurant));
  const ownPlaceWorkshopsKids = workshops.filter(w => w.comingSoon || (w.travelsToClient === true && w.forKids));

  const kidsVariant = restaurant?.kidsVariants?.find(v => v.id === selectedVariant);
  const kidsPriceKnown = kidsVariant && kidsVariant.price != null;
  const kidsPpp   = kidsPriceKnown ? kidsVariant.price + (workshop?.pricePerPerson ?? 0) : null;
  const kidsTotal = kidsPpp != null && kidsCount != null ? kidsPpp * kidsCount : null;
  // Cena samego warsztatu — pokazywana osobno, dopóki nie znamy ceny
  // restauracji (jeszcze nie wybrana, albo pakiet "ustalane indywidualnie").
  // Gdy restauracja poda swoją cenę, kidsTotal > 0 i to przestaje być używane
  // — wraca "normalne sumowanie".
  const kidsWorkshopPpp   = workshop?.pricePerPerson ?? null;
  const kidsWorkshopTotal = kidsWorkshopPpp != null && kidsCount != null ? kidsWorkshopPpp * kidsCount : null;

  // Liczba osób jest wybierana raz, na samym początku (pasek na stronie
  // głównej) — tu tylko dopilnowujemy, żeby mieściła się w zakresie
  // wspólnym dla wybranego warsztatu i restauracji, bez nadpisywania
  // wyboru klienta, jeśli już się mieści.
  useEffect(() => {
    if (mode === "kids") return;
    if (!workshop && !restaurant) return;
    const lo = Math.max(workshop?.minPeople ?? 1, restaurant?.minPeople ?? 1);
    const hi = Math.min(workshop?.maxPeople ?? Infinity, restaurant?.maxPeople ?? Infinity);
    setGroupSize(gs => Math.min(hi, Math.max(lo, gs)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id, restaurant?.id, mode]);

  // Odpowiednik powyższego dla trybu "Eventy dla dzieci" — automatycznie
  // ustawia `kidsCount` na sensowną wartość, gdy wybrano zarówno warsztat,
  // jak i restaurację, nawet jeśli klient nie dotknął jeszcze stepper'a na
  // ekranie głównym. Bez tego pakiet z realną ceną pokazywał "cena do
  // ustalenia" tylko dlatego, że `kidsCount` było wciąż `null`.
  useEffect(() => {
    if (mode !== "kids") return;
    if (!workshop && !restaurant) return;
    const lo = Math.max(workshop?.minPeople ?? 1, restaurant?.minPeople ?? 1);
    const hi = Math.min(workshop?.maxPeople ?? Infinity, restaurant?.maxPeople ?? Infinity);
    setKidsCount(kc => Math.min(hi, Math.max(lo, kc)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id, restaurant?.id, mode]);

  if (dataLoading) {
    return (
      <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:14 }}>
        Wczytywanie...
      </div>
    );
  }

  if (dataError) {
    return (
      <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:14, textAlign:"center", padding:24 }}>
        Nie udało się wczytać danych. Odśwież stronę lub spróbuj ponownie za chwilę.
      </div>
    );
  }

  // "restaurant" jest tu jedyną "specjalną" gałęzią — "workshop" i "ownplace"
  // zachowują się tak samo w krokach 1/1-wybór (artysta najpierw), różnią się
  // dopiero w kroku 2 (patrz ownPlace/step2Selected niżej).
  const step1Kind = path === "restaurant" ? "restaurant" : "workshop";
  const step2Kind = path === "restaurant" ? "workshop" : "restaurant";
  const step1Selected = path === "restaurant" ? !!selectedR : !!selectedW;

  // Ścieżka "Mam miejsce" — osobny top-level path, wybierany od razu kafelkiem
  // na starcie (obok "Wybierz warsztat"/"Wybierz restaurację" — patrz
  // withOwnPlaceTile). Krok 1 pokazuje tylko artystów z travelsToClient=tak
  // (filtrowanie w items poniżej), krok 2 to zawsze formularz wywiadu o
  // miejscu — bez listy restauracji i bez dodatkowego przełącznika.
  const ownPlace = path === "ownplace";

  const step2Selected = ownPlace
    ? placeInfo.address.trim() !== ""
    : (path === "restaurant" ? !!selectedW : !!selectedR);

  return (
    <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>

      {/* Nagłówek */}
      <header style={{ background:C.card, padding:"14px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, borderBottom:`1px solid ${C.border}` }}>
        <div onClick={() => { setMode("client"); resetToHome(); }} style={{ display:"flex", alignItems:"center", gap:12, flex:"1 1 0", marginLeft:"clamp(4px, 3vw, 44px)", cursor:"pointer" }}>
          <div style={{ width:70, height:70, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <img src={LOGO_IMG} alt={COPY.siteName} style={{ width:70, height:70, objectFit:"contain" }} />
          </div>
          <div>
            <div style={{ fontFamily:"'Pan Pizza', cursive", fontSize:36, fontWeight:400, color:C.primary, letterSpacing:"0.01em" }}>{COPY.siteName}</div>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.14em", marginTop:2 }}>{COPY.tagline}</div>
          </div>
        </div>

        {/* Przełącznik trybu */}
        <div className="mode-switcher" style={{ display:"flex", alignItems:"center", background:C.tagBg, borderRadius:999, padding:4, flexWrap:"wrap" }}>
          <button className="mode-switcher-btn" onClick={() => goWizardMode("client")} style={{ padding:"9px 22px", borderRadius:999, border:"none", background: mode==="client" ? C.primary : "transparent", color: mode==="client" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="client" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Planuję event
          </button>
          <div className="mode-switcher-divider" style={{ width:1, alignSelf:"stretch", background:C.border, margin:"10px 2px" }} />
          <button className="mode-switcher-btn" onClick={() => goWizardMode("kids")} style={{ padding:"9px 22px", borderRadius:999, border:"none", background: mode==="kids" ? C.primary : "transparent", color: mode==="kids" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="kids" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Eventy dla dzieci
          </button>
          <div className="mode-switcher-divider" style={{ width:1, alignSelf:"stretch", background:C.border, margin:"10px 2px" }} />
          <button className="mode-switcher-btn" onClick={() => setMode("b2b")} style={{ padding:"9px 22px", borderRadius:999, border:"none", background: mode==="b2b" ? C.primary : "transparent", color: mode==="b2b" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="b2b" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Współpraca
          </button>
        </div>
      </header>

      {/* Widok Współpraca */}
      {mode === "b2b" && <PartnersView openTermsOnMount={openPartnerTermsOnLoad} />}

      {/* Widok Eventy dla dzieci */}
      {mode === "kids" && (
        <>
          {path === null ? (
            <>
              <KidsHomeScreen
                restaurants={restaurants} workshops={workshops}
                onStart={p => { setPath(p); setWizardStep(1); }}
                kidsCount={kidsCount} setKidsCount={setKidsCount}
                adultsCount={adultsCount} setAdultsCount={setAdultsCount}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                selectedTime={selectedTime} setSelectedTime={setSelectedTime}
              />
              <Footer />
            </>
          ) : submitted ? (
            <>
              <ConfirmationScreen onBackToHome={resetToHome} />
              <Footer />
            </>
          ) : (
            <>
              <WizardProgressBar step={wizardStep} path={path} onStepClick={n => setWizardStep(n)} />
              {wizardStep < 3 && (
                <div className="wizard-nav-bar" style={{ marginTop:20 }}>
                  <WizardStickyBar
                    restaurant={restaurant} workshop={workshop}
                    groupSize={kidsCount}
                    ppp={ownPlace ? (kidsWorkshopPpp ?? 0) : (kidsPpp ?? 0)}
                    total={ownPlace ? (kidsWorkshopTotal ?? 0) : (kidsTotal ?? 0)}
                    workshopOnlyPpp={kidsWorkshopPpp ?? 0} workshopOnlyTotal={kidsWorkshopTotal ?? 0}
                    canAdvance={wizardStep === 1 ? step1Selected : step2Selected}
                    nextLabel="Dalej"
                    priceUnavailableLabel={!ownPlace && restaurant?.kidsVariants?.length && !kidsPriceKnown ? "Cenę ustalisz bezpośrednio z restauracją" : undefined}
                    onNext={() => {
                      if (wizardStep === 1 && selectedW && selectedR) setWizardStep(3);
                      else setWizardStep(s => s + 1);
                    }}
                    onBack={() => window.history.back()}
                  />
                </div>
              )}
              <div style={{ paddingBottom:20 }}>
                {wizardStep === 1 && (
                  <>
                    <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 16px" }}>
                      <PathTiles activeKey={path} onSelect={switchPath} labels={withOwnPlaceTile(KIDS_PATH_TILE_LABELS, workshops.filter(w => w.forKids))} />
                    </div>
                    <PickStep
                      kind={step1Kind}
                      items={ownPlace ? ownPlaceWorkshopsKids : (step1Kind === "workshop" ? compatibleWorkshopsKids : compatibleRestaurantsKids)}
                      selectedId={step1Kind === "workshop" ? selectedW : selectedR}
                      selectedVariantId={selectedVariant}
                      onToggle={id => step1Kind === "workshop" ? setSelectedW(selectedW === id ? null : id) : handleToggleR(id)}
                      onVariantSelect={vid => setSelectedVariant(vid)}
                      onProfile={item => setProfileItem({ item, type: step1Kind })}
                      onFallback={() => setWizardStep(3)}
                      onBackToStep1={() => { if (step1Kind === "workshop") { setSelectedR(null); setSelectedVariant(null); } else setSelectedW(null); }}
                      kidsMode
                    />
                  </>
                )}
                {wizardStep === 2 && (
                  ownPlace ? (
                    <PlaceInterviewForm value={placeInfo} onChange={setPlaceInfo} travelArea={workshop?.travelArea} kidsMode />
                  ) : (
                    <PickStep
                      kind={step2Kind}
                      items={step2Kind === "workshop" ? compatibleWorkshopsKids : compatibleRestaurantsKids}
                      selectedId={step2Kind === "workshop" ? selectedW : selectedR}
                      selectedVariantId={selectedVariant}
                      onToggle={id => step2Kind === "workshop" ? setSelectedW(selectedW === id ? null : id) : handleToggleR(id)}
                      onVariantSelect={vid => setSelectedVariant(vid)}
                      onProfile={item => setProfileItem({ item, type: step2Kind })}
                      onFallback={() => setWizardStep(3)}
                      onBackToStep1={() => window.history.back()}
                      notice={step2Kind === "restaurant" ? [
                        workshop?.requiresSeparateRoom && "Pokazujemy miejsca z osobną salą — tego wymaga wybrany warsztat.",
                        selectedTime && selectedDate && "Pokazujemy miejsca otwarte o tej porze w wybranym dniu, w których warsztat zdąży się skończyć przed zamknięciem.",
                      ].filter(Boolean) : null}
                      kidsMode
                    />
                  )
                )}
                {wizardStep === 3 && (
                  <Step4ContactForm
                    restaurant={ownPlace ? undefined : restaurant} variant={kidsVariant} workshop={workshop}
                    groupSize={kidsCount}
                    selectedDate={selectedDate} onDateChange={setSelectedDate}
                    selectedTime={selectedTime} onTimeChange={setSelectedTime}
                    ppp={ownPlace ? (kidsWorkshopPpp ?? 0) : (kidsPpp ?? 0)}
                    total={ownPlace ? (kidsWorkshopTotal ?? 0) : (kidsTotal ?? 0)}
                    workshopOnlyTotal={kidsWorkshopTotal ?? 0}
                    onEditStep={n => setWizardStep(n)}
                    onSubmitted={() => setSubmitted(true)}
                    kidsMode kidsCount={kidsCount} adultsCount={adultsCount}
                    ownPlace={ownPlace} placeInfo={placeInfo}
                  />
                )}
              </div>
              {wizardStep < 3 && <div className="wizard-nav-spacer" />}
            </>
          )}
        </>
      )}

      {/* Widok klienta */}
      {mode === "client" && (
        <>
          {path === null ? (
            <>
              <HomeScreen restaurants={restaurants} workshops={workshops} onStart={p => { setPath(p); setWizardStep(1); }}
                groupSize={groupSize} setGroupSize={setGroupSize}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                selectedTime={selectedTime} setSelectedTime={setSelectedTime}
              />
              <Footer />
            </>
          ) : submitted ? (
            <>
              <ConfirmationScreen onBackToHome={resetToHome} />
              <Footer />
            </>
          ) : (
            <>
              <WizardProgressBar step={wizardStep} path={path} onStepClick={n => setWizardStep(n)} />
              {wizardStep < 3 && (
                <div className="wizard-nav-bar" style={{ marginTop:20 }}>
                  <WizardStickyBar
                    restaurant={restaurant} workshop={workshop}
                    groupSize={groupSize} ppp={ppp} total={total}
                    canAdvance={wizardStep === 1 ? step1Selected : step2Selected}
                    nextLabel="Dalej"
                    onNext={() => {
                      // Przełącznik ścieżki na górze kroku 1 pozwala wybrać
                      // OBA elementy (warsztat i restaurację) bez opuszczania
                      // kroku 1 — w takim wypadku krok 2 (wybór tego samego,
                      // co już wybrane) jest zbędny, więc przechodzimy od
                      // razu do podsumowania zamiast pokazywać go ponownie.
                      if (wizardStep === 1 && selectedW && selectedR) setWizardStep(3);
                      else setWizardStep(s => s + 1);
                    }}
                    onBack={() => window.history.back()}
                  />
                </div>
              )}
              <div style={{ paddingBottom:20 }}>
                {wizardStep === 1 && (
                  <>
                    <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 16px" }}>
                      <PathTiles activeKey={path} onSelect={switchPath} labels={withOwnPlaceTile(DEFAULT_PATH_TILE_LABELS, workshops)} />
                    </div>
                    <PickStep
                    kind={step1Kind}
                    items={ownPlace ? ownPlaceWorkshops : (step1Kind === "workshop" ? compatibleWorkshops : compatibleRestaurants)}
                    selectedId={step1Kind === "workshop" ? selectedW : selectedR}
                    selectedVariantId={selectedVariant}
                    onToggle={id => step1Kind === "workshop" ? setSelectedW(selectedW === id ? null : id) : handleToggleR(id)}
                    onVariantSelect={vid => setSelectedVariant(vid)}
                    onProfile={item => setProfileItem({ item, type: step1Kind })}
                    onFallback={() => setWizardStep(3)}
                    onBackToStep1={() => { if (step1Kind === "workshop") { setSelectedR(null); setSelectedVariant(null); } else setSelectedW(null); }}
                    />
                  </>
                )}
                {wizardStep === 2 && (
                  ownPlace ? (
                    <PlaceInterviewForm value={placeInfo} onChange={setPlaceInfo} travelArea={workshop?.travelArea} />
                  ) : (
                    <PickStep
                      kind={step2Kind}
                      items={step2Kind === "workshop" ? compatibleWorkshops : compatibleRestaurants}
                      selectedId={step2Kind === "workshop" ? selectedW : selectedR}
                      selectedVariantId={selectedVariant}
                      onToggle={id => step2Kind === "workshop" ? setSelectedW(selectedW === id ? null : id) : handleToggleR(id)}
                      onVariantSelect={vid => setSelectedVariant(vid)}
                      onProfile={item => setProfileItem({ item, type: step2Kind })}
                      onFallback={() => setWizardStep(3)}
                      onBackToStep1={() => window.history.back()}
                      notice={step2Kind === "restaurant" ? [
                        workshop?.requiresSeparateRoom && "Pokazujemy miejsca z osobną salą — tego wymaga wybrany warsztat.",
                        selectedTime && selectedDate && "Pokazujemy miejsca otwarte o tej porze w wybranym dniu, w których warsztat zdąży się skończyć przed zamknięciem.",
                      ].filter(Boolean) : null}
                    />
                  )
                )}
                {wizardStep === 3 && (
                  <Step4ContactForm
                    restaurant={ownPlace ? undefined : restaurant} variant={variant} workshop={workshop}
                    groupSize={groupSize}
                    selectedDate={selectedDate} onDateChange={setSelectedDate}
                    selectedTime={selectedTime} onTimeChange={setSelectedTime}
                    ppp={ppp} total={total}
                    onEditStep={n => setWizardStep(n)}
                    onSubmitted={() => setSubmitted(true)}
                    ownPlace={ownPlace} placeInfo={placeInfo}
                  />
                )}
              </div>
              {wizardStep < 3 && <div className="wizard-nav-spacer" />}
            </>
          )}
        </>
      )}

      {/* Modale */}
      {profileItem && (
        <ProfileModal
          item={mode === "kids" && profileItem.type === "restaurant" ? toKidsRestaurantView(profileItem.item) : profileItem.item}
          type={profileItem.type}
          kidsMode={mode === "kids"}
          isSelected={profileItem.type === "restaurant" ? selectedR === profileItem.item.id : selectedW === profileItem.item.id}
          onToggleSelect={() => {
            if (profileItem.type === "restaurant") handleToggleR(profileItem.item.id);
            else setSelectedW(selectedW === profileItem.item.id ? null : profileItem.item.id);
          }}
          selectedVariantId={selectedR === profileItem.item.id ? selectedVariant : null}
          onVariantSelect={vid => {
            if (selectedR !== profileItem.item.id) setSelectedR(profileItem.item.id);
            setSelectedVariant(vid);
          }}
          onClose={() => window.history.back()} />
      )}
    </div>
  );
}
