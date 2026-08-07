# Eventy dla dzieci — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać trzeci tryb `mode === "kids"` do `src/App.jsx` — równoległy kreator „Eventy dla dzieci" z własną filtracją, kalkulatorem ceny od dziecka i wysyłką zapytania — bez zmian w istniejącym trybie klienta (dorośli) ani „Współpraca".

**Architecture:** Jeden wspólny kreator reużywany przez wszystkie tryby (`PathTiles`, `PickStep`, `RestaurantCard`, `WorkshopCard`, `ProfileModal`, `Step4ContactForm`, `WizardProgressBar`, `WizardStickyBar`) — tryb dzieci karmi je "widokowymi" obiektami restauracji, w których `variants` jest podmienione na `kidsVariants` (ten sam kształt danych, ten sam kod renderujący), plus drobne, addytywne propsy tam, gdzie treść musi się różnić (etykieta jednostki ceny, dodatkowy chip, tekst przy braku ceny). Osobny, nowy komponent tylko tam, gdzie zestaw pól faktycznie różni się jakościowo (`KidsFilterBar` — 4 pola zamiast 3, dwa z nich liczbowe).

**Tech Stack:** React 18 (bez frameworka testowego — pojedynczy plik `src/App.jsx`, Vite, Vercel). Weryfikacja przez push na `main` + realne sprawdzenie na żywej stronie (Vercel auto-deploy), zgodnie z ustalonym już w tym projekcie sposobem pracy — nie ma tu `npm test`.

## Global Constraints

