# Tracksling Electron

Tracksling is a desktop workspace app built with Electron.
It helps users organize boards with widgets and editable tables, while keeping data locally on their machine.

## What this project is for

This project is designed for lightweight personal/team tracking:
- create multiple boards
- visualize key metrics with widget cards (donut/line/number styles)
- manage structured table data (rows, columns, cells)
- customize the app look and effects

All data is stored locally in JSON inside Electron's user data folder.

## Tech stack

- Electron
- Vanilla JavaScript
- HTML/CSS
- IPC bridge via `preload.js` (context isolation enabled)

## Run the app

```bash
cd electron-app
npm install
npm run start
```

## Current features

- Board management
	- create board from a modal (name, description, optional custom colors)
	- select and delete boards
	- edit board name and board frame colors
- Widget management
	- add widgets from presets
	- reorder widgets with drag-and-drop
	- right-click context menu (rename/delete)
	- graphical rendering in cards and preview (donut/line/number)
- Table management
	- add/delete columns and rows
	- edit cell values
	- rename/delete rows and columns
- Data and portability
	- import/export JSON
	- local persistence across app restarts
- App personalization
	- theme presets (light/dark/neon/pastel)
	- optional GIF background
	- optional visual effects (rain/flowers)
	- effect placement (background, foreground, or card layers)

## Project structure

- `main.js`: Electron main process, file persistence, IPC handlers
- `preload.js`: secure API exposed to renderer
- `src/index.html`: UI structure
- `src/styles.css`: theme and component styling
- `src/renderer.js`: frontend logic, rendering, interactions

## Notes

- This is an Electron-first version of Tracksling.
- Persistence currently uses JSON; SQLite can be added later if needed.
