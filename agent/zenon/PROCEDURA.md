# Nowi partnerzy — artyści i restauracje (Kawiarniani Artyści)

Procedura ustalona w praktyce przy ~20 artystach i 6 lokalach (sierpień–październik 2026). Kontekst projektu: skill `kawiarniani-artysci` oraz pamięć projektu (MEMORY.md).

## Zasady współpracy z Joanną
- Po polsku, konkretnie. Joanna nie jest programistką: nie tłumacz „jak to zrobić samemu”, tylko podaj **gotową listę: kolumna → dokładna wartość do wpisania** (w blokach kodu / do skopiowania).
- **Ja robię:** zdjęcia (pobranie z Dysku, zmniejszenie, nazwy, commit, push), kadrowanie, kod, weryfikację na żywo. **Ona robi:** wpisy w arkuszu Google (ja mam tylko odczyt — nie mogę edytować arkusza).
- Po publikacji zawsze zrób **kontrolę na stronie** (sekcja C): zdjęcia nieprzycięte i z widocznymi twarzami, linki do udostępniania działają, wszystko chodzi na telefonie i komputerze.
- Zawsze **sprawdź rubryki i czy wszystko jest we właściwych miejscach** (patrz „Kontrola kolumn”). Nie kończ na „wygląda dobrze” — porównaj z surową odpowiedzią z formularza.
- Nie zgaduj uszkodzonych wartości (np. „la8” zamiast „lat”, „2” km). Wypisz je osobno jako „potwierdź w formularzu”.
- Zmiany w kodzie/zdjęcia: `git pull origin main --ff-only` przed edycją, commit na `main`, push (Vercel wdraża sam). Commity kończ linią `Co-Authored-By` z bieżącego system-remindera. Joanna czasem pracuje równolegle na tym samym repo — zawsze pull przed pracą. `git add` tylko konkretnych plików (nigdy `git add .`).

## Gdzie co leży
- Arkusz: „dane na strone o restauracjach i warsztatach”, id `<ID_ARKUSZA_GLOWNEGO>`. Zakładki: `restauracje`, `restauracje - do weryfikacji`, `warsztaty`, `warsztaty - do weryfikacji`, `Blog`.
- **Maile partnerów (od 23.10.2026): NIE w zakładkach live.** Kolumna `email` w `warsztaty`/`restauracje` zostaje **pusta**; adres wpisuje się do osobnego, prywatnego arkusza **„Kawiarniani – kontakty (prywatne)”** (kolumny `id, typ, name, email`; `id` identyczne jak w zakładce live; link do jego CSV jest tylko w zmiennej Vercela `CSV_CONTACTS_URL`). Bez wpisu tam partner **nie dostanie żadnego maila z zapytaniem** (Joanna dostaje wtedy ⚠️ w kopii). Zakładki „do weryfikacji” nie są już publiczne — opublikowane są tylko `restauracje`, `warsztaty`, `Blog`.
- Nowe zgłoszenia: Formularz → skrypt Apps Script (na **formularzu**, nie na arkuszu) dopisuje wiersz do zakładki „do weryfikacji” z `comingSoon=TRUE`. Surowe odpowiedzi: arkusze „Formularz Współpracy – Artyści. (Odpowiedzi)” (id `<ID_ODPOWIEDZI_ARTYSCI>`) i „Formularz współpracy - Restauracje” (id `<ID_ODPOWIEDZI_RESTAURACJE>`).
- Repo: `...\kody na vercel\repo` (GitHub `kawiarnianiartysci-ui/Kawiarniani-Artysci`, branch `main`). Zdjęcia: `public/images/`. Dane: `src/dane.js` (parsery), kod: `src/App.jsx`.
- Zdjęcia: domyślnie z **Dysku Google** (pliki wgrane przez formularz), patrz Krok 4. Zdjęcia spoza formularza (mail, WeTransfer…) Joanna zapisuje w **Downloads** (`$HOME/Downloads`, `ls -lat`, najnowsze na górze).

