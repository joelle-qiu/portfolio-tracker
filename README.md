# Portfolio Tracker

Windows local desktop app for tracking influencer holdings and strategy notes.

## Stack
- Electron + Vite + React + TypeScript
- Tailwind CSS
- Dexie (IndexedDB) for local persistence
- Zustand for app state
- SheetJS (`xlsx`) for Excel parsing
- Recharts for visualization

## Current Features
- Multi-influencer selector with default `八喜`
- Add influencer from UI (`+ 新增博主`)
- Per-influencer snapshot isolation
- Excel import pipeline (`holdings` + parsed analysis fields)
- Industry-aware visual dashboard
- Holdings pyramid (`TOP1 -> TOPN`)
- Theme hit-rate panel with click-to-filter table linkage
- Configurable quote provider (`MOCK` / `REAL`) via env

## Project Structure
- `src/renderer/src/components` UI components
- `src/renderer/src/services` DB, parser, quote providers
- `src/renderer/src/store` Zustand store
- `src/renderer/src/utils` shared matching/mapping helpers
- `src/renderer/src/types` core interfaces

## Run
```bash
npm install
npm run dev
```

## Verify
```bash
npm run typecheck
```

## Notes
- Local DB name: `portfolio-tracker-db`
- Data is stored locally in IndexedDB under Electron renderer context.

# portfolio-tracker

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
