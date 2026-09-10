# StudySpace

A frontend-only study workspace built with React, HTML, CSS and JavaScript.

## Features

- Dashboard with dynamic study statistics
- Pomodoro focus / short break / long break timer
- Tasks with deadlines and priorities
- Real study streak + longest streak + 35-day activity heatmap
- Deadline manager
- Subject workspaces with persistent notes and resources
- Bookshelf with reading status
- Marks tracker with calculated percentages and academic overview
- General resource library with search/filter
- Optional Spotify embed URL
- Simple statistics page
- LocalStorage persistence
- Responsive desktop/tablet/mobile layout
- No backend, database, API, Firebase, Express, Python, TypeScript, Tailwind, Bootstrap or external UI library

## Run locally

1. Install Node.js.
2. Open this folder in VS Code.
3. Run:

```bash
npm install
npm run dev
```

4. Open the local URL Vite prints in the terminal.

## Build

```bash
npm run build
```

The production files are created in `dist/`.

## Notes

The Spotify player expects a Spotify playlist/embed URL. StudySpace does not authenticate with Spotify or use the Spotify API.

All app data is stored in the browser's localStorage under `studyspace-v1`.