## Jak odczytać dane (narzędzia się zmieniały)
1. `read_file_content` na dużych arkuszach zwraca dziś tylko **próbkę 2 wierszy** na zakładkę — nie wystarcza do znalezienia nowego wiersza.
2. Działa: `search_files` z `fullText contains '<nazwisko/nazwa>'` + `snippetVerbosity: MAX_ALLOWED` (duży wynik zapisuje się do pliku) → wyciągnij fragment przez `grep -oP` / `dd` (offsety: `grep -abo '# warsztaty - do weryfikacji'`). Sekcje w zrzucie: `# warsztaty - do weryfikacji` … `# warsztaty`. Tą samą metodą znajdziesz **pliki zdjęć** (zwraca `id`, `title`, `fileSize`).
3. Zakładki **żywe** czytaj z opublikowanego CSV (dokładnie, bez zgadywania kolumn): `curl -sS -L --ssl-no-revoke "<CSV_LIVE>?gid=<GID>&single=true&output=csv"` — gid `273766010` = warsztaty, `563383430` = restauracje. Wiersze mają entery w komórkach, więc do analizy użyj parsera CSV w przeglądarce (`mcp__Claude_Browser__javascript_tool`: `fetch` + parser z cudzysłowami, `header.map((h,i)=>({c:h,v:row[i]}))`). Cache Google trwa kilka minut.
4. Przed użyciem przeglądarki: `preview_start` z `url` strony (gdy „No preview is open”).
5. Pliki z `tool-results` czytaj **Bashem** (`/c/Users/cybjo/.claude/projects/...`), PowerShell tej ścieżki nie widzi.

## Inne środowisko (sesja w chmurze / Linux)
Powyższe polecenia zakładają Claude na komputerze Joanny (Windows, PowerShell). Jeśli ich nie ma:
- Zamiast PowerShell `System.Drawing` użyj Pythona z Pillow (`pip install pillow --break-system-packages`): `ImageOps.exif_transpose`, `thumbnail((1200,1200), Image.LANCZOS)`, `save(..., quality=80, optimize=True)`; kadrowanie przez `crop()`.
- `curl` bez `--ssl-no-revoke` (to opcja tylko z Windowsa). Jeśli sieć z powłoki jest zablokowana, pobierz CSV przez przeglądarkę (`fetch` w `javascript_tool`) lub WebFetch.
- Narzędzia przeglądarki mogą mieć prefiks `mcp__remote-devices__Claude_Browser__` zamiast `mcp__Claude_Browser__`.
- Repo i pliki na komputerze Joanny osiągalne tylko przez narzędzia urządzenia (`mcp__remote-devices__…`); bez nich sklonuj repo z GitHuba w obszarze roboczym.

## A. NOWY ARTYSTA (warsztat)

### Krok 1 — znajdź zgłoszenie
Wiersz w `warsztaty - do weryfikacji` (id = slug z nazwy warsztatu) oraz surowa odpowiedź w arkuszu odpowiedzi.

### Krok 2 — kontrola kolumn (ZAWSZE)
Nagłówek **staging** (30 kolumn): `id, comingSoon, name, logo, photo, photos, artist, bio, duration, pricePerPerson, minPeople, maxPeople, description, includes, website, instagram, instagramUrl, facebookUrl, email, requiresSeparateRoom, invoicing, requirements, canInvoice, _dostepnosc, _uwagi, _minMaxOsobSurowyTekst, travelsToClient, travelArea, forKids, kidsMinAge`.
Nagłówek **live** `warsztaty`: `id, comingSoon, name, logo, photo, photos, artist, bio, duration, pricePerPerson, minPeople, maxPeople, description, includes, website, instagram, instagramUrl, facebookUrl, email, requiresSeparateRoom, invoicing, requirements, canInvoice, hours, forKids, kidsMinAge, travelsToClient, travelArea, kidsOnly, slug`.
- Kolumny **1–23 (`id` → `canInvoice`) są w obu zakładkach identyczne** — Joanna może je kopiować hurtowo.
- **Od 24. kolumny kolejność jest inna** → NIE kopiować hurtowo (zrobiła tak raz i artysta zniknął ze strony: `forKids` puste + `kidsOnly=TAK`). Podaj jej ostatnie pola do wpisania ręcznie.
- Porównaj każdą wartość z surową odpowiedzią formularza: czy pole jest we właściwej kolumnie (znany błąd: przesunięcie o 2 kolumny po zmianie skryptu — naprawione 2026-08-25; skrypt musi mieć `HEADERS` zgodne z realnym nagłówkiem arkusza, a `row` zapisane **po jednym elemencie na linię**).

