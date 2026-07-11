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
  tagline:     "Eventy grupowe · Poznań i okolice",
  heroTitle:   "Zaplanuj niezapomniane spotkanie.",
  heroSubtitle:"Kawiarnie od zawsze były miejscem, gdzie rodziły się rozmowy, przyjaźnie i sztuka. Chcemy przywrócić ten klimat — pyszna kolacja i twórczy warsztat w jednym wieczorze, który naprawdę zbliża ludzi. Wybierzcie miejsce i zacznijcie wspólnie tworzyć.",
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
const toBool = v => /^(true|1|tak)$/i.test((v || "").trim());
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
  const v = { id, label, detail, price: Number(price) };
  if (priceMax) v.priceMax = Number(priceMax);
  return v;
});

function restaurantFromRow(row) {
  return {
    id: row.id, name: row.name, comingSoon: toBool(row.comingSoon) || undefined,
    logo: imgPath(row.logo), photos: imgListPath(row.photos),
    vibe: row.vibe, location: row.location, description: row.description, fullDescription: row.fullDescription,
    capacity: row.capacity, minPeople: toNum(row.minPeople), maxPeople: toNum(row.maxPeople),
    address: row.address, website: row.website, instagram: row.instagram,
    instagramUrl: row.instagramUrl || undefined, facebookUrl: row.facebookUrl || undefined,
    gradientBg: row.gradientBg, gradientText: row.gradientText,
    hasSeparateRoom: toBool(row.hasSeparateRoom) || undefined,
    variants: parseVariants(row.variants),
    email: row.email || undefined,
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

const OCCASIONS = [
  { id: "all",          label: "Wszystkie" },
  { id: "bachelorette", label: "Wieczór panieński" },
  { id: "birthday",     label: "Urodziny" },
  { id: "team",         label: "Team building" },
  { id: "other",        label: "Inna okazja" },
];

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
  input, textarea, button { font-family: 'Montserrat', system-ui, sans-serif; }
  input:focus, textarea:focus { outline: 2px solid ${C.primary}; outline-offset: 1px; border-color: ${C.primary} !important; }
  .card-h { transition: box-shadow 0.18s, transform 0.15s; }
  .card-h:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important; transform: translateY(-2px); }
  .gallery-thumb img { transition: transform 0.25s ease; }
  .gallery-thumb:hover img { transform: scale(1.08); }
  .chip { transition: all 0.15s; }
  .bar-in { animation: slideUp 0.28s ease; }
  .modal-fade { animation: fadeIn 0.2s ease; }
  @keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  a { color: inherit; }
  .tile-grid { display:flex; flex-wrap:wrap; justify-content:center; gap:14px; align-items:stretch; }
  .tile-card { width: calc((100% - 42px) / 4); display:flex; }
  @media (max-width: 980px) {
    .tile-card { width: calc((100% - 28px) / 3); }
  }
  @media (max-width: 640px) {
    .tile-card { width: calc((100% - 14px) / 2); }
  }
  @media (max-width: 420px) {
    .tile-card { width: 100%; }
  }
  @media (max-width: 620px) {
    .search-bar { flex-direction: column; align-items: stretch !important; border-radius: 20px !important; padding: 10px !important; }
    .search-segment { padding: 10px 14px !important; }
    .search-divider { width: 100% !important; height: 1px !important; margin: 2px 0 !important; align-self: stretch; }
    .search-btn { width: 100%; height: 46px !important; padding: 0 20px !important; font-size: 14px !important; margin-top: 6px; }
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
              <img src={getSrc(p)} alt={`Zdjęcie ${i + 1}`} style={{ width:"100%", height:"100%", objectFit:getFit(p), objectPosition:getPosition(p), display:"block" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom:22 }}>
      <div onClick={() => setExpandedIdx(null)} style={{ borderRadius:12, overflow:"hidden", cursor:"zoom-out", marginBottom:8, background:"#111", display:"flex", justifyContent:"center", alignItems:"center" }}>
        <img src={getSrc(photos[expandedIdx])} alt={`Zdjęcie ${expandedIdx + 1}`} style={{ width:"100%", maxHeight:280, objectFit:"contain", display:"block" }} />
      </div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
        {photos.map((p, i) => (
          <img key={i} src={getSrc(p)} onClick={() => setExpandedIdx(i)} alt={`Miniatura ${i + 1}`}
            style={{ width:64, height:48, objectFit:getFit(p), objectPosition:getPosition(p), borderRadius:6, cursor:"pointer", flexShrink:0, border: i === expandedIdx ? `2px solid ${C.primary}` : "2px solid transparent", opacity: i === expandedIdx ? 1 : 0.7 }} />
        ))}
      </div>
      <div style={{ textAlign:"center", marginTop:8 }}>
        <button onClick={() => setExpandedIdx(null)} style={{ fontSize:11, color:C.muted, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Zwiń zdjęcia</button>
      </div>
    </div>
  );
}

function ProfileModal({ item, type, isSelected, onToggleSelect, onClose }) {
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
          <div style={{ position:"absolute", top:0, left:0, right:0, height:5, background: item.gradientBg }} />
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:C.tagBg, border:"none", color:C.muted, borderRadius:"50%", width:32, height:32, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>

          {item.logo && (
            <div style={{ width:72, height:72, margin:"0 auto 14px" }}>
              <img src={item.logo} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
            </div>
          )}
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:28, fontWeight:400, color:C.text, marginBottom:4 }}>{item.name}</div>
          <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.12em" }}>
            {isRestaurant ? `${item.vibe} · ${item.location}` : item.artist}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding:"24px 24px 32px" }}>

          {/* Zdjęcia — na samej górze części informacyjnej */}
          {item.photos ? (
            <PhotoGallery photos={item.photos} />
          ) : item.photo ? (
            <div style={{ borderRadius:10, overflow:"hidden", marginBottom:20 }}>
              <img src={item.photo} alt={item.name} style={{ width:"100%", height:180, objectFit:"cover", display:"block" }} />
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
            {isRestaurant && <InfoPill text={item.address} />}
            {isRestaurant && item.hasSeparateRoom && <InfoPill text="Osobna sala" />}
            {!isRestaurant && <InfoPill text={item.duration} />}
            {!isRestaurant && item.requiresSeparateRoom && (
              <span style={{ fontSize:11, color:C.muted }}>* potrzebna osobna sala</span>
            )}
          </div>

          {/* Description */}
          <p style={{ fontSize:14, color:C.muted, lineHeight:1.75, margin:"0 0 22px", fontWeight:300 }}>
            {isRestaurant ? item.fullDescription : item.bio}
          </p>

          {/* Social media — na środku profilu */}
          {(item.website && item.website !== "#" || item.instagramUrl || item.facebookUrl) && (
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:22, flexWrap:"wrap" }}>
              {item.website && item.website !== "#" && (
                <a href={item.website} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10, background:C.tagBg, color:C.text, textDecoration:"none", fontSize:13, fontWeight:500 }}>
                  Strona www
                </a>
              )}
              {item.instagramUrl && (
                <a href={item.instagramUrl} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10, background:C.tagBg, color:C.text, textDecoration:"none", fontSize:13, fontWeight:500 }}>
                  Instagram
                </a>
              )}
              {item.facebookUrl && (
                <a href={item.facebookUrl} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10, background:C.tagBg, color:C.text, textDecoration:"none", fontSize:13, fontWeight:500 }}>
                  Facebook
                </a>
              )}
            </div>
          )}

          <div style={{ height:1, background:C.border, marginBottom:20 }} />

          {/* Packages / Includes */}
          {isRestaurant ? (
            <>
              <div style={{ fontSize:11, color:C.muted, letterSpacing:"0.1em", marginBottom:12 }}>Pakiety gastronomiczne:</div>
              {item.variants.map(v => (
                <div key={v.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, marginBottom:8, background:C.tagBg, border:`1px solid ${C.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{v.label}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{v.detail}</div>
                  </div>
                  <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, color:C.primary, fontWeight:400 }}>{v.priceMax ? `${v.price}–${v.priceMax}` : v.price} zł</div>
                </div>
              ))}
              <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>* dokładne menu ustalane z restauracją indywidualnie wg życzenia, cena pokazuje orientacyjny zakres cenowy każdego pakietu.</div>
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
                <span style={{ fontSize:12, color:C.muted }}>/os. · {item.duration}</span>
              </div>
            </>
          )}

          {/* CTA */}
          <button
            onClick={() => { onToggleSelect(); onClose(); }}
            style={{ marginTop:24, width:"100%", background: isSelected ? "#6E4A2E" : C.primary, color:"#FFF", border:"none", borderRadius:9, padding:16, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            {isSelected
              ? "✓ Dodano do pakietu — kliknij aby usunąć"
              : isRestaurant ? "Wybierz tę restaurację →" : "Dodaj ten warsztat →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══ Karta restauracji ════════════════════════════════════════

function RestaurantCard({ r, isSelected, selectedVariantId, onToggle, onVariantSelect, onProfile }) {
  const soon = r.comingSoon;
  const minPrice = Math.min(...r.variants.map(v => v.price));
  return (
    <div className={soon ? "" : "card-h"} style={{ background: isSelected ? C.selectedBg : soon ? "#F5F4F1" : C.card, border:`2px solid ${isSelected ? C.primary : "transparent"}`, borderRadius:14, overflow:"hidden", boxShadow: isSelected ? "0 4px 16px rgba(67,42,22,0.14)" : soon ? "none" : "0 1px 5px rgba(0,0,0,0.07)", position:"relative", opacity: soon ? 0.78 : 1, display:"flex", flexDirection:"column", width:"100%" }}>

      {r.photo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative" }}>
          <img src={r.photo} alt={r.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5, background: r.gradientBg }} />
        </div>
      ) : r.logo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative", background:"#FFFFFF", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={r.logo} alt={r.name} style={{ width:110, height:110, objectFit:"contain", display:"block" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5, background: r.gradientBg }} />
        </div>
      ) : (
        <div style={{ height:5, background: r.gradientBg }} />
      )}

      {/* Wkrótce badge */}
      {soon && (
        <div style={{ position:"absolute", top:14, right:12, background:"#E8E4DC", borderRadius:10, padding:"3px 9px", fontSize:10, fontWeight:600, color:"#888", letterSpacing:"0.1em" }}>Wkrótce</div>
      )}

      <div onClick={soon ? undefined : onToggle} style={{ padding:"18px 20px 8px", cursor: soon ? "default" : "pointer", flex:"1 1 auto" }}>
        {isSelected && !soon && (
          <div style={{ position:"absolute", top:16, right:14, background:C.primary, borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#FFF" }}>✓</div>
        )}
        <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:21, fontWeight:400, color: soon ? "#999" : C.text, marginBottom:2 }}>{r.name}</div>
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
                  <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:17, color:C.primary }}>{v.priceMax ? `${v.price}–${v.priceMax}` : v.price} zł</div>
                </div>
              );
            })}
          </div>
        )}

        {soon ? (
          <div style={{ marginTop:12, fontSize:13, color:"#BBB", fontStyle:"italic" }}>Cena wkrótce</div>
        ) : !isSelected && (
          <div style={{ marginTop:12 }}>
            <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:22, color:C.primary }}>od {minPrice} zł</span>
            <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>/os.</span>
          </div>
        )}
      </div>

      {/* Profile link */}
      <div style={{ padding:"0 20px 16px" }}>
        <button onClick={e => { e.stopPropagation(); onProfile(); }} style={{ fontSize:12, color: soon ? "#BBB" : C.primary, background:"transparent", border:"none", cursor:"pointer", padding:0, fontWeight:500, textDecoration: soon ? "none" : "underline", fontFamily:"'Montserrat', system-ui, sans-serif" }}>
          {soon ? "Profil w przygotowaniu" : "Zobacz profil →"}
        </button>
      </div>
    </div>
  );
}

// ══ Karta warsztatu ══════════════════════════════════════════

function WorkshopCard({ w, isSelected, onToggle, onProfile }) {
  const soon = w.comingSoon;
  return (
    <div className={soon ? "" : "card-h"} style={{ background: isSelected ? C.selectedBg : soon ? "#F5F4F1" : C.card, border:`2px solid ${isSelected ? C.primary : "transparent"}`, borderRadius:14, overflow:"hidden", boxShadow: isSelected ? "0 4px 16px rgba(67,42,22,0.14)" : soon ? "none" : "0 1px 5px rgba(0,0,0,0.07)", position:"relative", opacity: soon ? 0.78 : 1, display:"flex", flexDirection:"column", width:"100%" }}>
      {w.photo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative" }}>
          <img src={w.photo} alt={w.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5, background: w.gradientBg }} />
        </div>
      ) : w.logo ? (
        <div style={{ height:140, overflow:"hidden", position:"relative", background:"#ECE4D7", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={w.logo} alt={w.name} style={{ width:110, height:110, objectFit:"contain", display:"block" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5, background: w.gradientBg }} />
        </div>
      ) : (
        <div style={{ height:5, background: w.gradientBg }} />
      )}

      {/* Wkrótce badge */}
      {soon && (
        <div style={{ position:"absolute", top:14, right:12, background:"#E8E4DC", borderRadius:10, padding:"3px 9px", fontSize:10, fontWeight:600, color:"#888", letterSpacing:"0.1em" }}>Wkrótce</div>
      )}

      <div onClick={soon ? undefined : onToggle} style={{ padding:"18px 20px 8px", cursor: soon ? "default" : "pointer", flex:"1 1 auto" }}>
        {isSelected && !soon && (
          <div style={{ position:"absolute", top:16, right:14, background:C.primary, borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#FFF" }}>✓</div>
        )}
        <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, fontWeight:400, color: soon ? "#999" : C.text, marginBottom:2 }}>{w.name}</div>
        <div style={{ fontSize:10, letterSpacing:"0.1em", color:C.muted, marginBottom:8 }}>{w.artist}</div>
        <p style={{ fontSize:13, color:C.muted, margin:"0 0 12px", lineHeight:1.55, fontWeight:300 }}>{w.description}</p>

        {!soon && (
          <span style={{ fontSize:11, padding:"3px 9px", borderRadius:10, background: isSelected ? "rgba(255,255,255,0.6)" : C.tagBg, color:C.muted }}>{w.duration}</span>
        )}

        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, margin:"12px 0 14px" }}>
          {w.includes.map((item, i) => (
            <div key={i} style={{ fontSize:12, color: soon ? "#BBB" : C.muted, marginBottom:5, display:"flex", gap:7 }}>
              <span style={{ color: soon ? "#CCC" : C.primary, fontWeight:600 }}>+</span> {item}
            </div>
          ))}
        </div>

        {soon ? (
          <div style={{ fontSize:13, color:"#BBB", fontStyle:"italic" }}>Cena wkrótce</div>
        ) : (
          <div>
            <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:26, fontWeight:400, color:C.primary }}>{w.pricePerPerson} zł</span>
            <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>/os.</span>
          </div>
        )}
      </div>

      <div style={{ padding:"0 20px 16px" }}>
        <button onClick={e => { e.stopPropagation(); onProfile(); }} style={{ fontSize:12, color: soon ? "#BBB" : C.primary, background:"transparent", border:"none", cursor:"pointer", padding:0, fontWeight:500, textDecoration: soon ? "none" : "underline", fontFamily:"'Montserrat', system-ui, sans-serif" }}>
          {soon ? "Profil w przygotowaniu" : "Zobacz profil artysty →"}
        </button>
        {w.requiresSeparateRoom && (
          <div style={{ fontSize:10, color:C.muted, marginTop:8 }}>* potrzebna osobna sala</div>
        )}
      </div>
    </div>
  );
}

// ══ Formularz zapytania ══════════════════════════════════════

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

// Klient nie może zarezerwować terminu wcześniej niż za 7 dni roboczych
function minBookingDateStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < 7) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().split("T")[0];
}
const MIN_BOOKING_DATE = minBookingDateStr();

const TIME_OPTIONS = [];
for (let h = 8; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

function InquiryModal({ restaurant, variant, workshop, groupSize, prefilledDate, prefilledTime, onClose }) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", date: prefilledDate || "", time: prefilledTime || "", message:"" });
  const [consent, setConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm({ ...form, [k]: e.target.value });
  const inp = { width:"100%", padding:"11px 13px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, color:C.text, background:"#FAFAF8" };
  const lbl = { display:"block", fontSize:11, fontWeight:600, color:C.muted, marginBottom:5, letterSpacing:"0.08em" };

  const send = () => {
    if (!form.name || !form.email) { alert("Podaj imię i adres email."); return; }
    if (!consent) { alert("Zaznacz zgodę na przetwarzanie danych osobowych."); return; }
    if (form.date && form.date < MIN_BOOKING_DATE) { alert("Termin musi być co najmniej 7 dni roboczych od dziś."); return; }
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
        groupSize,
        date: form.time ? `${form.date}, ${form.time}` : form.date,
        message: form.message,
      }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => { setSending(false); setSent(true); setTimeout(onClose, 3000); })
      .catch(() => { setSending(false); setError("Nie udało się wysłać zapytania. Spróbuj ponownie."); });
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:16 }}>
      <div style={{ background:"#FFF", borderRadius:16, padding:32, maxWidth:460, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
        {sent ? (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:C.primary, color:"#FFF", fontSize:30, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>✓</div>
            <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:28, fontWeight:400, marginBottom:10 }}>Zapytanie wysłane!</div>
            <p style={{ color:C.muted, fontSize:14, lineHeight:1.65, margin:0 }}>Skontaktujemy się z Tobą w ciągu 24 godzin.</p>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
              <div>
                <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:26, fontWeight:400, marginBottom:4 }}>Wyślij zapytanie</div>
                <p style={{ fontSize:12, color:C.muted, margin:0 }}>{restaurant?.name || "–"}{variant ? ` · ${variant.label}` : ""}{workshop ? ` + ${workshop.name}` : ""} · {groupSize} os.</p>
              </div>
              <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.muted, padding:4, lineHeight:1 }}>✕</button>
            </div>
            {[
              { k:"name",  l:"Imię i nazwisko *", t:"text",  p:"Anna Kowalska"      },
              { k:"email", l:"Email *",            t:"email", p:"anna@email.com"     },
              { k:"phone", l:"Telefon",            t:"tel",   p:"+48 500 000 000"   },
            ].map(f => (
              <div key={f.k} style={{ marginBottom:14 }}>
                <label style={lbl}>{f.l}</label>
                <input type={f.t} placeholder={f.p} value={form[f.k]} onChange={set(f.k)} style={inp} />
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <div style={{ flex:"1 1 150px" }}>
                <label style={lbl}>Preferowana data</label>
                <input type="date" value={form.date} min={MIN_BOOKING_DATE} onChange={set("date")} style={inp} />
              </div>
              <div style={{ flex:"1 1 110px" }}>
                <label style={lbl}>Godzina</label>
                <select value={form.time} onChange={set("time")} style={inp}>
                  <option value="">Wybierz godzinę</option>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={lbl}>Wiadomość / specjalne życzenia</label>
              <textarea rows={3} placeholder="Okazja, szczególne wymagania, pytania..." value={form.message} onChange={set("message")} style={{ ...inp, resize:"vertical" }} />
            </div>
            <label style={{ display:"flex", gap:9, alignItems:"flex-start", fontSize:11, color:C.muted, lineHeight:1.5, marginBottom:16, cursor:"pointer" }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop:2, flexShrink:0 }} />
              <span>Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zapytania. Więcej informacji w{" "}
                <button type="button" onClick={e => { e.preventDefault(); setShowPrivacy(true); }} style={{ background:"none", border:"none", padding:0, color:C.primary, textDecoration:"underline", cursor:"pointer", fontSize:11 }}>
                  Polityce prywatności
                </button>.
              </span>
            </label>
            {error && <p style={{ color:"#C0392B", fontSize:12, marginBottom:12 }}>{error}</p>}
            <button onClick={send} disabled={sending} style={{ width:"100%", background:C.primary, color:"#FFF", border:"none", borderRadius:9, padding:16, fontSize:15, fontWeight:600, cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Wysyłanie..." : "Wyślij zapytanie →"}
            </button>
            <p style={{ fontSize:11, color:"#C0BEB9", textAlign:"center", marginTop:12, marginBottom:0 }}>Odpowiadamy w ciągu 24 godz.</p>
          </>
        )}
      </div>
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

// ══ Główna aplikacja ════════════════════════════════════════

const ARTIST_FORM_URL     = "https://docs.google.com/forms/d/e/1FAIpQLSf1rSqcKIau2nNEU03Gc62pn5sT6wO35MbF6l4w5icxMdAmug/viewform?usp=header";
const RESTAURANT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSexblazM7leUObytgMAh3Ek8mQBdMnYYFunpI4peNGMUhVmVg/viewform?usp=header";

// Widok "Współpraca" — informacje o procesie + linki do formularzy zgłoszeniowych
function PartnersView() {
  const steps = [
    { n:"1", t:"Klient wybiera lokal i artystę", d:"Na stronie klient wybiera restaurację/kawiarnię oraz warsztat, który chce zorganizować u siebie." },
    { n:"2", t:"Artysta akceptuje termin", d:"Artysta dostaje zapytanie z proponowaną datą i liczbą osób — potwierdza je lub proponuje zmianę." },
    { n:"3", t:"Restauracja czeka na potwierdzenie", d:"Lokal od razu widzi zapytanie klienta i czeka na akceptację ze strony artysty, zanim event zostanie ostatecznie ustalony." },
  ];

  return (
    <>
    <div style={{ maxWidth:760, margin:"0 auto", padding:"56px 16px 80px" }}>
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

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px,1fr))", gap:16 }}>
        <div style={{ textAlign:"center", padding:"30px 24px", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, fontWeight:400, marginBottom:8 }}>Jestem artystą / prowadzę warsztaty</div>
          <p style={{ fontSize:13, color:C.muted, margin:"0 0 16px", lineHeight:1.6 }}>Dołącz jako partner i przyjmuj zapytania na warsztaty w lokalach naszych partnerów.</p>
          <a href={ARTIST_FORM_URL} target="_blank" rel="noreferrer" style={{ display:"inline-block", background:C.primary, color:"#FFF", textDecoration:"none", borderRadius:9, padding:"12px 24px", fontSize:14, fontWeight:600 }}>Formularz zgłoszeniowy →</a>
        </div>
        <div style={{ textAlign:"center", padding:"30px 24px", background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:20, fontWeight:400, marginBottom:8 }}>Prowadzę restaurację / kawiarnię</div>
          <p style={{ fontSize:13, color:C.muted, margin:"0 0 16px", lineHeight:1.6 }}>Zgłoś swój lokal i dotrzyj do klientów szukających wyjątkowych eventów grupowych.</p>
          <a href={RESTAURANT_FORM_URL} target="_blank" rel="noreferrer" style={{ display:"inline-block", background:C.primary, color:"#FFF", textDecoration:"none", borderRadius:9, padding:"12px 24px", fontSize:14, fontWeight:600 }}>Formularz zgłoszeniowy →</a>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}

export default function App() {
  const { restaurants, workshops, dataLoading, dataError } = useSheetData();
  const [mode,           setMode]           = useState("client"); // "client" | "b2b"
  const [openField,      setOpenField]      = useState(null); // null | "people" | "date" | "occasion" — który segment paska wyszukiwania jest rozwinięty
  const searchBarRef = useRef(null);
  const [occasion,        setOccasion]        = useState("all");
  const [selectedR,       setSelectedR]       = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedW,       setSelectedW]       = useState(null);
  const [groupSize,       setGroupSize]       = useState(10);
  const [showInquiry,     setShowInquiry]     = useState(false);
  const [profileItem,     setProfileItem]     = useState(null);
  const [selectedDate,    setSelectedDate]    = useState("");
  const [selectedTime,    setSelectedTime]    = useState("");

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet"; document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = globalCSS; document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!openField) return;
    const handleOutsideClick = e => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) setOpenField(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openField]);

  const handleToggleR = rId => {
    if (selectedR === rId) { setSelectedR(null); setSelectedVariant(null); return; }
    setSelectedR(rId);
    const r = restaurants.find(r => r.id === rId);
    setSelectedVariant(r?.variants[0]?.id ?? null);
  };

  const workshop   = workshops.find(w => w.id === selectedW);
  const filteredR  = restaurants.filter(r => r.comingSoon || (
    groupSize >= r.minPeople && groupSize <= r.maxPeople &&
    (!workshop?.requiresSeparateRoom || r.hasSeparateRoom)
  ));
  const filteredW  = workshops.filter(w => w.comingSoon || (groupSize >= w.minPeople && groupSize <= w.maxPeople));
  const restaurant = restaurants.find(r => r.id === selectedR);
  const variant    = restaurant?.variants.find(v => v.id === selectedVariant);
  const ppp        = (variant?.price ?? 0) + (workshop?.pricePerPerson ?? 0);
  const total      = ppp * groupSize;
  const hasSelection = selectedR || selectedW;

  const SectionTitle = ({ title, count }) => (
    <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:18 }}>
      <h2 style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:28, fontWeight:400, margin:0, color:C.text }}>{title}</h2>
      {count !== undefined && <span style={{ fontSize:12, color:C.muted }}>{count} dostępne</span>}
    </div>
  );

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

  return (
    <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>

      {/* Nagłówek */}
      <header style={{ background:C.card, padding:"14px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, borderBottom:`1px solid ${C.border}` }}>
        <div onClick={() => setMode("client")} style={{ display:"flex", alignItems:"center", gap:12, flex:"1 1 0", marginLeft:"clamp(4px, 3vw, 44px)", cursor:"pointer" }}>
          <div style={{ width:58, height:58, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <img src={LOGO_IMG} alt={COPY.siteName} style={{ width:58, height:58, objectFit:"contain" }} />
          </div>
          <div>
            <div style={{ fontFamily:"'Pan Pizza', cursive", fontSize:36, fontWeight:400, color:C.primary, letterSpacing:"0.01em" }}>{COPY.siteName}</div>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:"0.14em", marginTop:2 }}>{COPY.tagline}</div>
          </div>
        </div>

        {/* Przełącznik trybu */}
        <div style={{ display:"flex", alignItems:"center", background:C.tagBg, borderRadius:999, padding:4 }}>
          <button onClick={() => setMode("client")} style={{ padding:"9px 26px", borderRadius:999, border:"none", background: mode==="client" ? C.primary : "transparent", color: mode==="client" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="client" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Planuję event
          </button>
          <div style={{ width:1, alignSelf:"stretch", background:C.border, margin:"10px 2px" }} />
          <button onClick={() => setMode("b2b")} style={{ padding:"9px 26px", borderRadius:999, border:"none", background: mode==="b2b" ? C.primary : "transparent", color: mode==="b2b" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="b2b" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Współpraca
          </button>
        </div>

        <div style={{ fontSize:10, color:C.muted, textAlign:"right", fontWeight:300, flex:"1 1 0" }}>Ceny orientacyjne<br/>aktualizacja: czerwiec 2026</div>
      </header>

      {/* Widok Współpraca */}
      {mode === "b2b" && <PartnersView />}

      {/* Widok klienta */}
      {mode === "client" && (
      <>
      {/* Baner ze zdjęciem */}
      <div style={{ position:"relative", width:"100%", height:"clamp(260px, 42vw, 420px)", overflow:"hidden" }}>
        <img src={HERO_PHOTO} alt="Wspólne malowanie przy kawie" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 75%", display:"block" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(26,26,26,0) 40%, rgba(26,26,26,0.75) 100%)" }} />
        <div style={{ position:"absolute", left:0, right:0, bottom:0, padding:"0 16px 28px", maxWidth:1160, margin:"0 auto" }}>
          <h1 style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:"clamp(30px,4.5vw,52px)", fontWeight:300, margin:0, lineHeight:1.1, color:"#FFF", textShadow:"0 2px 12px rgba(0,0,0,0.35)" }}>{COPY.heroTitle}</h1>
        </div>
      </div>

      {/* Pasek wyszukiwania — pigułka z 3 rozwijanymi sekcjami, pod zdjęciem */}
      <div style={{ background:C.card, padding:"22px 16px", borderBottom:`1px solid ${C.border}`, position:"relative" }}>
        <div ref={searchBarRef} style={{ maxWidth:820, margin:"0 auto", position:"relative" }}>
          <div className="search-bar" style={{ display:"flex", alignItems:"stretch", background:"#FFF", border:`1px solid ${C.border}`, borderRadius:999, boxShadow:"0 4px 18px rgba(0,0,0,0.07)", padding:5, gap:0 }} onClick={e => e.stopPropagation()}>

            {/* Segment: Liczba osób */}
            <div className="search-segment" onClick={() => setOpenField(openField === "people" ? null : "people")} style={{ flex:1, padding:"8px 20px", borderRadius:999, cursor:"pointer", background: openField==="people" ? C.tagBg : "transparent", position:"relative" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text, letterSpacing:"0.02em" }}>Liczba osób</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>{groupSize} osób</div>

              {/* Rozwinięta zawartość: Liczba osób */}
              {openField === "people" && (
                <div className="modal-fade" onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"calc(100% + 8px)", left:0, background:"#FFF", border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 10px 32px rgba(0,0,0,0.14)", padding:20, minWidth:220, zIndex:50, cursor:"default" }}>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>Grupa od 5 do 20 osób</div>
                  <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"center" }}>
                    <button onClick={() => setGroupSize(Math.max(5, groupSize-1))} style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:18, color:C.primary }}>−</button>
                    <span style={{ fontSize:22, fontWeight:600, color:C.primary, minWidth:30, textAlign:"center" }}>{groupSize}</span>
                    <button onClick={() => setGroupSize(Math.min(20, groupSize+1))} style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:18, color:C.primary }}>+</button>
                  </div>
                </div>
              )}
            </div>

            <div className="search-divider" style={{ width:1, background:C.border, margin:"8px 0" }} />

            {/* Segment: Data eventu */}
            <div className="search-segment" onClick={() => setOpenField(openField === "date" ? null : "date")} style={{ flex:1, padding:"8px 20px", borderRadius:999, cursor:"pointer", background: openField==="date" ? C.tagBg : "transparent", position:"relative" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text, letterSpacing:"0.02em" }}>Data eventu</div>
              <div style={{ fontSize:13, color: selectedDate ? C.primary : C.muted, marginTop:2, fontWeight: selectedDate ? 600 : 400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {selectedDate ? `${new Date(selectedDate).toLocaleDateString("pl-PL", { day:"numeric", month:"long", year:"numeric" })}${selectedTime ? ", " + selectedTime : ""}` : "Wybierz termin"}
              </div>

              {/* Rozwinięta zawartość: Data eventu */}
              {openField === "date" && (
                <div className="modal-fade" onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"calc(100% + 8px)", left:0, background:"#FFF", border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 10px 32px rgba(0,0,0,0.14)", padding:20, minWidth:280, zIndex:50, cursor:"default" }}>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      min={MIN_BOOKING_DATE}
                      style={{ border:`1px solid ${C.border}`, borderRadius:8, background:"#FAFAF8", fontSize:14, color:C.primary, fontFamily:"'Montserrat', system-ui, sans-serif", fontWeight:500, padding:"9px 11px", flex:"1 1 150px", minWidth:0 }}
                    />
                    <select
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      style={{ border:`1px solid ${C.border}`, borderRadius:8, background:"#FAFAF8", fontSize:14, color:C.primary, fontFamily:"'Montserrat', system-ui, sans-serif", fontWeight:500, padding:"9px 11px", flex:"1 1 110px", minWidth:0 }}
                    >
                      <option value="">Godzina</option>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {(selectedDate || selectedTime) && (
                    <button onClick={() => { setSelectedDate(""); setSelectedTime(""); }} style={{ marginTop:10, background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:12, padding:0, textDecoration:"underline" }}>Wyczyść termin</button>
                  )}
                </div>
              )}
            </div>

            <div className="search-divider" style={{ width:1, background:C.border, margin:"8px 0" }} />

            {/* Segment: Okazja */}
            <div className="search-segment" onClick={() => setOpenField(openField === "occasion" ? null : "occasion")} style={{ flex:1, padding:"8px 20px", borderRadius:999, cursor:"pointer", background: openField==="occasion" ? C.tagBg : "transparent", position:"relative" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.text, letterSpacing:"0.02em" }}>Okazja</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {OCCASIONS.find(o => o.id === occasion)?.label ?? "Wszystkie"}
              </div>

              {/* Rozwinięta zawartość: Okazja */}
              {openField === "occasion" && (
                <div className="modal-fade" onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"#FFF", border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 10px 32px rgba(0,0,0,0.14)", padding:8, minWidth:230, zIndex:50, cursor:"default" }}>
                  {OCCASIONS.map(o => (
                    <div key={o.id} onClick={() => { setOccasion(o.id); setOpenField(null); }} style={{ padding:"10px 14px", borderRadius:9, cursor:"pointer", fontSize:14, background: occasion===o.id ? C.tagBg : "transparent", color: occasion===o.id ? C.primary : C.text, fontWeight: occasion===o.id ? 600 : 400 }}>
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="search-btn"
              onClick={() => { setOpenField(null); document.getElementById("restauracje")?.scrollIntoView({ behavior:"smooth", block:"start" }); }}
              style={{ padding:"0 20px", height:46, borderRadius:999, background:C.primary, border:"none", color:"#FFF", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, alignSelf:"center", whiteSpace:"nowrap" }}>
              Szukaj
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1160, margin:"0 auto", padding:"28px 16px 40px" }}>

        {/* Hero */}
        <div style={{ marginBottom:38 }}>
          <p style={{ fontSize:15, color:C.muted, fontWeight:300, margin:0, maxWidth:"100%", lineHeight:1.65 }}>{COPY.heroSubtitle}</p>
        </div>

        {/* Restauracje */}
        <section id="restauracje" style={{ marginBottom:42 }}>
          <SectionTitle title="Wybierz restaurację" count={filteredR.length} />
          <div className="tile-grid">
            {filteredR.map(r => (
              <div key={r.id} className="tile-card">
                <RestaurantCard r={r}
                  isSelected={selectedR === r.id}
                  selectedVariantId={selectedR === r.id ? selectedVariant : null}
                  onToggle={() => handleToggleR(r.id)}
                  onVariantSelect={vid => setSelectedVariant(vid)}
                  onProfile={() => setProfileItem({ item:r, type:"restaurant" })} />
              </div>
            ))}
          </div>
        </section>

        {/* Warsztaty */}
        <section style={{ marginBottom: hasSelection ? 130 : 42 }}>
          <SectionTitle title="Wybierz warsztat" count={filteredW.length} />
          <div className="tile-grid">
            {filteredW.map(w => (
              <div key={w.id} className="tile-card">
                <WorkshopCard w={w}
                  isSelected={selectedW === w.id}
                  onToggle={() => setSelectedW(selectedW===w.id ? null : w.id)}
                  onProfile={() => setProfileItem({ item:w, type:"workshop" })} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
      </>
      )} {/* koniec widoku klienta */}

      {/* Belka podsumowania — tylko w trybie klienta */}
      {mode === "client" && hasSelection && (
        <div className="bar-in" style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1C1C1C", padding:"14px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, zIndex:200, boxShadow:"0 -4px 28px rgba(0,0,0,0.2)" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:17, color:"#FFF", fontWeight:400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {restaurant ? <>{restaurant.name}{variant && <span style={{ color:C.accent }}> · {variant.label}</span>}</> : <span style={{ color:"#555" }}>— wybierz restaurację</span>}
              {restaurant && (workshop ? <><span style={{ color:C.accent }}> + </span>{workshop.name}</> : <span style={{ color:"#555" }}> · wybierz warsztat</span>)}
            </div>
            <div style={{ fontSize:11, color:"#777", marginTop:2 }}>
              {groupSize} osób{variant && ` · ${variant.price} zł/os.`}{workshop && ` · ${workshop.pricePerPerson} zł/os.`}{selectedDate && ` · ${new Date(selectedDate).toLocaleDateString("pl-PL", { day:"numeric", month:"long", year:"numeric" })}`}
            </div>
          </div>
          {ppp > 0 && (
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:28, color:C.accent, fontWeight:400, lineHeight:1 }}>{total.toLocaleString("pl-PL")} zł</div>
              <div style={{ fontSize:11, color:"#777" }}>{ppp} zł × {groupSize} os.</div>
            </div>
          )}
          <button onClick={() => setShowInquiry(true)} style={{ background:C.accent, color:"#1A1A1A", border:"none", borderRadius:9, padding:"13px 20px", fontSize:14, fontWeight:600, cursor:"pointer", flexShrink:0 }}>
            Wyślij zapytanie →
          </button>
        </div>
      )}

      {/* Modale */}
      {profileItem && (
        <ProfileModal
          item={profileItem.item} type={profileItem.type}
          isSelected={profileItem.type === "restaurant" ? selectedR === profileItem.item.id : selectedW === profileItem.item.id}
          onToggleSelect={() => {
            if (profileItem.type === "restaurant") handleToggleR(profileItem.item.id);
            else setSelectedW(selectedW === profileItem.item.id ? null : profileItem.item.id);
          }}
          onClose={() => setProfileItem(null)} />
      )}
      {showInquiry && (
        <InquiryModal restaurant={restaurant} variant={variant} workshop={workshop} groupSize={groupSize} prefilledDate={selectedDate} prefilledTime={selectedTime} onClose={() => setShowInquiry(false)} />
      )}
    </div>
  );
}
