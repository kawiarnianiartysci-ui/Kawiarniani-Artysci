# 📍 MAPA PLATFORMY KAWIARNIANI ARTYŚCI — Gdzie wszystko jest

**Dokument aktualizowany: 2026-08-28**  
**Cel:** Backup informacji, dostęp dla innych developerów, disaster recovery

---

## 🗂️ STRUKTURA KATALOGÓW

```
C:\Users\cybjo\OneDrive\Pulpit\BIZNES\ważne informacje dla powstania wyszukiwarki z eventami i restauracjami\kody na vercel
│
├── repo/                          ← GŁÓWNY KOD PLATFORMY (Git repository)
│   ├── src/
│   │   └── App.jsx               ← CAŁA APLIKACJA (React SPA, 2300+ linii)
│   │
│   ├── api/                      ← BACKEND (Vercel serverless functions)
│   │   ├── inquiry.js            ← Formularz zgłoszenia → email
│   │   ├── respond.js            ← Link artysty (accept/decline)
│   │   ├── confirm.js            ← Link restauracji (confirm/cancel)
│   │   └── _shared.js            ← Zmienne, szablony, funkcje wspólne
│   │
│   ├── public/                   ← STATYCZNE PLIKI
│   │   ├── images/               ← Wszystkie zdjęcia (42.3MB → 8.5MB optimized)
│   │   ├── fonts/                ← Self-hosted webfont
│   │   ├── robots.txt            ← ✅ SEO (2026-08-28)
│   │   └── sitemap.xml           ← ✅ SEO (2026-08-28)
│   │
│   ├── docs/                     ← DOKUMENTACJA
│   │   └── superpowers/          ← Spec dla "Eventy dla dzieci" feature
│   │
│   ├── .claude/                  ← CLAUDE CODE CONFIG
│   │   ├── launch.json           ← Dev server config
│   │   └── settings.json         ← Hooks, permissions, preferences
│   │
│   ├── .git/                     ← GIT REPOSITORY
│   │   └── config                ← GitHub remote: kawiarnianiartysci-ui/Kawiarniani-Artysci
│   │
│   ├── README.md                 ← 📖 GŁÓWNA DOKUMENTACJA (SEO update 2026-08-28)
│   ├── CONTRIBUTING.md           ← 📖 CONVENTIONS & GOTCHAS
│   ├── package.json              ← NPM dependencies
│   └── vite.config.js            ← Vite build config
│
├── memory/                        ← CLAUDE MEMORY (persistentne notatki między sesjami)
│   ├── MEMORY.md                 ← INDEX wszystkich memory plików
│   ├── project_kawiarniani_artysci_site.md
│   ├── project_launch_qa_2026_08_22.md
│   ├── project_image_optimization_2026_08.md
│   ├── project_kids_events_mode.md
│   ├── project_google_sheets_cms.md
│   ├── project_apps_script_automation.md
│   ├── project_client_wizard_flow.md
│   ├── project_own_place_path.md
│   ├── project_artist_propose_dates.md
│   ├── project_concurrent_sessions.md
│   ├── project_seo_implementation_2026_08_12.md
│   ├── project_seo_status_2026_08_28.md          ← ✅ NOWY (2026-08-28)
│   ├── feedback_joanna_working_style.md
│   ├── feedback_ui_design_language.md
│   ├── feedback_deploy_verification_workflow.md
│   ├── reference_canva_connection.md
│   └── [inne memory pliki...]
│
├── recovery-codes.txt            ← ⚠️ BEZPIECZEŃSTWO (GitHub/account recovery)
│
└── DOKUMENTACJA_PLATFORMY_BACKUP.md  ← TEN PLIK (do udostępniania)
```

---

## 📍 LOKALIZACJE PLIKÓW — Przybliżenia

### 1️⃣ KOD ŹRÓDŁOWY (GitHub + Lokale)

