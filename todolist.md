# GreenLuma Manager To-Do List

## Quick Snapshot
<!-- AUTO-SNAPSHOT:START -->
| Status | Count |
|---|---:|
| Done | 30 |
| In Progress | 3 |
| Planned | 1 |
<!-- AUTO-SNAPSHOT:END -->

<!-- Auto-detected from checklist below. Run: `node update-todolist-snapshot.js` -->

Status markers used below:
- `[DONE]` completed
- `[WIP]` currently in progress
- `[PLAN]` not started yet

---

## Priority Queue (Focus First)
- [ ] `[PLAN]` Migrate all code to React + Vite.
- [ ] `[WIP]` Fix resizer functionality.
- [ ] `[WIP]` Add Settings button.
- [ ] `[WIP]` Generate `.bat` code to Steam path file inside generated code (ECHO).

---

## Completed Work by Area

- [x] Add drag-and-drop from Steam Store and SteamDB pages to add game/DLC into manual.List.

### Core Tasks
- [x] Add pin-to-sidebar functionality and open in full-size tab.

### Manual Input Game List (Header)
- [x] Add popup window with close button.
- [x] Add description tooltip for paste bar (line-by-line hover).
- [x] Paste App ID code into paste bar and split into each code block by spaces.
- [x] Add checker list / OK list at the bottom using the same style as Fetch List / Delete List in Games List.
- [x] Generate DLC if URL ../app/{game_name}__ contains double underscore.
- [x] Auto-generate SteamDB and Steam Store links from App ID.
- [x] Add manual input Game List to the sidebar.

### Search Engine (Steam API / Store)
- [x] Search by App ID to display all DLCs.
- [x] Add popup preview image/website on hover of App ID number.
- [x] Add open-in-new-tab on App ID number (link to Steam Store) with hover tooltip.
- [x] Remove search bar and switch to App ID-only search with DLC listing.

### Download Button
- [x] Export App ID, Name, Type, and Steam Store/SteamDB links to JSON in the download list.

### Games List
- [x] Store list in local storage.
- [x] Load list from local storage on app open.
- [x] Clear selected list items.
- [x] Export Priority, App ID, Name, Type, and Steam Store/SteamDB links to JSON.
- [x] Avoid duplicate App ID when importing list.
- [x] Rearrange multiple selected list items.
- [x] Add search for added game list.
- [x] Add manual type change for selected list.

### Clear Button
- [x] Clear the list.
- [x] Add confirmation dialog before clearing.

### Export / Import
- [x] Export list to JSON file.
- [x] Import list from JSON file.
- [x] Stack imported items into existing list at latest priority.
- [x] Save to local storage after import.

### Generate Button
- [x] Generate filled `.bat` file (Windows) using ECHO {AppID}>{Priority}.txt.
- [x] Generate filled `.txt` files.