### Krok 3 — lista pól do poprawy / uzupełnienia (podaj Joannie)
- **minPeople / maxPeople**: skrypt zostawia puste; weź z `_minMaxOsobSurowyTekst` (np. „6-15” → 6 i 15). „Bez limitu” → zapytaj albo zostaw puste.
- **pricePerPerson**: skrypt bierze pierwszą liczbę z odpowiedzi — przy wielu cenach / numerowanej liście („1. 100zł 2. …”) wyjdzie złe (np. `1`). System ma **jedną cenę na wpis** → ustal z Joanną (cena reprezentatywna + reszta w opisie albo osobne wpisy). „Od 20 zł” → zapytaj, czy to stała cena.
- **includes**: **średniki, jedna linia, bez entera**. Lista po przecinkach/enterach zlewa się w jeden punkt. Podaj gotowy `A;B;C`.
- **instagramUrl / facebookUrl**: pełny adres z `https://` (bez protokołu link idzie w złe miejsce). Sam handle → `https://www.instagram.com/<handle>/`. Tekst typu „Nie mam” → **wyczyść**. Parametry śledzące (`?igsh=…`, `?stkn=…`) można usunąć.
- **email**: bez zbędnej „@” na początku (to adres, na który idą zapytania). **Wpisz go do prywatnego arkusza kontaktów** (`id` = id warsztatu, `typ` = `warsztat`), a kolumnę `email` w zakładce live zostaw pustą. Kilka adresów → rozdziel przecinkiem.
- **kidsMinAge**: **sama liczba** (strona dopisuje „od … lat”). Tekst typu „Od 6 r. ż.” / „Powyżej 6 lat…” się nie wyświetli → wpisz `6`. Dodatkowe uwagi o dzieciach → do opisu.
- **travelArea**: **sama liczba km** (strona dopisuje „km”; „Dowolnie” da „do Dowolnie km”). Nierealnie małe (np. `2`) → potwierdź w formularzu.
- **description**: puste linie = akapity (karta ma `white-space: pre-line`). Usuń łamania linii **w środku zdań**; zostaw pustą linię między sekcjami (np. przed „2.” przy dwóch warsztatach). Nazwa (`name`) krótka — tytuł ma limit 2 linii, nie dopisuj tam haseł.
- **bio**: usuń uszkodzone znaki (np. `ð¨` zamiast emoji), popraw oczywiste literówki za zgodą.
- **artist**: „Imię Nazwisko / Marka” (ze spacjami wokół „/”).
- **canInvoice** (skrypt: „faktura” → TRUE, „umowa” → FALSE; przy obu opcjach wychodzi TRUE — OK) i **invoicing** — sprawdź zgodność.
- **requiresSeparateRoom**: skrypt zostawia puste → zdecyduj po `requirements` (osobna sala konieczna → TRUE; „preferowana” → puste).
- **hours** (live, 24. kolumna): dostępność artysty w formacie `pon=15:00-21:00;wt=…;sr=;…` (dni: pon,wt,sr,czw,pt,sob,nd; pusty zakres = niedostępny; kilka przedziałów po przecinku). Pusta komórka = bez ograniczeń. **Tekst wolny jest ignorowany.** Zaproponuj konwersję z `_dostepnosc`, zaznaczając przyjęte godziny końca; Joanna zatwierdza.
- **forKids** `TAK`/`NIE`; **kidsOnly** `TAK` tylko dla warsztatów wyłącznie dla dzieci (znikają z „Planuję event”, widoczne w „Eventy dla dzieci”; wymaga `forKids=TAK`). Domyślnie puste.
- **travelsToClient** `Tak` jeśli dojeżdża (warunek ścieżki „Mam miejsce”).
- **slug**: opcjonalny; puste = z `id`. Krótki, małe litery, bez polskich znaków, myślniki; **po publikacji nie zmieniać** (adres profilu/SEO).
- **comingSoon**: `FALSE` gdy ma być widoczny.
- Pytania artysty w `_uwagi` (np. o prowizję) → przypomnij Joannie, żeby odpisała.
- Podaj Joannie jawnie ostatnie pola do wpisania w zakładce live w kolejności: `hours`, `forKids`, `kidsMinAge`, `travelsToClient`, `travelArea`, `kidsOnly`, `slug`.

### Krok 4 — zdjęcia (robi Claude)

**Domyślnie (od 2026-10-15, zatwierdzone przez Joannę): Claude sam pobiera zdjęcia z Dysku Google, zmniejsza je i wgrywa na GitHuba.** Joanna podaje tylko, które zdjęcie jest główne (po obejrzeniu). Gdy zdjęcia przychodzą **poza formularzem** (mail, WeTransfer, Dropbox, link), Joanna da znać — wtedy pobiera je sama do Downloads i obowiązuje tryb ręczny (niżej).