| Co | Gdzie | Dostęp |
|---|---|---|
| **GitHub repo** | https://github.com/kawiarnianiartysci-ui/Kawiarniani-Artysci | ✅ Public (read), Private push (main branch) |
| **Gałąź główna** | `main` — auto-deploy na Vercel | ✅ Read + Push (z GitHub auth) |
| **Lokalna kopia** | `C:\Users\cybjo\...\kody na vercel\repo\` | ✅ Full access (RW) |
| **.git folder** | `repo/.git/config` → remote URL | ✅ Git credentials cached |

**BACKUP:** Cały folder `repo/` jest w OneDrive (auto-sync), więc zawsze masz kopię.

---

### 2️⃣ DOKUMENTACJA NA STRONIE

| Plik | Zawartość | Aktualizacja |
|---|---|---|
| **README.md** | Opis, tech stack, getting started, **SEO status** | 2026-08-28 ✅ |
| **CONTRIBUTING.md** | Conventions, data model, Google Sheets, gotchas | 2026-08-22 |
| **docs/superpowers/** | Spec dla kids mode feature | 2026-08-07 |

👉 **Dostęp dla dewelopera:** Otwiera repo → czyta README → rozumie architekturę

---

### 3️⃣ DANE PLATFORMY (Google Sheets CMS)

| Co | Link | Edycja | Backup |
|---|---|---|---|
| **Restauracje** | [Google Sheet - Tab: Restaurants](https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/edit#gid=563383430) | Joanna + Forms automation | CSV export co tydzień |
| **Warsztaty** | [Google Sheet - Tab: Workshops](https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-im-saKt9v_ANh2m42skFGZrBDRhckh5OjESFVhAk6vPcAg5M8m20xAB3RTAqlRsizOa_9ken2t_/edit#gid=273766010) | Joanna + Forms automation | CSV export co tydzień |
| **Google Forms** (Artists) | [Form link w sheet](https://docs.google.com/forms/...) | Joanna/Artists | Apps Script auto-populates |
| **Google Forms** (Restaurants) | [Form link w sheet](https://docs.google.com/forms/...) | Joanna/Restaurants | Apps Script auto-populates |

**Konfiguracja w kodzie:**
```javascript
// src/App.jsx — linie 60-61
const CSV_RESTAURANTS_URL = "https://docs.google.com/spreadsheets/d/...";
const CSV_WORKSHOPS_URL = "https://docs.google.com/spreadsheets/d/...";
```

⚠️ **WAŻNE:** Jeśli zmienisz Sheet, musisz zaktualizować te URL'e w kodzie!

---

### 4️⃣ EMAIL & BACKEND (Vercel Functions)

| Funkcja | Plik | Co robi | Env vars |
|---|---|---|---|
| **inquiry** | `api/inquiry.js` | POST: klient wysyła formularz | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OWNER_EMAIL`, `SITE_URL` |
| **respond** | `api/respond.js` | GET: artysta klika accept/decline | `INQUIRY_SIGNING_SECRET` |
| **confirm** | `api/confirm.js` | GET: restauracja klika confirm | `INQUIRY_SIGNING_SECRET` |

**Email sender:** `zapytania@kawiarnianiartysci.pl` (Resend)

---

### 5️⃣ SEKRETNE ZMIENNE (Environment Variables)

⚠️ **BRAK w repo (GitHub) — wszystkie na Vercel Dashboard!**

| Zmienna | Wartość | Gdzie | Dostęp |
|---|---|---|---|
| `RESEND_API_KEY` | Klucz API Resend | Vercel → Project Settings → Environment | 🔒 Joanna |
| `RESEND_FROM_EMAIL` | `zapytania@kawiarnianiartysci.pl` | Vercel → Project Settings | 🔒 Joanna |
| `INQUIRY_SIGNING_SECRET` | HMAC secret | Vercel → Project Settings | 🔒 Joanna |
| `OWNER_EMAIL` | `cybjoa@gmail.com` | Vercel → Project Settings | 🔒 Joanna |
| `SITE_URL` | `https://www.kawiarnianiartysci.pl` | Vercel → Project Settings | 🔒 Joanna |

**⚠️ WAŻNE:** Te zmienne nigdy nie są w `.env` czy `.env.local` (Git gitignore). Żeby je dodać/zmienić, trzeba dostępu do Vercel Dashboard.

---

### 6️⃣ HOSTING & DEPLOYMENT

| Usługa | URL/Dostęp | Co robi | Owner |
|---|---|---|---|
| **Vercel** | https://vercel.com/kawiarnianiartysci-ui | Hosting + auto-deploy | 🔒 Joanna |
| **Domain DNS** | Hostinger | `kawiarnianiartysci.pl` → Vercel | 🔒 Joanna |
| **Live site** | https://www.kawiarnianiartysci.pl | Production | ✅ Public |
| **Preview deployments** | `*.vercel.app` | Każdy PR/push gets preview | ✅ GitHub auth |

**Jak deploy działa:**
1. Push do `main` na GitHub
2. GitHub webhook → Vercel
3. Vercel buduje i deployu (2-3 minuty)
4. Strona live na https://www.kawiarnianiartysci.pl

---

### 7️⃣ MONITORING & ANALYTICS

| Narzędzie | URL | Co śledzi | Owner |
|---|---|---|---|
| **Google Analytics 4** | https://analytics.google.com | Page views, events, behavior | 🔒 Joanna (ID: G-KCXWSP03Y1) |
| **Google Search Console** | https://search.google.com/search-console | Ranking, clicks, impressions, errors | 🔒 Joanna |
| **Google Business Profile** | https://business.google.com | Local listing | 🔒 Pending verification |
| **Vercel Analytics** | https://vercel.com/kawiarnianiartysci-ui/analytics | Deploy history, build logs | 🔒 Joanna |

---

## 🔑 DOSTĘP — Kim ma co

### Joanna (Site Owner)
- ✅ Edytuj dane w Google Sheets (restauracje, warsztaty)
- ✅ Dostęp do Vercel (deploy, env vars, preview)
- ✅ GitHub push na main (auto-deploy)
- ✅ Dostęp do GSC, GA4, GBP
- ✅ Resend (email) dashboard