- Brąz `#432A16` (`C.primary`) jedyny kolor akcji w całej stronie — żadnych nowych kolorów.
- Aktywny/wybrany element = cienka brązowa ramka, nigdy wypełnienie tłem.
- Zero strzałek na kafelkach/przyciskach — wyjątek: podkreślone linki tekstowe typu „Zobacz profil →".
- Puste pole zamiast tekstu zastępczego („Dowolne" itp.) — dotyczy też nowych pól Liczba dzieci/Liczba dorosłych.
- Jeden przycisk CTA na profilu.
- Push bezpośrednio na `main`, bez PR-ów (ustalony sposób pracy w tym projekcie).
- Brak lokalnego Node/npm w tym środowisku — nie da się odpalić `npm run build` lokalnie. Jedyna dostępna weryfikacja składni JSX to sam build Vercela po pushu (sprawdzany przez `get_deployment_build_logs`) plus ręczna, uważna analiza kodu przed pushem.
- Każdy krok kończy się pushem i sprawdzeniem na żywej stronie (`https://www.kawiarnianiartysci.pl`) — nie kilka kroków naraz.
- Dane wyłącznie z arkusza Google Sheets (CSV) — nowe kolumny (`acceptsKids`, `kidsVariants`, `forKids`, `kidsMinAge`) na razie nie istnieją w arkuszu; do czasu, aż Joanna je doda testowo (Zadanie 7), każda pozycja w trybie dzieci ma się po prostu nie pokazywać — to oczekiwane zachowanie, nie błąd.

---

## Metoda weryfikacji używana w każdym zadaniu (zamiast `pytest`)

Ten projekt nie ma frameworka testowego. Zamiast „napisz test → uruchom", każdy krok weryfikacyjny w tym planie wygląda tak:

1. `git add -A && git commit -m "..." && git push origin main`
2. Złap hash aktualnie żywego bundla PRZED pushem:
   `curl -sS -L --ssl-no-revoke "https://www.kawiarnianiartysci.pl/" | grep -o '/assets/index-[^"]*\.js'`
3. Odpytuj co ~5s (do ~3 min), aż hash się zmieni — to sygnał, że nowy build jest live (nie samo „build complete" w Vercelu, które wyprzedza propagację CDN o dodatkowe 60-90s).
4. Sprawdź build w Vercel MCP (`mcp__...__get_deployment_build_logs` dla ostatniego deploya) — jeśli build failed, log pokaże dokładny błąd składni.
5. Otwórz stronę w Browser pane, wykonaj konkretną, opisaną w kroku czynność (kliknięcia przez `computer`/`javascript_tool`), sprawdź DOM/network zgodnie z opisem w kroku.

To jest **realny odpowiednik "run test / verify pass"** w tym projekcie — traktuj punkty 1-5 jako pojedynczy krok planu, tak jak `pytest ... -v` w innych projektach.

---

## Task 1: Dane — nowe pola w arkuszu + poprawka parsera cenników

**Files:**
- Modify: `src/App.jsx:106-111` (`parseVariants`)
- Modify: `src/App.jsx:149-166` (`restaurantFromRow`)
- Modify: `src/App.jsx:168-182` (`workshopFromRow`)

**Interfaces:**
- Produces: `restaurant.acceptsKids: boolean|undefined`, `restaurant.kidsVariants: {id,label,detail,price:number|null,priceMax?}[]`, `workshop.forKids: boolean|undefined`, `workshop.kidsMinAge: number|undefined`. `parseVariants(text)` teraz zwraca `price: null` (nie `0`) dla pustej ceny — używane przez `variants` I `kidsVariants`.

- [ ] **Step 1: Popraw `parseVariants`, żeby pusta cena dawała `null`, nie `0`**

W `src/App.jsx` znajdź:
```js
const parseVariants = text => splitList(text).map(part => {
  const [id, label, detail, price, priceMax] = part.split("|");
  const v = { id, label, detail, price: Number(price) };
  if (priceMax) v.priceMax = Number(priceMax);
  return v;
});
```
Zamień na:
```js
const parseVariants = text => splitList(text).map(part => {
  const [id, label, detail, price, priceMax] = part.split("|");
  const v = { id, label, detail, price: price ? Number(price) : null };
  if (priceMax) v.priceMax = Number(priceMax);
  return v;
});
```

- [ ] **Step 2: Dodaj `acceptsKids`/`kidsVariants` do `restaurantFromRow`**

Znajdź:
```js
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
  };
}
```
Zamień na (dopisane dwie linie na końcu, przed `};`):
```js
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
```

- [ ] **Step 3: Dodaj `forKids`/`kidsMinAge` do `workshopFromRow`**

Znajdź:
```js
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
  };
}
```
Zamień na:
```js
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
  };
}
```

- [ ] **Step 4: Commit, push, zweryfikuj brak regresji**

```bash
git add -A
git commit -m "Dodaj pola dla trybu dzieci do parsera CSV (acceptsKids, kidsVariants, forKids, kidsMinAge) + poprawkę pustej ceny w parseVariants"
git push origin main
```
Poczekaj na nowy bundle (metoda weryfikacji wyżej), potem w Browser pane otwórz stronę główną i sprawdź, że **istniejące** restauracje nadal poprawnie pokazują ceny pakietów (np. Żuk: „od 59 zł") — to jedyna rzecz, która mogła się zepsuć w tym kroku (zmiana `Number(price)` → `price ? Number(price) : null`). Żadnych nowych kolumn w arkuszu jeszcze nie ma, więc `acceptsKids`/`forKids` będą `undefined` dla każdej pozycji — to oczekiwane, nic w UI się jeszcze nie zmienia.

---

## Task 2: Trzeci tryb w nagłówku + nowy stan (`kidsCount`, `adultsCount`) + reset przy przełączaniu

**Files:**
- Modify: `src/App.jsx:1450-1467` (stan w `App()`)
- Modify: `src/App.jsx:1503-1509` (`atRoot`)
- Modify: `src/App.jsx:1536-1540` (`resetToHome`)
- Modify: `src/App.jsx:1612-1634` (nagłówek)

**Interfaces:**
- Produces: `mode: "client"|"b2b"|"kids"`, `kidsCount: number|null`, `setKidsCount`, `adultsCount: number|null`, `setAdultsCount`. Reużywane bez zmian nazw przez kolejne zadania.

- [ ] **Step 1: Dodaj `kidsCount`/`adultsCount` do stanu `App()`**

Znajdź (`src/App.jsx:1456-1466`):
```js
  const [mode,            setMode]            = useState(openPartnerTermsOnLoad ? "b2b" : "client"); // "client" | "b2b"
  const [path,            setPath]            = useState(null);     // null | "workshop" | "restaurant" — null = ekran powitalny
  const [wizardStep,      setWizardStep]      = useState(1);         // 1..3
  const [submitted,       setSubmitted]       = useState(false);
  const [selectedR,       setSelectedR]       = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedW,       setSelectedW]       = useState(null);
  const [groupSize,       setGroupSize]       = useState(null);
  const [profileItem,     setProfileItem]     = useState(null);
  const [selectedDate,    setSelectedDate]    = useState("");
  const [selectedTime,    setSelectedTime]    = useState("");
```
Zamień na:
```js
  const [mode,            setMode]            = useState(openPartnerTermsOnLoad ? "b2b" : "client"); // "client" | "b2b" | "kids"
  const [path,            setPath]            = useState(null);     // null | "workshop" | "restaurant" — null = ekran powitalny
  const [wizardStep,      setWizardStep]      = useState(1);         // 1..3
  const [submitted,       setSubmitted]       = useState(false);
  const [selectedR,       setSelectedR]       = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedW,       setSelectedW]       = useState(null);
  const [groupSize,       setGroupSize]       = useState(null);
  const [kidsCount,       setKidsCount]       = useState(null);      // tryb "kids" — liczba dzieci, liczy się do ceny
  const [adultsCount,     setAdultsCount]     = useState(null);      // tryb "kids" — wyłącznie informacyjne
  const [profileItem,     setProfileItem]     = useState(null);
  const [selectedDate,    setSelectedDate]    = useState("");
  const [selectedTime,    setSelectedTime]    = useState("");
```

- [ ] **Step 2: Rozszerz `resetToHome` o `kidsCount`/`adultsCount`**

Znajdź:
```js
  const resetToHome = () => {
    setPath(null); setWizardStep(1); setSubmitted(false);
    setSelectedR(null); setSelectedVariant(null); setSelectedW(null);
    setGroupSize(null); setSelectedDate(""); setSelectedTime("");
  };
```
Zamień na:
```js
  const resetToHome = () => {
    setPath(null); setWizardStep(1); setSubmitted(false);
    setSelectedR(null); setSelectedVariant(null); setSelectedW(null);
    setGroupSize(null); setSelectedDate(""); setSelectedTime("");
    setKidsCount(null); setAdultsCount(null);
  };
```

- [ ] **Step 3: Rozszerz `atRoot` o `mode === "kids"`**

Znajdź (`src/App.jsx:1505`):
```js
    const atRoot = mode === "client" && path === null && wizardStep === 1 && !submitted && !profileItem;
```
Zamień na:
```js
    const atRoot = (mode === "client" || mode === "kids") && path === null && wizardStep === 1 && !submitted && !profileItem;
```

- [ ] **Step 4: Trzeci przycisk w nagłówku + reset przy przełączaniu client⇄kids**

Znajdź (`src/App.jsx:1624-1633`):
```js
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
```
Zamień na:
```js
        {/* Przełącznik trybu */}
        <div style={{ display:"flex", alignItems:"center", background:C.tagBg, borderRadius:999, padding:4, flexWrap:"wrap" }}>
          <button onClick={() => { if (mode !== "client") resetToHome(); setMode("client"); }} style={{ padding:"9px 22px", borderRadius:999, border:"none", background: mode==="client" ? C.primary : "transparent", color: mode==="client" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="client" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Planuję event
          </button>
          <div style={{ width:1, alignSelf:"stretch", background:C.border, margin:"10px 2px" }} />
          <button onClick={() => { if (mode !== "kids") resetToHome(); setMode("kids"); }} style={{ padding:"9px 22px", borderRadius:999, border:"none", background: mode==="kids" ? C.primary : "transparent", color: mode==="kids" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="kids" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Eventy dla dzieci
          </button>
          <div style={{ width:1, alignSelf:"stretch", background:C.border, margin:"10px 2px" }} />
          <button onClick={() => setMode("b2b")} style={{ padding:"9px 22px", borderRadius:999, border:"none", background: mode==="b2b" ? C.primary : "transparent", color: mode==="b2b" ? "#FFF" : C.muted, fontSize:14, fontWeight: mode==="b2b" ? 600 : 500, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            Współpraca
          </button>
        </div>
```
(`resetToHome` czyści też, gdy przechodzimy z `"b2b"` do `"client"`/`"kids"` — nieszkodliwe, bo `b2b` i tak nigdy nie zostawia w tych polach niczego istotnego dla drugiej strony; jedyny realny przypadek, który miało to rozwiązać, to `client ⇄ kids`.)

- [ ] **Step 5: Dodaj tymczasowy placeholder dla `mode === "kids"`, żeby przycisk był sprawdzalny już teraz**

Znajdź:
```js
      {/* Widok Współpraca */}
      {mode === "b2b" && <PartnersView openTermsOnMount={openPartnerTermsOnLoad} />}
```
Dodaj zaraz pod tym (tymczasowy blok — zostanie zastąpiony prawdziwym ekranem w Zadaniu 3):
```js
      {/* Widok Eventy dla dzieci — placeholder, pełny ekran w kolejnym zadaniu */}
      {mode === "kids" && <div style={{ padding:60, textAlign:"center", color:C.muted }}>Eventy dla dzieci — wkrótce</div>}
```

- [ ] **Step 6: Commit, push, zweryfikuj**

```bash
git add -A
git commit -m "Dodaj trzeci tryb 'Eventy dla dzieci' do nagłówka (placeholder) + stan kidsCount/adultsCount"
git push origin main
```
Po propagacji: w Browser pane sprawdź, że nagłówek ma teraz 3 przyciski, kliknięcie „Eventy dla dzieci" pokazuje tekst „Eventy dla dzieci — wkrótce", kliknięcie z powrotem „Planuję event" wraca do normalnej strony głównej. Sprawdź też, że tryb dorosłych (wybór warsztatu+restauracji+wysyłka) nadal działa identycznie jak przed zmianą — to jest regresja, którą trzeba potwierdzić po każdym kolejnym zadaniu też.

---

## Task 3: `KidsFilterBar` + `KidsHomeScreen` + etykiety kafelków dla dzieci

**Files:**
- Modify: `src/App.jsx:941-962` (`PathTiles` — opcjonalny override etykiet)
- Create (jako nowa funkcja w `src/App.jsx`, zaraz pod `HomeFilterBar`): `KidsFilterBar`
- Create (jako nowa funkcja w `src/App.jsx`, zaraz pod `HomeScreen`): `KidsHomeScreen`
- Modify: `src/App.jsx` (render w `App()`) — podmiana placeholdera z Zadania 2 na prawdziwy ekran

**Interfaces:**
- Consumes: `restaurants`, `workshops` (z `useSheetData()`), `kidsCount/setKidsCount`, `adultsCount/setAdultsCount`, `selectedDate/setSelectedDate`, `selectedTime/setSelectedTime` (wszystko już istnieje w `App()`).
- Produces: `KidsHomeScreen({ onStart, kidsCount, setKidsCount, adultsCount, setAdultsCount, selectedDate, setSelectedDate, selectedTime, setSelectedTime })` — `onStart(path)` wywoływane dokładnie jak w `HomeScreen`.

- [ ] **Step 1: Dodaj opcjonalny override etykiet do `PathTiles`**

Znajdź:
```js
function PathTiles({ activeKey, onSelect }) {
  const tile = (key, label, sub) => {
    const active = activeKey === key;
    return (
      <button key={key} onClick={() => onSelect(key)} style={{
        flex:1, textAlign:"center",
        background: active ? C.primary : C.card,
        border: `1px solid ${C.primary}`,
        borderRadius:999, padding:"14px 20px", cursor:"pointer",
      }}>
        <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:16, fontWeight:500, marginBottom:3, color: active ? "#FFF" : C.primary }}>{label}</div>
        <div style={{ fontSize:12, color: active ? "rgba(255,255,255,0.85)" : C.muted }}>{sub}</div>
      </button>
    );
  };
  return (
    <div className="home-cta-grid">
      {tile("workshop", "Wybierz warsztat", "Wiem, co chcemy robić")}
      {tile("restaurant", "Wybierz restaurację/kawiarnię", "Wiem, gdzie chcemy być")}
    </div>
  );
}
```
Zamień na (dodany opcjonalny prop `labels`, domyślne wartości identyczne jak dziś — zero zmian dla dotychczasowych wywołań bez tego propa):
```js
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
        flex:1, textAlign:"center",
        background: active ? C.primary : C.card,
        border: `1px solid ${C.primary}`,
        borderRadius:999, padding:"14px 20px", cursor:"pointer",
      }}>
        <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:16, fontWeight:500, marginBottom:3, color: active ? "#FFF" : C.primary }}>{label}</div>
        <div style={{ fontSize:12, color: active ? "rgba(255,255,255,0.85)" : C.muted }}>{sub}</div>
      </button>
    );
  };
  return (
    <div className="home-cta-grid">
      {tile("workshop")}
      {tile("restaurant")}
    </div>
  );
}

const KIDS_PATH_TILE_LABELS = {
  workshop:   { label:"Wybierz warsztat", sub:"Wiem, co chcemy robić" },
  restaurant: { label:"Wybierz miejsce", sub:"Wiem, gdzie chcemy być" },
};
```

- [ ] **Step 2: Dodaj `KidsFilterBar`, zaraz pod `HomeFilterBar` (przed komentarzem `// Para kafelków wyboru ścieżki`)**

```js
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
    <div ref={barRef} style={{ maxWidth:640, margin:"0 auto 28px", position:"relative" }}>
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
        <div onClick={() => setOpenField(null)} style={segStyle(!!selectedDate)}>
          <div style={segLabel(!!selectedDate)}>DATA</div>
          <input type="date" value={selectedDate} min={MIN_BOOKING_DATE} onChange={e => setSelectedDate(e.target.value)} onFocus={() => setOpenField(null)}
            style={{ ...segValue(!!selectedDate), border:"none", background:"transparent", padding:0, width:"100%", cursor:"pointer", fontFamily:"'Montserrat', system-ui, sans-serif" }} />
        </div>
        <div className="search-divider" style={{ background:C.border }} />
        <div onClick={() => setOpenField(null)} style={segStyle(!!selectedTime)}>
          <div style={segLabel(!!selectedTime)}>GODZINA</div>
          <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} onFocus={() => setOpenField(null)}
            style={{ ...segValue(!!selectedTime), border:"none", background:"transparent", padding:0, width:"100%", cursor:"pointer", fontFamily:"'Montserrat', system-ui, sans-serif", appearance:"none", WebkitAppearance:"none" }}>
            <option value=""></option>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
```
Uwaga: `TIME_OPTIONS` i `MIN_BOOKING_DATE` są zdefiniowane niżej w pliku niż `HomeFilterBar` dziś stoi (`TIME_OPTIONS` w linii 855, `MIN_BOOKING_DATE` w linii 851) — obie stałe muszą być zdefiniowane **przed** `KidsFilterBar` w kolejności deklaracji w pliku (JS hoisting `const` tego nie wybacza). Umieść `KidsFilterBar` **po** bloku `TIME_OPTIONS`/`MIN_BOOKING_DATE` (czyli po linii ok. 859), a nie bezpośrednio pod `HomeFilterBar` jak sugeruje nagłówek kroku — dokładne miejsce: zaraz przed `// Para kafelków wyboru ścieżki` (czyli tuż przed `function PathTiles`).

- [ ] **Step 3: Dodaj `KidsHomeScreen`, zaraz po `HomeScreen`, przed `// ══ Pasek postępu kreatora`**

```js
function KidsHomeScreen({ onStart, kidsCount, setKidsCount, adultsCount, setAdultsCount, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) {
  return (
    <div>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"56px 16px 56px" }}>
        <div style={{ textAlign:"center" }}>
          <h1 style={{ fontFamily:"'Pan Pizza', cursive", fontSize:"clamp(40px,7vw,64px)", fontWeight:400, lineHeight:1.2, color:C.primary, margin:"0 0 14px" }}>
            Eventy dla dzieci
          </h1>
          <p style={{ color:C.text, fontWeight:500, maxWidth:480, margin:"0 auto 28px", fontSize:15, lineHeight:1.6 }}>
            Gotowe pakiety urodzinowe — warsztat i miejsce w jednym, wyceniane od dziecka.
          </p>
        </div>

        <KidsFilterBar
          kidsCount={kidsCount} setKidsCount={setKidsCount}
          adultsCount={adultsCount} setAdultsCount={setAdultsCount}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          selectedTime={selectedTime} setSelectedTime={setSelectedTime}
        />

        <div style={{ marginBottom:16 }}>
          <PathTiles activeKey="workshop" onSelect={onStart} labels={KIDS_PATH_TILE_LABELS} />
        </div>
      </div>

      <HowItWorksSteps />
    </div>
  );
}
```

- [ ] **Step 4: Podmień placeholder z Zadania 2 na `KidsHomeScreen`**

Znajdź (dodane w Zadaniu 2):
```js
      {/* Widok Eventy dla dzieci — placeholder, pełny ekran w kolejnym zadaniu */}
      {mode === "kids" && <div style={{ padding:60, textAlign:"center", color:C.muted }}>Eventy dla dzieci — wkrótce</div>}
```
Zamień na:
```js
      {/* Widok Eventy dla dzieci */}
      {mode === "kids" && (
        <>
          {path === null ? (
            <>
              <KidsHomeScreen
                onStart={p => { setPath(p); setWizardStep(1); }}
                kidsCount={kidsCount} setKidsCount={setKidsCount}
                adultsCount={adultsCount} setAdultsCount={setAdultsCount}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                selectedTime={selectedTime} setSelectedTime={setSelectedTime}
              />
              <Footer />
            </>
          ) : (
            <div style={{ padding:60, textAlign:"center", color:C.muted }}>Kreator trybu dzieci — w kolejnym zadaniu</div>
          )}
        </>
      )}
```
(Kreator po kliknięciu kafelka zostaje tymczasowym placeholderem do Zadania 4 — celowo, żeby ten krok był sprawdzalny osobno: sam ekran startowy trybu dzieci, bez ryzyka błędu w jeszcze niezbudowanym kreatorze.)

- [ ] **Step 5: Commit, push, zweryfikuj**

```bash
git add -A
git commit -m "Dodaj KidsHomeScreen (4 filtry: dzieci/dorośli/data/godzina) i etykiety kafelków dla trybu dzieci"
git push origin main
```
Po propagacji, w Browser pane: wejdź w „Eventy dla dzieci", sprawdź że widać nagłówek „Eventy dla dzieci", 4 pola filtrów (Liczba dzieci / Liczba dorosłych / Data / Godzina — wszystkie puste na starcie, bez tekstu zastępczego), kliknięcie w Liczbę dzieci otwiera stepper startujący od 8, dwa kafelki „Wybierz warsztat" / „Wybierz miejsce", sekcja „Jak to działa" pod spodem. Kliknięcie kafelka pokazuje tymczasowy tekst „Kreator trybu dzieci — w kolejnym zadaniu". Sprawdź regresję: tryb klienta (dorośli) bez zmian.

---

## Task 4: `isKidsCompatible` + listy widokowe dla dzieci + krok 1/2 kreatora + bezpieczna obsługa pustej ceny w kartach/profilu

**Files:**
- Modify: `src/App.jsx:501-574` (`RestaurantCard` — bezpieczna cena + etykieta jednostki)
- Modify: `src/App.jsx:331-497` (`ProfileModal` — bezpieczna cena + etykieta jednostki + chip „Przyjazna dzieciom" + chip pojemności + `kidsMinAge`)
- Modify: `src/App.jsx:1542-1570` (`App()` — `isKidsCompatible`, listy widokowe, `variant`/`ppp`/`total` dla trybu dzieci)
- Modify: `src/App.jsx` (render trybu `kids` — prawdziwy krok 1/2 kreatora)

**Interfaces:**
- Consumes: z Task 1 — `restaurant.acceptsKids/kidsVariants`, `workshop.forKids/kidsMinAge`; z Task 2 — `kidsCount/adultsCount`.
- Produces: `isKidsCompatible(w, r)`, `compatibleRestaurantsKids`, `compatibleWorkshopsKids` (tablice **widokowych** obiektów restauracji, gdzie `variants` = `kidsVariants` oryginału — patrz Step 2), `kidsVariant` (wybrany pakiet), `kidsPpp`, `kidsTotal` (`null`, gdy cena pakietu nieznana).

- [ ] **Step 1: Dodaj bezpieczną obsługę `price === null` + `kidsMode` (etykieta jednostki) do `RestaurantCard` i `WorkshopCard`**

Znajdź:
```js
function RestaurantCard({ r, isSelected, selectedVariantId, onToggle, onVariantSelect, onProfile }) {
  const soon = r.comingSoon;
  const minPrice = Math.min(...r.variants.map(v => v.price));
```
Zamień na:
```js
function RestaurantCard({ r, isSelected, selectedVariantId, onToggle, onVariantSelect, onProfile, kidsMode = false }) {
  const soon = r.comingSoon;
  const pricedVariants = r.variants.filter(v => v.price != null);
  const minPrice = pricedVariants.length ? Math.min(...pricedVariants.map(v => v.price)) : null;
  const unitLabel = kidsMode ? "/dziecko" : "/os.";
```
Znajdź (wiersz pakietu w rozwiniętej karcie):
```js
                  <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:17, color:C.primary }}>{v.priceMax ? `${v.price}–${v.priceMax}` : v.price} zł</div>
```
Zamień na:
```js
                  <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:17, color:C.primary }}>
                    {v.price == null ? "cena do ustalenia" : `${v.priceMax ? `${v.price}–${v.priceMax}` : v.price} zł`}
                  </div>
```
Znajdź (cena minimalna na zwiniętej karcie):
```js
        {soon ? (
          <div style={{ marginTop:12, fontSize:13, color:"#BBB", fontStyle:"italic" }}>Cena wkrótce</div>
        ) : !isSelected && (
          <div style={{ marginTop:12 }}>
            <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:22, color:C.primary }}>od {minPrice} zł</span>
            <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>/os.</span>
          </div>
        )}
```
Zamień na:
```js
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
```

- [ ] **Step 1b: Dodaj `kidsMode` do `WorkshopCard` (ten sam `pricePerPerson` reprezentuje teraz cenę od dziecka)**

Znajdź:
```js
function WorkshopCard({ w, isSelected, onToggle, onProfile }) {
  const soon = w.comingSoon;
```
Zamień na:
```js
function WorkshopCard({ w, isSelected, onToggle, onProfile, kidsMode = false }) {
  const soon = w.comingSoon;
```
Znajdź:
```js
        {soon ? (
          <div style={{ fontSize:13, color:"#BBB", fontStyle:"italic" }}>Cena wkrótce</div>
        ) : (
          <div>
            <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:26, fontWeight:400, color:C.primary }}>{w.pricePerPerson} zł</span>
            <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>/os.</span>
          </div>
        )}
```
Zamień na:
```js
        {soon ? (
          <div style={{ fontSize:13, color:"#BBB", fontStyle:"italic" }}>Cena wkrótce</div>
        ) : (
          <div>
            <span style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:26, fontWeight:400, color:C.primary }}>{w.pricePerPerson} zł</span>
            <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>{kidsMode ? "/dziecko" : "/os."}</span>
          </div>
        )}
```

- [ ] **Step 1c: Przepuść `kidsMode` przez `PickStep` do obu kart**

Znajdź:
```js
function PickStep({ kind, items, selectedId, selectedVariantId, onToggle, onVariantSelect, onProfile, onFallback, onBackToStep1, notice }) {
```
Zamień na:
```js
function PickStep({ kind, items, selectedId, selectedVariantId, onToggle, onVariantSelect, onProfile, onFallback, onBackToStep1, notice, kidsMode = false }) {
```
Znajdź:
```js
        <div className="wizard-list">
          {items.map(item => (
            isRestaurant ? (
              <RestaurantCard key={item.id} r={item}
                isSelected={selectedId === item.id}
                selectedVariantId={selectedId === item.id ? selectedVariantId : null}
                onToggle={() => onToggle(item.id)}
                onVariantSelect={onVariantSelect}
                onProfile={() => onProfile(item)} />
            ) : (
              <WorkshopCard key={item.id} w={item}
                isSelected={selectedId === item.id}
                onToggle={() => onToggle(item.id)}
                onProfile={() => onProfile(item)} />
            )
          ))}
        </div>
```
Zamień na:
```js
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
```

- [ ] **Step 2: Analogiczna poprawka w `ProfileModal` (cena pakietu, etykieta jednostki, nowy chip, `kidsMinAge`)**

Znajdź:
```js
function ProfileModal({ item, type, isSelected, onToggleSelect, selectedVariantId, onVariantSelect, onClose }) {
  const isRestaurant = type === "restaurant";
```
Zamień na:
```js
function ProfileModal({ item, type, isSelected, onToggleSelect, selectedVariantId, onVariantSelect, onClose, kidsMode = false }) {
  const isRestaurant = type === "restaurant";
```
Znajdź (chipy nad opisem):
```js
            {isRestaurant && item.hasSeparateRoom && (
              <span style={{ display:"inline-flex", alignItems:"center", fontSize:12, padding:"5px 11px", background:"transparent", border:`1px solid ${C.primary}`, borderRadius:20, color:C.primary, marginRight:6, marginBottom:6 }}>Osobna sala</span>
            )}
            {isRestaurant && item.maxPeople && <InfoPill text={`Mieści do ${item.maxPeople} osób`} />}
            {!isRestaurant && <InfoPill text={item.duration} />}
            {!isRestaurant && item.requiresSeparateRoom && (
              <span style={{ fontSize:11, color:C.muted }}>* potrzebna osobna sala</span>
            )}
```
Zamień na:
```js
            {isRestaurant && item.hasSeparateRoom && (
              <span style={{ display:"inline-flex", alignItems:"center", fontSize:12, padding:"5px 11px", background:"transparent", border:`1px solid ${C.primary}`, borderRadius:20, color:C.primary, marginRight:6, marginBottom:6 }}>Osobna sala</span>
            )}
            {isRestaurant && kidsMode && (
              <span style={{ display:"inline-flex", alignItems:"center", fontSize:12, padding:"5px 11px", background:"transparent", border:`1px solid ${C.primary}`, borderRadius:20, color:C.primary, marginRight:6, marginBottom:6 }}>Przyjazna dzieciom</span>
            )}
            {isRestaurant && item.maxPeople && <InfoPill text={kidsMode ? `Mieści do ${item.maxPeople} osób (dzieci + dorośli)` : `Mieści do ${item.maxPeople} osób`} />}
            {!isRestaurant && <InfoPill text={item.duration} />}
            {!isRestaurant && kidsMode && item.kidsMinAge && <InfoPill text={`od ${item.kidsMinAge} lat`} />}
            {!isRestaurant && item.requiresSeparateRoom && (
              <span style={{ fontSize:11, color:C.muted }}>* potrzebna osobna sala</span>
            )}
```
Znajdź (blok pakietów restauracji):
```js
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
                      {v.priceMax ? `${v.price}–${v.priceMax}` : v.price} zł<span style={{ fontSize:11, color:C.muted, fontWeight:400, marginLeft:2 }}>/os.</span>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
```
Zamień na:
```js
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
```
Znajdź (przypis nad CTA):
```js
          {isRestaurant && (
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.5, marginTop:20 }}>
              Ceny pakietów są orientacyjne — dokładne menu ustalicie bezpośrednio z restauracją.
            </div>
          )}
```
Zamień na:
```js
          {isRestaurant && (
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.5, marginTop:20 }}>
              Ceny pakietów są orientacyjne — dokładne menu ustalicie bezpośrednio z restauracją.
              {kidsMode && <><br />* Tort ustalacie indywidualnie z restauracją.</>}
            </div>
          )}
```

- [ ] **Step 3: Dodaj `isKidsCompatible` + listy widokowe + cenę dla dzieci w `App()`**

Znajdź (`src/App.jsx:1548-1574`):
```js
  const isCompatible = (w, r) => {
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
    return Math.max(w.minPeople, r.minPeople) <= Math.min(w.maxPeople, r.maxPeople);
  };
  const compatibleRestaurants = restaurants.filter(r => r.comingSoon || isCompatible(workshop, r));
  const compatibleWorkshops   = workshops.filter(w => w.comingSoon || isCompatible(w, restaurant));

  const variant    = restaurant?.variants.find(v => v.id === selectedVariant);
  const ppp        = (variant?.price ?? 0) + (workshop?.pricePerPerson ?? 0);
  const total      = ppp * groupSize;
```
Zamień na (dopisane bloki dla trybu dzieci, reszta bez zmian):
```js
  const isCompatible = (w, r) => {
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
    return Math.max(w.minPeople, r.minPeople) <= Math.min(w.maxPeople, r.maxPeople);
  };
  const compatibleRestaurants = restaurants.filter(r => r.comingSoon || isCompatible(workshop, r));
  const compatibleWorkshops   = workshops.filter(w => w.comingSoon || isCompatible(w, restaurant));

  const variant    = restaurant?.variants.find(v => v.id === selectedVariant);
  const ppp        = (variant?.price ?? 0) + (workshop?.pricePerPerson ?? 0);
  const total      = ppp * groupSize;

  // ── Tryb "Eventy dla dzieci" ──────────────────────────────────
  // Zasady jak isCompatible dla dorosłych (osobna sala / faktura / godziny),
  // plus wymóg forKids+acceptsKids+kidsVariants, plus liczebność liczona
  // względem KONKRETNEJ wpisanej liczby dzieci/dorosłych, nie zakresu.
  const isKidsCompatible = (w, r) => {
    if (!w || !r) return true;
    if (!w.forKids || !r.acceptsKids || !r.kidsVariants || r.kidsVariants.length === 0) return false;
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

  const kidsVariant = restaurant?.kidsVariants?.find(v => v.id === selectedVariant);
  const kidsPriceKnown = kidsVariant && kidsVariant.price != null;
  const kidsPpp   = kidsPriceKnown ? kidsVariant.price + (workshop?.pricePerPerson ?? 0) : null;
  const kidsTotal = kidsPpp != null && kidsCount != null ? kidsPpp * kidsCount : null;
```

- [ ] **Step 4: Podmień tymczasowy placeholder kreatora (Task 3, Step 4) na prawdziwy krok 1/2**

Znajdź:
```js
          ) : (
            <div style={{ padding:60, textAlign:"center", color:C.muted }}>Kreator trybu dzieci — w kolejnym zadaniu</div>
          )}
```
(to wewnątrz bloku `{mode === "kids" && (...)}` dodanego w Task 3, Step 4) — zamień na:
```js
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
                    groupSize={kidsCount} ppp={kidsPpp ?? 0} total={kidsTotal ?? 0}
                    canAdvance={wizardStep === 1 ? step1Selected : step2Selected}
                    nextLabel="Dalej"
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
                    <div style={{ maxWidth:900, margin:"0 auto", padding:"0 16px" }}>
                      <PathTiles activeKey={path} onSelect={switchPath} labels={KIDS_PATH_TILE_LABELS} />
                    </div>
                    <PickStep
                      kind={step1Kind}
                      items={step1Kind === "workshop" ? compatibleWorkshopsKids : compatibleRestaurantsKids}
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
                )}
                {wizardStep === 3 && (
                  <div style={{ padding:60, textAlign:"center", color:C.muted }}>Podsumowanie trybu dzieci — w kolejnym zadaniu</div>
                )}
              </div>
              {wizardStep < 3 && <div className="wizard-nav-spacer" />}
            </>
          )}
```
(Krok 3 zostaje placeholderem do Zadania 5 — ten krok jest sprawdzalny osobno: kroki 1/2 kreatora dla dzieci już w pełni działają, filtrowanie i wybór pakietu też.)

- [ ] **Step 5: Podepnij `kidsMode` i widokowy obiekt pod wspólny `ProfileModal`**

Modal profilu jest jeden, wspólny dla obu trybów (`{profileItem && <ProfileModal .../>}` w `App()`, poza blokami `mode===...`). Musi dostać `kidsMode={mode === "kids"}` oraz — gdy to restauracja i jesteśmy w trybie dzieci — widokowy obiekt z `variants = kidsVariants` (tak samo jak w liście, przez `toKidsRestaurantView` z Step 3). Znajdź w `App()`:
```js
      {profileItem && (
        <ProfileModal
          item={profileItem.item} type={profileItem.type}
```
Zamień na:
```js
      {profileItem && (
        <ProfileModal
          item={mode === "kids" && profileItem.type === "restaurant" ? toKidsRestaurantView(profileItem.item) : profileItem.item}
          type={profileItem.type}
          kidsMode={mode === "kids"}
```

- [ ] **Step 6: Commit, push, zweryfikuj**

```bash
git add -A
git commit -m "Dodaj isKidsCompatible, listy widokowe dla dzieci i krok 1/2 kreatora trybu dzieci"
git push origin main
```
Po propagacji: dopóki arkusz nie ma jeszcze kolumn `acceptsKids`/`kidsVariants`/`forKids` wypełnionych (Task 7), listy w kroku 1/2 trybu dzieci będą **puste** (poza pozycjami `comingSoon`) — to oczekiwane. Sprawdź w Browser pane: wejście w „Eventy dla dzieci" → kafelek → krok 1 pokazuje pusty stan (komunikat + przyciski „Zmień wybór"/„Napisz do nas", istniejąca logika `PickStep` dla `items.length === 0`) bez błędów w konsoli. Sprawdź regresję: profil restauracji w trybie **klienta** nadal pokazuje zwykłe `variants`, bez chipu „Przyjazna dzieciom", z „/os." — dokładnie jak dziś.

---

## Task 5: Kalkulator ceny w kroku 3 (Step4ContactForm) + „cena do ustalenia" w pasku nawigacji

**Files:**
- Modify: `src/App.jsx:1354-1375` (`WizardStickyBar` — opcjonalny tekst zamiast kwoty)
- Modify: `src/App.jsx:1182-1335` (`Step4ContactForm` — wariant dla dzieci)
- Modify: `src/App.jsx` (render — użycie w trybie `kids`, podmiana placeholdera z Task 4 Step 4)

**Interfaces:**
- Consumes: `kidsCount`, `adultsCount`, `kidsVariant`, `kidsPpp`, `kidsTotal` z Task 4.
- Produces: `Step4ContactForm` przyjmuje nowe opcjonalne propsy `kidsMode`, `kidsCount`, `adultsCount` — gdy `kidsMode` nieobecne/`false`, zachowanie 1:1 jak dziś.

- [ ] **Step 1: `WizardStickyBar` — opcjonalny tekst zamiast kwoty, gdy cena nieznana**

Znajdź:
```js
function WizardStickyBar({ restaurant, workshop, groupSize, ppp, total, canAdvance, nextLabel, onNext, onBack }) {
  const summary = restaurant || workshop
    ? [restaurant?.name, workshop?.name].filter(Boolean).join(" + ")
    : "";
  const navBtn = { WebkitAppearance:"none", appearance:"none", border:"none", borderRadius:999, fontWeight:600, minHeight:44, width:104, padding:"8px 10px", fontSize:13, lineHeight:1.25, textAlign:"center" };
  return (
    <div style={{ maxWidth:900, margin:"0 auto 20px", padding:"0 16px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", alignItems:"center", gap:10, background:C.tagBg, borderRadius:999, padding:6 }}>
        <button onClick={onBack} style={{ ...navBtn, background:"transparent", border:`1.5px solid ${C.primary}`, color:C.primary, cursor:"pointer" }}>Wstecz</button>
        <div style={{ textAlign:"center", minWidth:0, overflow:"hidden" }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:18, color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {total > 0 ? `${total.toLocaleString("pl-PL")} zł` : summary}
          </div>
          {total > 0 && <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{groupSize} × {ppp} zł</div>}
        </div>
        <button onClick={onNext} disabled={!canAdvance} style={{ ...navBtn, background: canAdvance ? C.primary : "#DDD9D2", color: canAdvance ? "#FFF" : "#9A968D", cursor: canAdvance ? "pointer" : "default" }}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
```
Zamień na (dodany opcjonalny prop `priceUnavailableLabel` — gdy podany i `total` nie jest dodatnie, pokazuje ten tekst zamiast nazw wybranych pozycji):
```js
function WizardStickyBar({ restaurant, workshop, groupSize, ppp, total, canAdvance, nextLabel, onNext, onBack, priceUnavailableLabel }) {
  const summary = priceUnavailableLabel || (restaurant || workshop
    ? [restaurant?.name, workshop?.name].filter(Boolean).join(" + ")
    : "");
  const navBtn = { WebkitAppearance:"none", appearance:"none", border:"none", borderRadius:999, fontWeight:600, minHeight:44, width:104, padding:"8px 10px", fontSize:13, lineHeight:1.25, textAlign:"center" };
  return (
    <div style={{ maxWidth:900, margin:"0 auto 20px", padding:"0 16px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", alignItems:"center", gap:10, background:C.tagBg, borderRadius:999, padding:6 }}>
        <button onClick={onBack} style={{ ...navBtn, background:"transparent", border:`1.5px solid ${C.primary}`, color:C.primary, cursor:"pointer" }}>Wstecz</button>
        <div style={{ textAlign:"center", minWidth:0, overflow:"hidden" }}>
          <div style={{ fontFamily:"'Montserrat', system-ui, sans-serif", fontSize:18, color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {total > 0 ? `${total.toLocaleString("pl-PL")} zł` : summary}
          </div>
          {total > 0 && <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{groupSize} × {ppp} zł</div>}
        </div>
        <button onClick={onNext} disabled={!canAdvance} style={{ ...navBtn, background: canAdvance ? C.primary : "#DDD9D2", color: canAdvance ? "#FFF" : "#9A968D", cursor: canAdvance ? "pointer" : "default" }}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
```
W kroku 2/1 dla trybu dzieci (Task 4, `WizardStickyBar` wywołanie w bloku `mode==="kids"`) dodaj `priceUnavailableLabel={restaurant && restaurant.kidsVariants && !kidsPriceKnown ? "Cenę ustalisz bezpośrednio z restauracją" : undefined}` — patrz dokładny diff w Step 3 niżej (żeby nie duplikować kontekstu, ta zmiana jest scalona z resztą przebudowy render-bloku w Step 3).

- [ ] **Step 2: Rozszerz `Step4ContactForm` o wariant dla dzieci**

Znajdź sygnaturę i payload wysyłki:
```js
function Step4ContactForm({ restaurant, variant, workshop, groupSize, selectedDate, onDateChange, selectedTime, onTimeChange, ppp, total, onEditStep, onSubmitted }) {
```
Zamień na:
```js
function Step4ContactForm({ restaurant, variant, workshop, groupSize, selectedDate, onDateChange, selectedTime, onTimeChange, ppp, total, onEditStep, onSubmitted, kidsMode = false, kidsCount, adultsCount }) {
```
Znajdź (wewnątrz `send()`):
```js
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
        groupSize,
        date: selectedTime ? `${selectedDate}, ${selectedTime}` : selectedDate,
        message: form.message,
      }),
```
Zamień na:
```js
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
        kidsAmountLabel: kidsMode ? (total > 0 ? `${total.toLocaleString("pl-PL")} zł` : "do ustalenia") : undefined,
      }),
```
Znajdź (wiersze podsumowania):
```js
  const summaryRowsTop = [
    { label:"Warsztat", value: workshop ? `${workshop.name} (${workshop.artist})` : "—", step:1 },
    { label:"Miejsce", value: restaurant ? `${restaurant.name}${variant ? " · " + variant.label : ""}` : "—", step:2 },
  ];
  const summaryRowsBottom = [
    { label:"Liczba osób", value: `${groupSize} osób` },
    { label:"Kwota", value: total > 0 ? `${total.toLocaleString("pl-PL")} zł` : "—" },
  ];
```
Zamień na:
```js
  const summaryRowsTop = [
    { label:"Warsztat", value: workshop ? `${workshop.name} (${workshop.artist})` : "—", step:1 },
    { label:"Miejsce", value: restaurant ? `${restaurant.name}${variant ? " · " + variant.label : ""}` : "—", step:2 },
  ];
  const summaryRowsBottom = kidsMode ? [
    { label:"Liczba dzieci", value: kidsCount != null ? `${kidsCount}` : "—" },
    { label:"Liczba dorosłych", value: adultsCount != null ? `${adultsCount}` : "—" },
    { label:"Kwota", value: total > 0 ? `${total.toLocaleString("pl-PL")} zł` : "Cenę ustalisz bezpośrednio z restauracją" },
  ] : [
    { label:"Liczba osób", value: `${groupSize} osób` },
    { label:"Kwota", value: total > 0 ? `${total.toLocaleString("pl-PL")} zł` : "—" },
  ];
```
Znajdź (przypis pod kwotą, tuż przed formularzem kontaktowym):
```js
        <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, padding:"0 0 12px" }}>
          Kwota orientacyjna. Ostateczną cenę potwierdza restauracja przy ustalaniu menu.
        </div>
```
Zamień na:
```js
        <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, padding:"0 0 12px" }}>
          {kidsMode && total <= 0
            ? "Cenę ustalisz bezpośrednio z restauracją."
            : "Kwota orientacyjna. Ostateczną cenę potwierdza restauracja przy ustalaniu menu."}
          {kidsMode && <><br />* Tort ustalacie indywidualnie z restauracją.</>}
        </div>
```

- [ ] **Step 3: Podmień placeholder kroku 3 (Task 4, Step 4) i dopnij `priceUnavailableLabel` w `WizardStickyBar` dla trybu dzieci**

Znajdź (dodane w Task 4, Step 4, wewnątrz bloku `mode === "kids"`):
```js
                  <WizardStickyBar
                    restaurant={restaurant} workshop={workshop}
                    groupSize={kidsCount} ppp={kidsPpp ?? 0} total={kidsTotal ?? 0}
                    canAdvance={wizardStep === 1 ? step1Selected : step2Selected}
                    nextLabel="Dalej"
                    onNext={() => {
                      if (wizardStep === 1 && selectedW && selectedR) setWizardStep(3);
                      else setWizardStep(s => s + 1);
                    }}
                    onBack={() => window.history.back()}
                  />
```
Zamień na:
```js
                  <WizardStickyBar
                    restaurant={restaurant} workshop={workshop}
                    groupSize={kidsCount} ppp={kidsPpp ?? 0} total={kidsTotal ?? 0}
                    canAdvance={wizardStep === 1 ? step1Selected : step2Selected}
                    nextLabel="Dalej"
                    priceUnavailableLabel={restaurant?.kidsVariants?.length && !kidsPriceKnown ? "Cenę ustalisz bezpośrednio z restauracją" : undefined}
                    onNext={() => {
                      if (wizardStep === 1 && selectedW && selectedR) setWizardStep(3);
                      else setWizardStep(s => s + 1);
                    }}
                    onBack={() => window.history.back()}
                  />
```
Znajdź (placeholder kroku 3):
```js
                {wizardStep === 3 && (
                  <div style={{ padding:60, textAlign:"center", color:C.muted }}>Podsumowanie trybu dzieci — w kolejnym zadaniu</div>
                )}
```
Zamień na:
```js
                {wizardStep === 3 && (
                  <Step4ContactForm
                    restaurant={restaurant} variant={kidsVariant} workshop={workshop}
                    groupSize={kidsCount}
                    selectedDate={selectedDate} onDateChange={setSelectedDate}
                    selectedTime={selectedTime} onTimeChange={setSelectedTime}
                    ppp={kidsPpp ?? 0} total={kidsTotal ?? 0}
                    onEditStep={n => setWizardStep(n)}
                    onSubmitted={() => setSubmitted(true)}
                    kidsMode kidsCount={kidsCount} adultsCount={adultsCount}
                  />
                )}
```

- [ ] **Step 4: Commit, push, zweryfikuj**

```bash
git add -A
git commit -m "Dodaj kalkulator ceny i podsumowanie kroku 3 dla trybu dzieci, w tym obsługę 'cena do ustalenia'"
git push origin main
```
Po propagacji, ponieważ arkusz jeszcze nie ma testowych danych (Task 7 to zrobi), pełny przebieg kroku 3 trybu dzieci da się sprawdzić dopiero po Zadaniu 7 — na razie sprawdź tylko: brak błędów w konsoli na całej ścieżce `mode==="kids"` (krok 1 → krok 2 → krok 3, nawet z pustymi listami), i że **tryb klienta (dorośli) przechodzi cały kreator od początku do wysłania zapytania dokładnie jak przed tym zadaniem** (to najważniejsza regresja do sprawdzenia — `Step4ContactForm` i `WizardStickyBar` są teraz współdzielone między trybami).

---

## Task 6: `api/inquiry.js` — pola i maile dla eventu dla dzieci

**Files:**
- Modify: `api/inquiry.js` (cały plik — patrz `src/App.jsx` czytanie wcześniej w tej sesji, plik ma 108 linii)

**Interfaces:**
- Consumes: `isKidsEvent`, `kidsCount`, `adultsCount`, `kidsPackageName`, `kidsAmountLabel` z payloadu wysyłanego przez `Step4ContactForm` (Task 5).

- [ ] **Step 1: Dodaj destructuring nowych pól + helper sekcji dla dzieci**

Znajdź w `api/inquiry.js`:
```js
    const {
      clientName, clientEmail, clientPhone,
      restaurantName, restaurantEmail,
      artistName, workshopName, artistEmail,
      artistInvoicing, artistRequirements,
      groupSize, date, message,
    } = req.body || {};
```
Zamień na:
```js
    const {
      clientName, clientEmail, clientPhone,
      restaurantName, restaurantEmail,
      artistName, workshopName, artistEmail,
      artistInvoicing, artistRequirements,
      groupSize, date, message,
      isKidsEvent, kidsCount, adultsCount, kidsPackageName, kidsAmountLabel,
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
```

- [ ] **Step 2: Dołóż `kidsEventBlock` do maila dla artysty**

Znajdź:
```js
        html: emailHtml(`
          <p>Cześć ${artistName || ""}!</p>
          <p>Restauracja <strong>${restaurantName || ""}</strong> dostała zapytanie o Twój warsztat „${workshopName || ""}". Oto szczegóły:</p>
          <ul>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize || "-"}</li>
            <li>Kontakt do klienta: ${clientName}${clientEmail ? ` — ${clientEmail}` : ""}${clientPhone ? `, ${clientPhone}` : ""}</li>
            ${message ? `<li>Wiadomość od klienta: ${message}</li>` : ""}
          </ul>
          <p>Jeśli zaproponowany termin Ci nie pasuje, możesz napisać bezpośrednio do klienta i zaproponować inny — dane kontaktowe wyżej.</p>
          <p>Daj nam znać, czy ten termin Ci pasuje:</p>
```
Zamień na:
```js
        html: emailHtml(`
          <p>Cześć ${artistName || ""}!</p>
          <p>Restauracja <strong>${restaurantName || ""}</strong> dostała zapytanie o Twój warsztat „${workshopName || ""}". Oto szczegóły:</p>
          ${kidsEventBlock}
          <ul>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize || "-"}</li>
            <li>Kontakt do klienta: ${clientName}${clientEmail ? ` — ${clientEmail}` : ""}${clientPhone ? `, ${clientPhone}` : ""}</li>
            ${message ? `<li>Wiadomość od klienta: ${message}</li>` : ""}
          </ul>
          <p>Jeśli zaproponowany termin Ci nie pasuje, możesz napisać bezpośrednio do klienta i zaproponować inny — dane kontaktowe wyżej.</p>
          <p>Daj nam znać, czy ten termin Ci pasuje:</p>
```

- [ ] **Step 3: Dołóż `kidsEventBlock` do maila dla restauracji**

Znajdź:
```js
        html: emailHtml(`
          <p>Cześć!</p>
          <p>Macie nowe zapytanie o wspólny event:</p>
          <ul>
            <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""}</li>
            <li>Termin: ${date || "do ustalenia"}</li>
            <li>Liczba osób: ${groupSize || "-"}</li>
            <li>Klient: ${clientName}</li>
          </ul>
          <p>Czekamy teraz na potwierdzenie terminu przez artystę — damy znać mailowo, jak tylko odpowie.</p>
```
Zamień na:
```js
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
```

- [ ] **Step 4: Dołóż `kidsEventBlock` do maila dla właścicielki**

Znajdź:
```js
      html: emailHtml(`
        <p>Nowe zapytanie na stronie:</p>
        <ul>
          <li>Klient: ${clientName} (${clientEmail}${clientPhone ? ", " + clientPhone : ""})</li>
          <li>Restauracja: ${restaurantName || "-"} ${restaurantEmail ? `(${restaurantEmail})` : "(brak adresu email w arkuszu)"}</li>
          <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""} ${artistEmail ? `(${artistEmail})` : "(brak adresu email w arkuszu)"}</li>
          <li>Termin: ${date || "do ustalenia"}</li>
          <li>Liczba osób: ${groupSize || "-"}</li>
          ${message ? `<li>Wiadomość: ${message}</li>` : ""}
        </ul>
      `),
```
Zamień na:
```js
      html: emailHtml(`
        <p>Nowe zapytanie na stronie:</p>
        ${kidsEventBlock}
        <ul>
          <li>Klient: ${clientName} (${clientEmail}${clientPhone ? ", " + clientPhone : ""})</li>
          <li>Restauracja: ${restaurantName || "-"} ${restaurantEmail ? `(${restaurantEmail})` : "(brak adresu email w arkuszu)"}</li>
          <li>Warsztat: ${workshopName || "-"} ${artistName ? `(${artistName})` : ""} ${artistEmail ? `(${artistEmail})` : "(brak adresu email w arkuszu)"}</li>
          <li>Termin: ${date || "do ustalenia"}</li>
          <li>Liczba osób: ${groupSize || "-"}</li>
          ${message ? `<li>Wiadomość: ${message}</li>` : ""}
        </ul>
      `),
```

- [ ] **Step 5: Commit, push, zweryfikuj**

```bash
git add -A
git commit -m "Dodaj sekcję eventu dla dzieci do maili (artysta/restauracja/właścicielka) w api/inquiry.js"
git push origin main
```
Serverless function — po propagacji sprawdź działanie **dopiero razem z Zadaniem 7** (potrzebne prawdziwe dane w arkuszu, żeby przejść cały kreator i faktycznie wysłać zapytanie). Na tym etapie wystarczy potwierdzić przez Vercel MCP (`get_deployment_build_logs`), że funkcja zbudowała się bez błędów składni.

---

## Task 7: Dane testowe w arkuszu + pełny test end-to-end na żywo

**Files:** brak zmian w kodzie — tylko dane w Google Sheets (robi Joanna, z moją asystą) i weryfikacja na żywej stronie.

- [ ] **Step 1: Poproś Joannę o wypełnienie testowych danych**

Dokładne instrukcje (jak w specyfikacji, sekcja „Jak sprawdzić"):
- Dla jednej restauracji (np. Latająca Filiżanka): `acceptsKids=tak`, `kidsVariants` z 3 pakietami, **jeden z nich z pustą ceną** (np. `indywidualny|Pakiet indywidualny|Zakres i cena ustalane bezpośrednio z restauracją|`) — żeby sprawdzić „cena do ustalenia".
- Dla jednego warsztatu: `forKids=tak`, `kidsMinAge` wypełnione.

- [ ] **Step 2: Pełny test manualny na żywej stronie (Browser pane)**

1. Wejdź w „Eventy dla dzieci", ustaw 8 dzieci + 4 dorosłych + datę + godzinę mieszczącą się w godzinach otwarcia testowej restauracji.
2. Krok 1/2: potwierdź, że lista pokazuje **tylko** pozycje z `forKids`/`acceptsKids` — reszta niewidoczna.
3. Otwórz profil restauracji: chip „Przyjazna dzieciom", pakiety z etykietą „/dziecko", pakiet bez ceny pokazuje „cena do ustalenia", przypis o torcie widoczny.
4. Wybierz pakiet **z ceną** → krok 3: kwota = (cena pakietu + `pricePerPerson` warsztatu) × 8. Zmień liczbę dorosłych na inną (wróć do ekranu startowego przez „Wstecz" do kroku 1 i historię) — kwota się nie zmienia.
5. Wybierz pakiet **bez ceny** → pasek nawigacji i krok 3 pokazują „Cenę ustalisz bezpośrednio z restauracją", żadnej kwoty.
6. Zmień datę/godzinę na poza godzinami otwarcia testowej restauracji → restauracja znika z listy w kroku 2 (filtr godzin działa tak samo jak w trybie dorosłych).
7. Wyślij testowe zapytanie (jak w poprzednich testach tej funkcji w tym projekcie — wyraźnie oznaczone „TEST", użyj maila Joanny jako klienta). Potwierdź, że mail do artysty/restauracji/właścicielki zawiera liczbę dzieci, dorosłych, nazwę pakietu i kwotę (lub „do ustalenia").
8. **Regresja:** przejdź cały kreator w trybie klienta (dorośli), od ekranu głównego do wysłania zapytania — musi wyglądać i działać dokładnie jak przed całą tą serią zmian. Sprawdź też widok „Współpraca" bez zmian.

- [ ] **Step 3: Podsumuj wynik testu Joannie, zamknij zadanie**

Jeśli wszystko działa: zaktualizuj pamięć projektu (`project_kawiarniani_artysci_site.md`, `project_google_sheets_cms.md`) o nowy tryb, nowe kolumny i fakt, że UI dla eventów dziecięcych jest już częścią produkcyjnego kodu (nie tylko dane w tle jak wcześniej).