Tryb automatyczny — procedura (przetestowana na prawdziwym pliku: 1536×2048, 433 KB → 900×1200, 180 KB):
1. **Znajdź pliki artysty/lokalu.** W odpowiedzi z formularza kolumny logo / zdjęcia / „Zdjęcie 2/3/4” zawierają linki `drive.google.com/open?id=<ID>`. Szybciej: `search_files` z `fullText contains '<nazwisko>'` — zwraca pliki obrazów z `id`, `title` (np. `IMG_1442 - Imię Nazwisko.jpeg`), `fileSize`. Pliki są współdzielone z kontem kawiarnianiartysci@gmail.com.
2. **Pobierz:** `download_file_content` na każdy `fileId` (wynik to base64; narzędzie zapisuje go do pliku w `tool-results`). Odczyt w Bash: `grep -oP '"content":"\K[^"]*' <plik> | tr -d '\\n' | base64 -d > <scratchpad>/<nazwa>.jpg`; tytuł: `grep -oP '"title":"[^"]*"'`. Pracuj w katalogu scratchpad, nie w repo.
3. **Zmniejsz** w PowerShell (`System.Drawing`): dłuższy bok max **1200 px** (`min(1, 1200/długi bok)` — nigdy nie powiększaj), JPEG jakość **80** (`EncoderParameter Quality = 80L`), `InterpolationMode = HighQualityBicubic`. Cel ~100–250 KB. Logo z przezroczystością zostaw jako PNG (też zmniejsz).
4. **Obejrzyj każde** (`Read` na pliku): sprawdź orientację (zdjęcia z telefonu bywają obrócone przez EXIF — jeśli leży bokiem, obróć), ostrość, brak danych wrażliwych. Zaproponuj okładkę i logo, ale **zapytaj Joannę, które ma być główne**, zanim wgrasz. Pokaż jej krótką listę: plik → proponowana rola.
5. Nazwij i wgraj wg zasad niżej.
   Odrzuć (nie wgrywaj, powiedz Joannie): **zrzuty ekranu czatów/opinii** (cudze imiona i prywatne treści — RODO), **ulotki/plakaty z tekstem** wgrane jako logo lub zdjęcie (nieczytelne na kafelku, często z mailem/telefonem), grafiki wyglądające na generowane AI zamiast zdjęć z prawdziwych zajęć (zasygnalizuj, nie przesądzaj). Zmniejszanie przez `System.Drawing` (nowa bitmapa) usuwa EXIF, w tym GPS z iPhone'a — dobrze.
   Pułapka PowerShell: nazwy zmiennych nie rozróżniają wielkości liter (`$s` nadpisuje `$S`) — używaj np. `$dir` i `$scale`. Na komputerze Joanny nie ma Pythona — CSV parsuj `ConvertFrom-Csv` (plik z `tool-results` najpierw skopiuj Bashem do scratchpada).
6. Cel: **4 zdjęcia w profilu** (okładka powtórzona w `photos` + 3 galerie). Jeśli artysta przysłał mniej niż 3 zdjęcia z warsztatów — poinformuj Joannę, że trzeba dopytać (formularz wymaga min. 3).

Tryb ręczny (zdjęcia spoza formularza): pliki od Joanny są już zmniejszone (~100–200 KB, jpg) i leżą w Downloads — nie kompresuj dalej, tylko kopiuj z `$HOME/Downloads`. Okładka = plik z „główne / na główne / glowne” w nazwie; „logo” = logo.

Nazewnictwo i wgrywanie (oba tryby):
- Nazwy w repo (`public/images/`): `<marka>-logo.<jpg|png>`, `<marka>-photo.jpg` (okładka), `<marka>-gallery-1..3.jpg`. Marka = krótko, małe litery, bez spacji i polskich znaków (np. `strefapasji`, `dzikajagoda`).
- Polecenia: kopiuj/zapisz do `public/images/<marka>-….jpg` → `git pull origin main --ff-only` → `git add public/images/<marka>-*` → commit → `git push origin main`.
- Wartości do arkusza: `logo` = `<marka>-logo.jpg`; `photo` = `<marka>-photo.jpg`; **`photos` = okładka powtórzona na początku + galerie**: `<marka>-photo.jpg,<marka>-gallery-1.jpg,<marka>-gallery-2.jpg,<marka>-gallery-3.jpg` (profil pokazuje tylko `photos`; bez powtórzenia okładki „brakuje jednego zdjęcia”).
- Jeśli Joanna chce, żeby **logo było okładką** bez przycinania: zostaw `photo` **puste** (karta pokazuje wtedy `logo` w trybie „contain”, całe).
- Podwójne rozszerzenie pliku (`.jpg.jpg`) przy ręcznym wgrywaniu to znany błąd.