### Developer (Nowy)
- ✅ Klonuj repo z GitHub (public read)
- ✅ Czytaj README.md i CONTRIBUTING.md
- ✅ Lokalny `npm run dev` (bez env vars, niektóre funkcje Limited)
- ✅ Czytaj memory pliki na GitHub (notatki między sesjami)
- ❌ Push do main (wymaga code review + Joanna approval)
- ❌ Zmiana env vars (wymaga Vercel dostęp)

### Alternatywny LLM (np. ChatGPT, inny dev)
- ✅ Plik: `DOKUMENTACJA_PLATFORMY_BACKUP.md` (ten dokument)
- ✅ GitHub repo link
- ✅ README.md + CONTRIBUTING.md
- ✅ memory/ folder (historia decyzji)
- ✅ Recovery codes (jeśli konto zostało locked)
- ❌ Env vars (trzeba pytać Joannę)

---

## 🚨 DISASTER RECOVERY CHECKLIST

### Jeśli Joanna straci dostęp do GitHub:

```
1. Recovery codes: C:\Users\cybjo\...\recovery-codes.txt
2. Zaloguj się do GitHub z recovery codes
3. Wygeneruj nowy SSH key
4. Dodaj key do GitHub account
5. Push changes z lokalnego repo
```

### Jeśli developer musi przejąć projekt:

```
1. Klonuj: git clone https://github.com/kawiarnianiartysci-ui/Kawiarniani-Artysci.git
2. Przeczytaj: README.md + CONTRIBUTING.md
3. Czytaj memory/ pliki (historia decyzji)
4. Pytaj Joannę o Vercel access (env vars, deployment)
5. Pytaj o Google Sheets access (restauracje, warsztaty)
6. Setup: npm install && npm run dev
```

### Jeśli tracisz dostęp do Vercel:

```
1. Zaloguj się na Vercel z GitHub account
2. Przywróć dostęp do projektu kawiarnianiartysci-ui
3. Regeneruj env vars z bezpiecznych zapisów
4. Trigger manual deploy (push dummy commit)
```

---

## 📦 KOMPLETNY BACKUP PLATFORMY

### Co zawiera:
- ✅ Kod (GitHub repo)
- ✅ Dokumentacja (README, CONTRIBUTING, memory/)
- ✅ Konfiguracja (vite.config.js, package.json, launch.json)
- ✅ Dane (Google Sheets URL w kodzie)
- ⚠️ Env vars (NIE w backup — tylko na Vercel Dashboard)

### Gdzie backup jest:
1. **GitHub** — cały kod (https://github.com/kawiarnianiartysci-ui/...)
2. **OneDrive** — lokalna kopia (`C:\Users\cybjo\...\kody na vercel\repo\`)
3. **Vercel** — live hosting + build history

### Jak zrobić ręczny backup:
```bash
# Backup repo
zip -r kawiarniani-artysci-backup-2026-08-28.zip repo/

# Lub po prostu: Git clone jest backup
git clone https://github.com/kawiarnianiartysci-ui/Kawiarniani-Artysci.git backup-2026-08-28
```

---

## 📞 KONTAKTY & LINKI

| Osoba/Usługa | Kontakt | Dostęp |
|---|---|---|
| **Joanna** (Site Owner) | cybjoa@gmail.com | GitHub, Vercel, Google Workspace |
| **GitHub** | https://github.com/kawiarnianiartysci-ui | Push na main (auto-deploy) |
| **Vercel** | https://vercel.com/kawiarnianiartysci-ui | Hosting, env vars, preview |
| **Resend** | https://resend.com | Email API |
| **Google Sheets** | Link w App.jsx (linie 60-61) | Restauracje + Warsztaty |
| **Domain DNS** | Hostinger | `kawiarnianiartysci.pl` → Vercel |

---

## ✅ CHECKLIST DLA NOWEGO DEVELOPERA

```
☐ Klonuję repo z GitHub
☐ Czytam README.md
☐ Czytam CONTRIBUTING.md
☐ Czytam memory/MEMORY.md (historia)
☐ Instalkuję: npm install
☐ Uruchamiam dev: npm run dev
☐ Wchodzę na localhost:5173 (strona działa?)
☐ Pytam Joannę o Vercel access (dla env vars)
☐ Czytam GitHub Issues (jeśli są)
☐ Szukam w memory/ pliku dotyczącym mojego zadania
☐ Zaczynam kodować!
```

---

## 📝 OSTATNIA AKTUALIZACJA

- **Dokument:** 2026-08-28 (tę sesję)
- **SEO:** robots.txt + sitemap.xml dodane
- **Dokumentacja:** README.md updated
- **Memory:** project_seo_status_2026_08_28.md dodany

**Następna aktualizacja:** Po wdrożeniu backlinków (2026-09-??)

---

**🔒 WAŻNE:** Ten dokument zawiera publiczne linki i opisy. Nie udostępniaj Recovery Codes ani Env Vars osobom trzecim!
