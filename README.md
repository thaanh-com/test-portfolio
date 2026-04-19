# thaanh.com — dynamisches Portfolio

Statische Website (GitHub Pages) mit einem kleinen Build-Schritt.
Inhalte (Bilder, Videos, Texte) pflegst du nur noch als **Dateien in Ordnern**.
Das Layout, das CSS und die Struktur bleiben 1:1 wie im ursprünglichen Webflow-Export.

---

## Wie es funktioniert (in 3 Sätzen)

1. Du legst Dateien nach Konvention in `content/` ab.
2. GitHub Actions baut daraus JSON-Manifeste (`assets/home.json`, `assets/details/<slug>.json`) und pro Detail-Projekt ein `/<slug>/index.html`.
3. Im Browser liest `assets/js/loader.js` die Manifeste und erzeugt exakt das gleiche DOM, das vorher handgeschrieben war — deshalb greift das vorhandene Webflow-CSS ohne Änderungen.

---

## Ordnerstruktur

```
content/
  home/
    about.md                  ← "Über mich"-Block + Links
    08-solanaps/              ← Projekt, Nummer = Reihenfolge (groß = oben)
      meta.md                 ← Titel, Body, Button
      01-hh-l.png
      02-hh-r.png
    07-elqi/
      meta.md
      01-w-xl.png
    ...
  details/
    elqi/                     ← slug = URL (/elqi/)
      meta.md                 ← Titel, Intro, Footer-Body
      01-w.png
      02-h.png
      03-text.md              ← Textblock zwischen Medien
      ...
    solanaps/
      ...
```

Ordnername-Präfix (`08-`, `07-`, …) = **Sortierposition auf der Startseite**.
**Höchste Nummer steht oben.** Um die Reihenfolge zu ändern, Ordner umbenennen (z. B. `09-neuesprojekt/`).

Dateien innerhalb eines Ordners werden **aufsteigend** (01, 02, 03 …) von oben nach unten gerendert.

---

## Dateinamen-Konvention

```
NN-LAYOUT[-SLOT].ext
```

- **NN** = zweistellige Nummer, legt die Reihenfolge innerhalb des Projekts fest (`01`, `02`, …).
- **LAYOUT** = bestimmt, wie das Medium dargestellt wird (siehe Tabelle).
- **SLOT** = nur bei Layouts mit mehreren Spalten (`hh`, `ww`, `qqq`, `hhh`, `hw`). Sagt, wohin das Bild gehört.
- **ext** = `.png`, `.jpg`, `.webp`, `.mp4`, `.webm`, `.md` (für Textblöcke).

Mehrere aufeinanderfolgende Dateien mit **gleichem Layout** werden automatisch **zu einer Sektion** gruppiert. Z. B. `01-hh-l.png` + `02-hh-r.png` ergeben eine zweispaltige Sektion.

### Layout-Vokabular

| Layout     | Darstellung                                      | Slots                      |
| ---------- | ------------------------------------------------ | -------------------------- |
| `w-xl`     | Full-bleed, sehr breit                           | — (ein Medium)             |
| `w`        | Breit, zentriert                                 | — (ein Medium)             |
| `h`        | Hochformat, zentriert                            | — (ein Medium)             |
| `w-16-9`   | 16:9-Container                                   | — (ein Medium)             |
| `hh`       | Zwei Hochformate nebeneinander                   | `l`, `r`                   |
| `hh-small` | Wie `hh`, nur schmaler                           | `l`, `r`                   |
| `ww`       | Zwei Querformate nebeneinander                   | `l`, `r`                   |
| `qqq`      | Drei quadratische Medien nebeneinander           | `1`, `2`, `3`              |
| `hhh`      | Drei Hochformate nebeneinander                   | `1`, `2`, `3`              |
| `hw`       | Hochformat links, rechts entweder ein Quer-Bild oder zwei gestapelte | `l`, `r` **oder** `r-top`, `r-bottom` |

### Beispiele

```
01-w-xl.png                ← großes Einzelbild
01-hh-l.png + 02-hh-r.png  ← zwei Hochformate nebeneinander
01-qqq-1.jpg + 02-qqq-2.jpg + 03-qqq-3.jpg   ← 3er-Reihe
01-hw-l.mp4 + 02-hw-r-top.png + 03-hw-r-bottom.png   ← komplex (L + 2 rechts)
```

### Textblöcke (nur in `details/`)

```
03-text.md
```

Reine Markdown-Datei. Inhalt wird als Absatz zwischen Medien-Sektionen gerendert. Zeilenumbrüche bleiben als `<br>` erhalten.

---

## `meta.md` pro Projekt

Minimales YAML-Frontmatter + Body. Home-Projekte:

```markdown
---
id: solanaps
title: "Sunrise Simulation Device for Sleep Improvement"
button:
  label: "Explore Process"
  href: "/solanaps/"
linkHref: "/solanaps/"
---
2020
Solanaps
Product Design and UI
```

- `linkHref` = optional; wenn gesetzt, werden die Medien-Sektionen klickbar und führen zum Detail-Projekt.
- `button` = optional; externer Link wird mit `newTab: true` in neuem Tab geöffnet.
- Body (unterhalb des zweiten `---`) = Meta-Text, der unter den Medien erscheint.

Detail-Projekte (`details/<slug>/meta.md`):

```markdown
---
title: "elqi"
intro: "elqi is a mental wellness app that uses breathing…"
bodyClass: "body-3"
---
2023
App fostering mental wellbeing
UI and UX

Elqi is an MVP app…
```