### Krok 5 — kadrowanie zdjęcia na kafelku (na prośbę)
Kafelek ma ~140 px wysokości i `object-fit: cover`, portretowe zdjęcia są mocno przycinane.
- Przesunięcie kadru dla pojedynczego zdjęcia: wpis w `COVER_POSITION_OVERRIDES` (`src/App.jsx`, klucz = fragment nazwy pliku, wartość np. `"center 40%"`). **Niższy %** = widać więcej **góry** zdjęcia, wyższy % = więcej dołu. „Przesuń w dół” = zmniejsz %. Zmieniaj małymi krokami; po deployu sprawdź `getComputedStyle(img).objectPosition`.
- Gdy trzeba „pokazać więcej X” / „zmniejszyć kadr”: **przytnij plik** w PowerShell (`DrawImage` z prostokąta źródłowego, proporcje ok. 2,5:1, np. 900×350) i zapisz pod tą samą nazwą. Dla grafik z jednolitym tłem (logo) można dodać tło po bokach (kolor piksela z rogu). **Nie** rozszerzaj prawdziwych zdjęć rozmytym tłem — widać szew. Sprawdź wynik wzrokowo (`Read`) przed commitem. Jeśli Joanna mówi „poprzednio było lepiej”, odtwórz wcześniejszy kadr z oryginału.

### Krok 6 — podmiana istniejącego warsztatu (ta sama artystka, nowy warsztat)
Zostaw **ten sam `id` i `slug`** (adres profilu i pozycja w Google), nadpisz zawartość pól w istniejącym wierszu `warsztaty`, a zdjęcia wgraj pod **nowymi nazwami** (np. `<marka>-alchemia-photo.jpg`), żeby nie mieszać ze starymi/cache. Stary wiersz w „do weryfikacji” Joanna może usunąć. Wypisz listę pól, które się zmieniają, i tych, które zostają (logo, email, linki, canInvoice…). Wyczyść resztki ze starego wpisu w polach, które nie są nadpisywane (np. nieaktualne `kidsMinAge`).

### Krok 7 — weryfikacja po „zrobione”
Pobierz żywy CSV (`warsztaty`), sparsuj w przeglądarce i sprawdź wiersz kolumna po kolumnie: pliki zdjęć istnieją w `public/images`, linki z `https://`, `includes` ze średnikami, `forKids/kidsOnly`, `minPeople/maxPeople`, `hours`, `slug`. Wypisz Joannie, co jeszcze zostało.

## B. NOWA RESTAURACJA / KAWIARNIA

### Krok 1 — znajdź zgłoszenie
Wiersz w `restauracje - do weryfikacji` + odpowiedź w „Formularz współpracy - Restauracje”. Zdjęcia: logo + 3–4 zdjęcia wnętrza/ogródka (linki w odpowiedzi).

### Krok 2 — kontrola kolumn (ZAWSZE)
Live `restauracje`: `id, email, comingSoon, name, tagline, logo, photos, vibe, location, description, fullDescription, capacity, minPeople, maxPeople, address, website, instagram, instagramUrl, facebookUrl, hours, variants, hasSeparateRoom, requiresInvoice, acceptsKids, kidsVariants, slug`.
Staging: te same do `kidsVariants`, potem pomocnicze `_pakiet1Raw, _pakiet2Raw, _pakiet3Raw, _uwagi, _maxOsobLacznieRaw, _godzinyRaw, _minDzieciRaw` (nie trafiają na stronę — nie wklejaj ich do `slug`).
- Historyczny błąd: staging nie miał `tagline` → po wklejeniu wszystko od `logo` przesuwało się o 1 (poprawione w skrypcie 2026-08-12, ale **zawsze porównaj wiersz z surową odpowiedzią**, szczególnie `vibe/location/description/fullDescription/capacity`).
- Restauracje nie mają kolumny `photo`: okładka = pierwsze zdjęcie z `photos`.

