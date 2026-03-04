# (GUMA) GreenLuma Manager — Browser Extension

<p align="center">
  <img width="35%" height="auto" src="https://github.com/achrllrogia45/greenluma-manager-extension/blob/main/icon.png">
</p>
<p align="center">
	<em> Be one of these! </em>
</p>
<p align="center">
  <a href="https://github.com/achrllrogia45/Reaparr/"><img src="https://img.shields.io/github/stars/achrllrogia45/greenluma-manager-extension?style=social"></a>
  <a href="https://github.com/achrllrogia45/"><img src="https://img.shields.io/github/followers/achrllrogia45?style=social"></a>
</p>

<p align="center">
  <a href="https://github.com/achrllrogia45/greenluma-manager-extension/releases/tag/release"><strong>Download (Releases)</strong></a>
  ·
  <a href="https://github.com/achrllrogia45/greenluma-manager-extension/">Repository</a>
</p>

<p align="center">
  <em>
    Build, organize, and export Steam AppID lists (Games & DLC) into GreenLuma-friendly files—now with Side Panel mode,
    Manual Input, drag-and-drop URLs, bulk editing, and fast filters.
  </em>
</p>

---

<p align="center">
	<img width="580" alt="image" src="https://github.com/user-attachments/assets/d1384651-727b-44a5-96c1-def28db16fff" />
</p>


---

## Why GUMA?
GUMA is a lightweight Steam App List helper that focuses on **speed**, **bulk workflows**, and **clean exports**:
- fetch metadata from Steam
- keep lists organized (games & DLC)
- edit/reorder in bulk
- export in formats you can use immediately

---

## Key Features

### 🧩 Pinned Side Panel workspace
- Pin GUMA into your browser **Side Panel** for a larger, persistent UI.
- Remembers whether the window is pinned (`windowPinned`).
<p align="center">
<img width="1178" alt="image" src="https://github.com/user-attachments/assets/772e6ec9-7e76-4458-b8bc-683401ec25af" />
</p>


### ✍️ Manual Input (paste → fetch → save)
- Paste **single or bulk AppIDs**
- Fetch **names + types** from Steam
- Stored locally so your manual list persists
<p align="center">
  <img width="551" alt="image" src="https://github.com/user-attachments/assets/f556f89e-681e-41a7-ad08-1caec00447db" />
</p>


### 🔗 Drag & drop Steam URLs
- Drop links from:
  - Steam Store `https://store.steampowered.com/`
  - SteamDB `https://steamdb.info/`
  - GUMA extracts the **AppID**, adds it to the list, and attempts **DLC detection**.
<p align="center">
 <img width="1119" alt="image" src="https://github.com/user-attachments/assets/d342d84d-2de4-4971-8f09-79b8cbb02dbf" />
</p>


### 🔎 Fast search & filtering
- Live filtering for:
  - **Get App List** results from `https://store.steampowered.com/api`
  - **Steam Store Search** result from `https://store.steampowered.com/search?term=`
  - **Saved Games** list
- Debounced input + **Enter** support
- Clear **empty-state** when no matches exist

### 🧰 Bulk tools
- Multi-select **drag-and-drop reorder** (stack behavior)
- Bulk **type changes** (dropdown)

### 📦 Import / Export
- Import/export lists for backups
- Bulk export AppLists (copy clipboard, `.zip`, `.txt`, `.bat`, etc.)


---

## Installation (Chrome / Edge)
1. Download:
   - **ZIP from repo**: click **Code → Download ZIP**
   - or grab the latest from **Releases**
2. Open Extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the extracted extension folder

---

## Quick Start
1. Open GUMA from the toolbar (or pin it to the Side Panel)
2. Add items using any workflow:
   - Search & fetch from Steam **SteamAPI / Steam Store**
   - Manual Input (paste AppIDs)
   - Drag & drop Steam/SteamDB links
3. Filter, multi-select, reorder, and set types
4. Export your list for GreenLuma

---

## Permissions & Networking
GUMA may request or use:
- **Local storage** — save your lists + UI preferences (e.g., Manual Input window size)
- **Steam endpoints** — fetch metadata (names/types)
- **Side Panel permission (`sidePanel`)** — required for Side Panel mode

> Side Panel availability depends on your Chromium version and extension environment.

---

## Contributing
Contributions are welcome:
- **Bugs:** please include steps to reproduce + screenshots/logs if possible  
  (and bundle minor issues together if you can)
- **Features:** open an issue with your idea and expected behavior
- **PRs:** clean, focused changes are easiest to review

---

## License
Open Source, feel free to use. 
But, mention me plzz..

---

## Disclaimer
Not affiliated with, endorsed by, or sponsored by Steam or Valve Corporation.