- `intro` = Großer Intro-Text oben.
- `bodyClass` = CSS-Klasse für `<body>` (steuert Theme: `body-2`, `body-3`).
- Body = Footer-Text unter den Medien.

### `home/about.md`

```markdown
---
name: Thanh Nguyen
links:
  - { label: Email, href: "mailto:mail@thaanh.com" }
  - { label: LinkedIn, href: "https://…", newTab: true }
---
Digital product designer focusing on UX and UI, …
```

---

## Täglicher Workflow

### Neues Projekt auf der Startseite hinzufügen

1. Lege einen neuen Ordner unter `content/home/` an, Nummer höher als alle bestehenden, z. B. `09-newproject/`.
2. Schreibe `meta.md` (siehe oben).
3. Kopiere Medien mit passenden Namen (`01-w-xl.png`, `02-hh-l.mp4`, …) hinein.
4. Commit + Push. GitHub Actions baut und deployt automatisch.

### Neues Detail-Projekt

1. `content/details/<slug>/` anlegen, wobei `<slug>` die URL wird (`/<slug>/`).
2. `meta.md` + Medien + Textblöcke (`NN-text.md`).
3. In `scripts/build.mjs` muss nichts angepasst werden — das Detail wird automatisch als `/<slug>/index.html` erzeugt.
4. Auf der Startseite verlinken: im Home-Projekt `meta.md` `linkHref: "/<slug>/"` und ggf. `button: { label: "…", href: "/<slug>/" }` setzen.

### Reihenfolge ändern

Ordner auf der Startseite umbenennen (`05-foo` → `09-foo`). Nummern müssen **nicht** lückenlos sein — nur die Sortierung zählt.

### Bild austauschen

Einfach die Datei ersetzen, Dateiname beibehalten. Beim nächsten Build werden die responsive Varianten neu generiert.

---

## Build & Deploy

### Lokal (optional)

```bash
npm ci                 # installiert sharp für responsive Bilder
npm run build          # baut assets/home.json, assets/details/*, assets/content/*
```

Ohne `npm ci` läuft der Build ebenfalls, erzeugt aber keine verkleinerten Bildvarianten — nur eine Kopie des Originals. Für Produktion nutzt GitHub Actions immer `npm ci`.

### GitHub Actions

`.github/workflows/build.yml` läuft automatisch bei jedem Push auf `main`:

1. Node 20 + `npm ci`
2. `npm run build`
3. Upload des gesamten Repos als Pages-Artifact
4. Deploy via `actions/deploy-pages@v4`

Pages-Einstellung: **Settings → Pages → Source = GitHub Actions**.

### Was der Build generiert

```
assets/
  content/home/<ordner>/…   ← kopierte Medien + responsive Varianten
  content/details/<slug>/…  ← dito
  home.json                 ← Manifest für Startseite
  details/
    elqi.json
    solanaps.json
elqi/
  index.html                ← Detail-HTML (aus detail.html-Template)
solanaps/
  index.html
```

Die generierten Dateien sind gitignorierbar, liegen standardmäßig aber im Repo (siehe `.gitignore` — Zeilen sind kommentiert, falls du lieber clean committen willst).

---

## Responsive Bilder

Der Build erzeugt mit [sharp](https://sharp.pixelplumbing.com/) pro Bild Varianten in `[500, 800, 1080, 1600, 2000]` px Breite und schreibt sie als `srcset` in die Manifeste. Der Browser wählt automatisch die passende Größe. Für Videos wird keine Transcodierung gemacht (einfach MP4/WebM einchecken).

---

## Was entfernt wurde

Der ursprüngliche Export enthielt Telegram-Tracking-Skripte mit einem sichtbaren Bot-Token. Diese sind **nicht** in die neue Struktur übernommen. Falls du Tracking zurück willst, füge es explizit in `index.html` bzw. `detail.html` ein — aber bitte nicht mit einem Token im Klartext.

---

## Struktur-Übersicht

```
portfolio-main-5/
├─ index.html                ← Startseite (lädt loader.js)
├─ detail.html               ← Template, wird pro Detail zu <slug>/index.html expandiert
├─ css/                      ← Original-Webflow-CSS (unverändert)
├─ js/webflow.js             ← Original-Webflow-JS (unverändert)
├─ images/, videos/          ← Archiv der Original-Assets (nicht mehr vom Build benutzt)
├─ content/                  ← ★ Deine Inhalte
├─ assets/                   ← Build-Output (home.json, details/, content/, js/loader.js)
├─ scripts/
│   ├─ build.mjs             ← Build: content/ → assets/
│   └─ migrate.mjs           ← einmalige Migration images/+videos/ → content/
├─ .github/workflows/build.yml
└─ package.json
```

---

## Troubleshooting

- **Projekt taucht nicht auf:** Ordnername-Präfix muss `NN-` sein (zweistellig mit Bindestrich).
- **Sektion wird falsch gerendert:** Layout-Suffix prüfen (`hh-l`, nicht `hh_l` o. ä.). Slot-Namen sind fix: `l/r`, `1/2/3`, `r-top/r-bottom`.
- **Bild kommt in voller Größe (kein srcset):** Lokal wurde ohne `sharp` gebaut. In CI ist `sharp` immer verfügbar.
- **Detail-Seite 404:** Nach dem Hinzufügen eines neuen Detail-Projekts muss der Build einmal durchgelaufen sein — das erzeugt erst `/<slug>/index.html`.