### Krok 3 — pola do poprawy / uzupełnienia (podaj Joannie)
- **variants** (pakiety dla dorosłych): skrypt **nie parsuje** — surowy tekst w `_pakiet1..3Raw`. Przepisz do formatu: `id|etykieta|opis|cena|cenaMax`, grupy rozdzielone `;`, np. `podstawowy|Podstawowy|napoje: kawa, herbata|40|;rozszerzony|Rozszerzony|tapas + karafka wina|80|;wypasiony|Wypasiony|przystawka, danie, deser|160|` (cenaMax puste lub liczba; w opisie bez znaków `|` i `;`). Zwykle trzy pakiety: podstawowy / rozszerzony / wypasiony.
- **Restauracja tylko dla dzieci**: `variants` **puste** (+ `acceptsKids=TAK`, `kidsVariants` wypełnione) → znika ze ścieżki dla dorosłych, jak Latająca Filiżanka.
- **kidsVariants**: ten sam format co `variants`; pusta cena = „cena do ustalenia”. `acceptsKids` `TAK`/`NIE`.
- **hours** (godziny otwarcia/rezerwacji): `pon=09:00-21:00;wt=…;sr=…;czw=…;pt=…;sob=…;nd=…`; zamknięte = `pon=`; kilka przedziałów po przecinku. Wolny tekst jest ignorowany (brak filtra), ale wpisz poprawnie. Podaj Joannie gotowy ciąg po rozpisaniu z `_godzinyRaw`/odpowiedzi.
- **capacity** tekst „8–30 osób”; **minPeople/maxPeople** liczby (rozbij z odpowiedzi).
- **requiresInvoice** — NIE pochodzi z formularza; Joanna ustawia po rozmowie z lokalem (`TRUE` = lokal nie przyjmie artysty bez faktury B2B → filtruje parowanie). Zapytaj.
- **hasSeparateRoom** `TRUE`/`FALSE` (skrypt zgaduje po „tak/nie” — sprawdź).
- **email**: adres do zapytań od klientów — **wpisz do prywatnego arkusza kontaktów** (`id` = id restauracji, `typ` = `restauracja`), kolumna `email` w zakładce live zostaje pusta. Kilka adresów (np. menadżerka + ogólny lokalu) rozdziel przecinkiem — mail idzie na wszystkie; warto, bo gdy maile czyta jedna osoba, zapytania czekają (Ptasie Radio, 10.2026).
- **tagline**: krótkie hasło (opcjonalne). **vibe**: 1 zdanie na kafelku. **location** `Poznań`. **description** (kafelek) i **fullDescription** (w profilu).
- **address**: ulica, numer, miasto (`;` rozdziela części — w linku mapy zamieniane na przecinek). **website**, **instagram** (`@handle`), **instagramUrl/facebookUrl** pełne `https://…`.
- **slug**: opcjonalny (puste = z `id`), nie zmieniać po publikacji. **comingSoon** `FALSE` gdy publikujemy; wiersz „Wkrótce” wymaga tylko `id, email, comingSoon=TRUE, name`.
- Przy przenoszeniu: wiersz ma tyle samo kolumn co nagłówek live; nic nie wylądowało w pustych kolumnach za `slug`.

### Krok 4 — zdjęcia
Jak u artystów, **z tym samym trybem automatycznym** (pobranie z Dysku z linków w formularzu restauracji → zmniejszenie → wgranie; Joanna wskazuje okładkę; zdjęcia spoza formularza daje sama do Downloads). Nazewnictwo **identyczne jak u artystów**: `<lokal>-logo.png|jpg`, `<lokal>-photo.jpg` (okładka), `<lokal>-gallery-1.jpg`, `-gallery-2.jpg`, `-gallery-3.jpg` (numeracja galerii **zawsze od 1 do 3**). W arkuszu: `logo` oraz `photos` = **4 pliki, okładka pierwsza**: `<lokal>-photo.jpg,<lokal>-gallery-1.jpg,<lokal>-gallery-2.jpg,<lokal>-gallery-3.jpg`. Restauracje nie mają kolumny `photo` — okładka kafelka to po prostu pierwszy plik z `photos`, więc nic się tu nie powtarza (inaczej niż u artystów). Starsze lokale mają nazwy w innym stylu (Ptasie Radio i Lusi: `photo` + `gallery-2..4`; Rojber Pub i Latająca Filiżanka: `gallery-1..4` bez `photo`; Żuk: `gallery-0..4`) — to historia, nazwy plików są dowolne, liczy się tylko, żeby wpis w arkuszu wskazywał istniejące pliki. Nowych nie nazywaj w tamtym stylu. Kadrowanie okładki jak w kroku 5 artystów.

### Krok 5 — weryfikacja
Żywy CSV `restauracje` (gid `563383430`): kolumny, `variants` parsują się (3 grupy z cenami), `hours` poprawna składnia, pliki zdjęć istnieją, restauracja widoczna po wybraniu daty/godziny (nie ginie z listy), tylko-dla-dzieci widoczna wyłącznie w „Eventy dla dzieci”.

## C. KONTROLA NA STRONIE PO PUBLIKACJI (artyści i restauracje — ZAWSZE)

