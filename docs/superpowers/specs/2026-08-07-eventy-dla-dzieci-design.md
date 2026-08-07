# Eventy dla dzieci — nowy tryb kreatora

**Status:** zatwierdzone przez Joannę (właścicielkę), 2026-08-07. Gotowe do planu wdrożenia.

## Kontekst i cel

Kawiarniani Artyści (`src/App.jsx`, React + Vite, dane z Google Sheets jako CSV, backend zapytań w `api/`) dostaje trzeci tryb, równoległy do istniejącego widoku klienta (`mode === "client"`) i widoku „Współpraca" (`mode === "b2b"`): **„Eventy dla dzieci"** (`mode === "kids"`). To osobny produkt — gotowe pakiety urodzinowe dla dzieci, liczone od dziecka, z własną (częściowo pokrywającą się) pulą lokali i warsztatów.

Pełny brief funkcjonalny od Joanny — patrz historia sesji z 2026-08-07 (temat: „Brief dla Claude Code — nowa zakładka Eventy dla dzieci"). Ten dokument doprecyzowuje **jak** to wdrożyć w istniejącym kodzie, rozstrzyga otwarte pytania z briefu i jest podstawą do planu implementacji.

## Zasada nadrzędna (niezmieniona z briefu)

- Maksymalnie reużywać istniejące komponenty/style/logikę kreatora. Nic nowego od zera, jeśli da się rozszerzyć istniejące.
- Nic nie może się zepsuć w obecnym widoku klienta (dorośli) ani „Współpraca".
- Dane wyłącznie z arkusza (CSV). Brak nowych kolumn u danego lokalu/warsztatu = ta pozycja po prostu nie pokazuje się w trybie dzieci, nie błąd.
- Konwencje wizualne bez zmian: brąz `#432A16` jedyny akcent, Montserrat, aktywny element = cienka ramka, jeden CTA na profilu, wyśrodkowany tekst, puste pola zamiast placeholderów.

## Decyzje rozstrzygające otwarte pytania z briefu

1. **Cena warsztatu „od dziecka" = istniejące `pricePerPerson`.** Bez nowej kolumny `kidsPricePerPerson`, bez zmian w formularzu artysty. (Potwierdzone przez Joannę.)
2. **Wejście do trybu: trzeci przełącznik w nagłówku**, obok „Planuję event" / „Współpraca" — nowy przycisk „Eventy dla dzieci". (Potwierdzone.)
3. **Filtr godzin otwarcia MUSI działać w trybie dzieci** (Joanna to podkreśliła — odwrócenie mojej pierwotnej sugerowanej uproszczonej wersji). Konsekwencja: ekran startowy trybu dzieci dostaje **4 pola filtrów**, nie 3 — Liczba dzieci, Liczba dorosłych, Data, **Godzina** (identyczne `TIME_OPTIONS` co w głównym widoku). Bez pola Godzina filtr godzin nigdy by się nie aktywował (wymaga jednocześnie daty i godziny — patrz `isCompatible` dziś).
4. **Przełączanie tryb klienta ⇄ tryb dzieci zawsze czyści stan kreatora** (`resetToHome()`-równoważny reset: `path`, `wizardStep`, `submitted`, `selectedR/W/Variant`, liczby osób, data/godzina). Zapobiega przeciekaniu wyboru z jednego trybu do drugiego (np. warsztatu bez `forKids=tak` pokazanego jako już wybrany w trybie dzieci). Przełączanie do/z „Współpraca" zostaje bez zmian (już dziś nic nie czyści, bo `b2b` nie czyta tego stanu).
5. **Poprawka `parseVariants`:** pusta cena w komórce (`id|etykieta|opis|` bez liczby) ma dawać `price: null`, nie `price: 0` jak dziś (`Number("") === 0`). Współdzielona funkcja, używana zarówno przez `variants`, jak i nowe `kidsVariants` — bez tej poprawki nie da się odróżnić „darmowe" od „cena do ustalenia". Nie wpływa na istniejące dane (żaden dzisiejszy wariant nie ma pustej ceny).

## Architektura — jeden kreator, trzeci tryb danych

Zamiast osobnego zestawu komponentów, `mode === "kids"` przechodzi jako prop przez te same komponenty, które dziś obsługują `mode === "client"`:

- `PathTiles`, `PickStep`, `ProfileModal`, `Step4ContactForm`, `WizardStickyBar`, `WizardProgressBar` — każdy dostaje prop wskazujący tryb dzieci (nazwa robocza: `kidsMode: boolean`) i przełącza nim: którą pulę pozycji pokazuje, którą listę cenników (`kidsVariants` zamiast `variants`), wzór na cenę, kilka etykiet tekstowych i dodatkowe chipy/przypisy.
- `HomeScreen` (ekran startowy) dostaje wariant renderowania dla trybu dzieci: 4 pola filtrów (Liczba dzieci / Liczba dorosłych / Data / Godzina) zamiast dzisiejszych (Liczba osób / Data / Godzina — pole Miejsce z głównego widoku pomijamy, bo brief go nie wymienia dla trybu dzieci), inne etykiety kafelków startowych („Wybierz warsztat" / „Wybierz miejsce").
- `isCompatible` dostaje analogiczną wersję dla dzieci (patrz niżej) — osobna funkcja `isKidsCompatible(w, r)`, bo kryteria liczebności różnią się jakościowo (konkretna liczba, nie zakres) od dzisiejszej logiki dla dorosłych.

**Dlaczego nie osobne komponenty:** zdublowałoby to układ list/modali/podsumowania (~70% kodu) wbrew zasadzie nadrzędnej „nie budować od zera". Koszt: kilka dodatkowych rozgałęzień `if (kidsMode)` w już dużych komponentach — akceptowalne, bo lokalne i płytkie (dobór listy cenników, dobór wzoru ceny, dodatkowe chipy), nie zmieniają istniejących ścieżek dla `kidsMode === false`.

### Nowy stan w `App()`
```js
const [kidsCount,   setKidsCount]   = useState(null); // null do dotknięcia, potem np. 8 — jak dziś groupSize
const [adultsCount, setAdultsCount] = useState(null); // wyłącznie informacyjne, nie wpływa na cenę ani na filtr workshopu
```
`mode` rozszerza się z `"client" | "b2b"` na `"client" | "b2b" | "kids"`. Istniejące `selectedR`, `selectedW`, `selectedVariant`, `path`, `wizardStep`, `submitted`, `profileItem`, `selectedDate`, `selectedTime` są **reużywane bez zmian nazw** — to nadal ten sam kreator, tylko innym trybem danych zasilany.

`atRoot` (linia decydująca, czy wpis trafia do historii przeglądarki) rozszerza się z `mode === "client"` na `(mode === "client" || mode === "kids") && ...` — reszta bez zmian.

## Dane (CSV → obiekty)

`restaurantFromRow` (dziś `src/App.jsx:149`): dopisać
```js
acceptsKids: toBool(row.acceptsKids) || undefined,
kidsVariants: parseVariants(row.kidsVariants), // ta sama, poprawiona funkcja co variants
```

`workshopFromRow` (dziś `src/App.jsx:168`): dopisać
```js
forKids: toBool(row.forKids) || undefined,
kidsMinAge: toNum(row.kidsMinAge) ?? undefined,
```

`parseVariants` (dziś `src/App.jsx:106`): zmienić `price: Number(price)` na `price: price ? Number(price) : null` — jedna linia, współdzielona.

Brak kolumny w arkuszu = pole `undefined`/`[]`/`null` po parsowaniu = pozycja naturalnie znika z filtrów trybu dzieci (nic dodatkowego do obsłużenia, tak jak dziś działają brakujące pola).

## Logika kompatybilności trybu dzieci — `isKidsCompatible(w, r)`

Wszystkie warunki muszą być spełnione:
1. `w.forKids === true` i `r.acceptsKids === true` i `r.kidsVariants.length > 0`.
2. Jeśli `w.requiresSeparateRoom` → `r.hasSeparateRoom` musi być prawdą (jak dziś).
3. Jeśli `r.requiresInvoice` → `w.canInvoice !== false` (jak dziś).
4. Godziny otwarcia — **identycznie jak dzisiejsza `isCompatible`**: jeśli `selectedDate && selectedTime && r.hours` niepuste, sprawdź dzień tygodnia + `parseDurationHours(w.duration)` względem `r.hours[dayKeyFromDate(selectedDate)]`.
5. Liczebność — inaczej niż w trybie dorosłych (tam: zakresy się przecinają). W trybie dzieci liczymy względem **konkretnej** wpisanej liczby, nie zakresu:
   - jeśli `kidsCount` ustawione i `w.minPeople`/`w.maxPeople` podane → `kidsCount` musi mieścić się w tym zakresie (brak któregoś z pól warsztatu = brak ograniczenia z tej strony);
   - jeśli `kidsCount` i (opcjonalnie) `adultsCount` ustawione i `r.maxPeople` podane → `kidsCount + (adultsCount || 0)` musi być `<= r.maxPeople` (brak `r.maxPeople` = brak ograniczenia). Bez sprawdzania `r.minPeople` dla trybu dzieci (brief tego nie wymienia — dorosłe minimum restauracji nie ma znaczenia dla urodzin dziecka).
   - jeśli `kidsCount` jeszcze nie ustawione (`null`) → nie filtrujemy po liczebności w ogóle (jak dziś przy `groupSize`).

`compatibleRestaurantsKids` / `compatibleWorkshopsKids` — analogiczne do dzisiejszych `compatibleRestaurants`/`compatibleWorkshops`, tylko przez `isKidsCompatible`. Pozycje `comingSoon` widoczne zawsze, niezależnie od kompatybilności (jak dziś).

## Kalkulator ceny

```
kwota = (cena_pakietu_kidsVariant + workshop.pricePerPerson) × kidsCount
```
- `adultsCount` nigdy nie wchodzi do wzoru — czysto informacyjne pole w podsumowaniu i w mailu.
- Gdy `cena_pakietu_kidsVariant === null` („do ustalenia"): **nie liczymy i nie pokazujemy żadnej kwoty** (ani samej ceny warsztatu). W pasku nawigacji i w kroku 3 zamiast kwoty: „Cenę ustalisz bezpośrednio z restauracją."
- Gdy kwota jest liczona: pod nią stały przypis „Kwota orientacyjna. Ostateczną cenę potwierdza restauracja przy ustalaniu menu."

## Komponenty — zmiany punktowo

- **Nagłówek:** trzeci przycisk przełącznika „Eventy dla dzieci" obok „Planuję event"/„Współpraca", ten sam styl (`border-radius:999`, aktywny = wypełnienie `C.primary`). Kliknięcie w „Planuję event" i w „Eventy dla dzieci" wzajemnie wywołuje reset kreatora (patrz decyzja 4 wyżej) — kliknięcie „Współpraca" bez zmian.
- **HomeScreen (wariant `kids`):** 4 pola filtrów (Liczba dzieci / Liczba dorosłych — opisane jako informacyjne / Data / Godzina), dwa kafelki startowe „Wybierz warsztat" / „Wybierz miejsce", sekcja „Jak to działa" reużyta/analogiczna.
- **PickStep:** bez zmian strukturalnych — dostaje po prostu `items` z listy przefiltrowanej dla dzieci (tak jak dziś dostaje `compatibleWorkshops`/`compatibleRestaurants`). `notice` (już dziś obsługuje tablicę linii) dostaje dodatkowe komunikaty specyficzne dla dzieci (osobna sala / godziny — analogicznie do dzisiejszych).
- **ProfileModal:** gdy `kidsMode` i `type === "restaurant"` → pokazuje `kidsVariants` zamiast `variants` jako klikalne wiersze wyboru pakietu, etykieta ceny „/dziecko" zamiast „/os.", pozycje z `price === null` pokazują „cena do ustalenia" zamiast liczby. Nowy chip „Przyjazna dzieciom" (obrysowy, brąz) obok istniejącego „Osobna sala". Chip pojemności z tekstem „Mieści do X osób (dzieci + dorośli)" gdy `maxPeople` podane. Nad CTA: stały przypis „* Tort ustalacie indywidualnie z restauracją." (wpisany na sztywno, nie z arkusza) plus przypis o orientacyjności ceny. Profil warsztatu w trybie dzieci: chip „od X lat" z `kidsMinAge`, jeśli wypełnione — reszta profilu warsztatu bez zmian.
- **Step4ContactForm:** karta podsumowania w trybie dzieci pokazuje: Warsztat, Miejsce, Termin, Liczba dzieci, Liczba dorosłych (informacyjnie), wybrany pakiet dziecięcy, Kwota orientacyjna (lub zdanie „do ustalenia"). Formularz kontaktowy i wysyłka `/api/inquiry` bez zmian strukturalnych — payload dostaje dodatkowe pola (patrz niżej).

## Backend — `api/inquiry.js`

Payload rozszerzony o opcjonalne pola: `isKidsEvent` (bool), `kidsCount`, `adultsCount`, `kidsPackageName`, `kidsAmountLabel` (liczba sformatowana jako string albo `"do ustalenia"`). Wszystkie **domyślnie nieobecne/puste** dla dzisiejszego przepływu dorosłych — zero zmian w istniejącym zachowaniu, kiedy `isKidsEvent` nie jest przekazane.

Trzy szablony maili (do artysty, do restauracji, do właścicielki) dostają dodatkową sekcję (nagłówek typu „🎈 To zapytanie dotyczy urodzin dla dzieci" + listę: liczba dzieci, liczba dorosłych, pakiet, kwota/„do ustalenia") renderowaną warunkowo tylko gdy `isKidsEvent` jest prawdziwe — reszta treści maila bez zmian.

## Miejsca „na dwa fronty"

Jeden wiersz w arkuszu = jedno miejsce. Widoczność w danym trybie wynika wyłącznie z wypełnionych kolumn (ma `variants` → widoczne w trybie klienta; ma `acceptsKids=tak`+`kidsVariants` → widoczne w trybie dzieci; oba → widoczne w obu, z osobną ofertą w każdym). Nic dodatkowego do zaimplementowania — to naturalna konsekwencja tego, że `restaurants`/`workshops` są ładowane raz i filtrowane osobno per tryb.

## Czego nie zmieniamy

Istniejący widok klienta (dorośli), widok „Współpraca", format i odczyt istniejących kolumn (poza jednoliniową poprawką `parseVariants`), kolorystyka/fonty/układ, zasada „jeden CTA".

## Jak sprawdzić, że działa (test na żywych danych)

1. W arkuszu: dla jednego lokalu (Latająca Filiżanka) `acceptsKids=tak` + `kidsVariants` z 3 pakietami (w tym jeden z pustą ceną, żeby sprawdzić „do ustalenia"); dla jednego warsztatu `forKids=tak` + `kidsMinAge`.
2. Wejść w „Eventy dla dzieci", ustawić 8 dzieci + 4 dorosłych + datę + godzinę.
3. Sprawdzić: lista pokazuje tylko pozycje „dla dzieci"; filtr godzin działa (lokal poza godzinami znika); profil pokazuje pakiety dziecięce, chip „Przyjazna dzieciom", przypis o torcie; kwota = (pakiet + warsztat) × 8, zmiana liczby dorosłych nie zmienia kwoty; pakiet bez ceny pokazuje „cena do ustalenia" i „Cenę ustalisz bezpośrednio z restauracją" zamiast kwoty.
4. Wysłać testowe zapytanie, potwierdzić że mail (artysta/restauracja/właścicielka) zawiera liczbę dzieci/dorosłych, nazwę pakietu i kwotę (lub „do ustalenia").
5. Regresja: przejść pełny kreator w trybie klienta (dorośli) od początku do wysyłki — musi wyglądać i działać dokładnie jak dziś.