Wykonaj po tym, jak Joanna wklei wiersz do żywej zakładki i opublikuje (`comingSoon=FALSE`) oraz po deployu. Zrób to przeglądarką (`preview_start` z `url` strony → `javascript_tool`; zrzuty ekranu bywają zawodne, więc opieraj się na DOM i na własnoręcznie wyrenderowanych kadrach). Na koniec napisz Joannie krótką listę: co sprawdzone ✔, co poprawione, co wymaga jej decyzji.

1. **Czy pojawia się i działa.** Nowa pozycja jest na liście w „Planuję event” (albo tylko w „Eventy dla dzieci”, jeśli `kidsOnly`/restauracja tylko dla dzieci — i **nie** pojawia się tam, gdzie nie powinna). Kafelek pokazuje nazwę, artystę/lokal, opis, cenę, czas; klik „Zobacz profil” otwiera profil; wybór pozycji i przejście kreatora (krok 1 → 2 → podsumowanie) działa, a pozycja nie znika po wyborze daty/godziny/liczby osób (filtry `hours`, min/max osób, osobna sala, faktura).
2. **Zdjęcia się ładują.** Dla każdego `<img>` pozycji: `naturalWidth > 0` (brak 404, brak literówki w nazwie pliku, brak podwójnego rozszerzenia), profil pokazuje **4 zdjęcia** w galerii (okładka powtórzona w `photos`), logo widoczne na kafelku lub w pasku partnerów.
3. **Linki do udostępniania.** Adres profilu to `https://www.kawiarnianiartysci.pl/warsztaty/<slug>` (artysta) lub `/miejsca/<slug>` (lokal); `slug` = kolumna `slug` albo `id`. Sprawdź: (a) przycisk udostępniania w profilu generuje właśnie ten adres (`SITE_URL + profilePath`), (b) wejście bezpośrednio na ten adres (`navigate`/`curl -I`) otwiera ten profil, a nie stronę główną ani 404, (c) tytuł strony i opis (meta/og) dotyczą tego profilu, (d) po odświeżeniu (F5) na adresie profilu nadal działa. Gdy `slug` jest pusty, adres wynika z `id` — zapisz go Joannie.
4. **Linki w profilu** (Instagram/Facebook/WWW lokalu): mają `https://`, prowadzą we właściwe miejsce, nie ma martwych ani „Nie mam”.
5. **Kadrowanie zdjęć — twarze zawsze widoczne (w miarę możliwości).** Kafelek ma ~140 px wysokości (`object-fit: cover`, szerokość ~360 px → okno ok. 2,5:1), więc portretowe zdjęcie jest ucinane do poziomego pasa. Dla **każdego zdjęcia okładkowego** (i kolejnych miniatur galerii, które są przycinane do 4:3):
   - Obejrzyj plik (`Read`) i znajdź twarze/główny obiekt (ręce z produktem, logo z napisem).
   - **Wyrenderuj symulację kadru** (PowerShell, `System.Drawing`): weź okno o proporcjach kafelka (szerokość całego zdjęcia, wysokość = szerokość/2,5), przesuń je według `object-position` (Y% = `(wysokość − okno) × Y/100` od góry) i obejrzyj wynik. Sprawdź też wariant mobilny (węższy kafelek = niższe okno w pikselach źródła).
   - Jeśli twarz/napis jest ucięty: ustaw `COVER_POSITION_OVERRIDES` w `src/App.jsx` (klucz = fragment nazwy pliku, np. `"center 20%"`; **niższy % = więcej góry**, głowy zwykle w górnej połowie → 15–35%), albo przytnij plik (Krok 5 artystów). Jeśli twarze są rozstawione na całej wysokości i nie mieszczą się w pasie, zaproponuj Joannie **inne zdjęcie na okładkę** (poziome lub z twarzami w jednej linii) zamiast kombinować.
   - Po deployu potwierdź `getComputedStyle(img).objectPosition`.
   - Zasada: **nigdy nie ucinaj głów, oczu ani napisu logo**; produkt/flakon/rękodzieło widoczne w całości, o ile się da. Zdjęcia z ludźmi na plecach/bez twarzy — twarze nie są wymagane, ale unikaj ucięcia w pół ciała.
   - Sprawdź też **galerię w profilu** (siatka 4:3, `object-fit: cover`; rozwinięty widok to `contain`) — twarze w miniaturach nie mogą być ucięte; gdy są, dopisz wpis w `GALLERY_POSITION_OVERRIDES` (`src/App.jsx`, obok `COVER_POSITION_OVERRIDES`, klucz = fragment nazwy pliku, np. `"center 20%"`) — bez zmian w arkuszu. Alternatywnie modyfikator w kolumnie `photos`: `plik.jpg@position=center 20%` (ma pierwszeństwo).
6. **Pasek partnerów i liczniki** na obu stronach głównych („dorośli” i „dzieci”): nowa pozycja jest wliczona, logo w przewijanym pasku nie jest przycięte ani rozciągnięte, liczby „N warsztatów · M miejsc” się zgadzają z liczbą aktywnych wierszy w arkuszu.
7. **Telefon i komputer.** Powtórz punkty 1–5 w widoku mobilnym (`resize_window` preset `mobile`, potem wróć na `desktop`): kafelek, profil, galeria, kreator, brak poziomego przewijania, pasek nawigacji kreatora nie zasłania treści.
8. **Wynik dla Joanny:** wypisz, co jest OK, co poprawiłaś (z nazwą pliku/wartością), a co wymaga jej decyzji (np. zmiana zdjęcia okładkowego, brakujące zdjęcie, pytanie do artysty).

## D. POINFORMUJ NOWEGO PARTNERA, JAK DZIAŁAJĄ ZAPYTANIA (ZAWSZE po publikacji)
Przygotuj Joannie gotową wiadomość do wysłania (ona wysyła sama — Ty nic nie wysyłasz). Sprawdź najpierw w `api/respond.js` i `api/confirm.js`, czy opis nadal zgadza się z kodem.

**Restauracja:**
```
Dzień dobry! Jesteście już widoczni na kawiarnianiartysci.pl. Krótko, jak wyglądają zapytania:
1. Gdy klient wyśle zapytanie, dostaniecie maila informacyjnego — najpierw termin potwierdza artysta.
2. Po potwierdzeniu artysty przyjdzie mail z trzema przyciskami: „Akceptuję datę — rezerwuję”, „Proponuję inny termin”, „Odrzucam”. Prosimy kliknąć od razu — akceptacja oznacza tylko, że termin jest u Was wolny, nie trzeba mieć ustalonego menu ani ceny.
3. Po akceptacji prosimy o kontakt z klientem w ciągu 48 godzin w sprawie menu, ostatecznej ceny i zadatku (30%).
Przy odmowie wybieracie powód z listy — trafi do klienta w uprzejmym mailu (własny dopisek klient zobaczy dosłownie).
Maile wysyłamy automatycznie z adresu zapytania@kawiarnianiartysci.pl. Macie pytanie albo coś się zmieniło? Po prostu odpiszcie na takiego maila albo napiszcie na kawiarnianiartysci@gmail.com — trafi do Joanny. Jeśli maile czyta u Was jedna osoba, możemy wysyłać zapytania na kilka adresów — wystarczy dać znać.
```

**Artysta:**
```
Cześć! Twój warsztat jest już widoczny na kawiarnianiartysci.pl. Jak wyglądają zapytania:
1. Gdy klient wyśle zapytanie, dostaniesz maila z trzema przyciskami: „Mogę — akceptuję”, „Niestety nie mogę”, „Proponuję inne terminy”. Prosimy o szybką odpowiedź.
2. Po Twojej akceptacji restauracja potwierdza, że ma wolny termin — wtedy dostaniesz maila, że data jest ustalona. Sprawy logistyczne (godzina wejścia, ustawienie sali) ustalasz bezpośrednio z restauracją.
3. W ścieżce „Mam miejsce” (dojazd do klienta) po akceptacji odzywasz się bezpośrednio do klienta w ciągu 48 godzin, żeby ustalić szczegóły.
4. Gdy klient nie wybrał miejsca, lokal dobiera Joanna. Wtedy za warsztat rozliczasz się bezpośrednio z klientem (lokal klient opłaca osobno).
Maile wysyłamy automatycznie z adresu zapytania@kawiarnianiartysci.pl. Masz pytanie albo coś się zmieniło? Po prostu odpisz na takiego maila albo napisz na kawiarnianiartysci@gmail.com — trafi do Joanny.
```

## Strona główna
Liczniki „N warsztatów · M miejsc” i przewijane logotypy partnerów sumują **wszystkich aktywnych** (dorośli + dzieci, bez „Wkrótce”) na obu stronach głównych.

## Weryfikacja wdrożenia
Po pushu odczekaj na nowy bundle (`assets/index-*.js` w HTML strony zmienia nazwę; sprawdzaj `curl` w pętli w tle) i sprawdź efekt w przeglądarce (`preview_start`/`navigate`, `javascript_tool`; zrzuty ekranu bywają zawodne — preferuj odczyt DOM/computed style). Joannie zawsze napisz, co zweryfikowano, a czego nie (np. kadr — poproś o rzut oka).