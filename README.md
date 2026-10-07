# Éter — Goal 0

New browser MMORPG fidelity prototype. This repository started empty; no earlier Éter frontend or MU assets/source are used. The scope is one compact town (Aurelia), Vanguard, Brom and Lyra, and one connected wilderness with two original creature models. Goal 0 remains under verification; passing a build is not the visual acceptance gate.

## Run locally

Requires Node.js 24. The server uses Node's built-in SQLite implementation.

```powershell
cd C:\eter2
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. Both the authoritative world server (port 3001) and Vite start together. A guest account is created server-side; the HttpOnly session cookie restores it. Use the account panel to register a username/password or log in from another browser.

For the production client, without Vite:

```powershell
npm.cmd run build
npm.cmd run start
```

Open **http://127.0.0.1:3001**. The server serves `dist/`, HTTP APIs and the WebSocket world from the same origin.

## Controls

- Left click ground: move; a new click replaces the route.
- Click a creature: target, approach and repeat the selected attack until it dies or you cancel.
- 1 / 2 / 3: normal attack, Hendidura, Arco de acero. Right click a creature uses the selected skill, or Hendidura when normal attack was selected.
- Q / W: health / mana potion. Space: approach and pick up nearest eligible loot. Ground labels are also clickable.
- I / C / M / H: inventory / character / map / help. Escape: stop and close panels.
- Drag inventory items to rearrange. Double click to equip or consume; double click an equipment slot to unequip.
- Mouse wheel: bounded zoom. F3: rendering counters.

## Content editor

Open account/settings (gear in the HUD), then **Editor de contenido**. The local server creates an admin key in `.data/admin-token.txt`:

```powershell
Get-Content .data\admin-token.txt
```

This key is distinct from player sessions and is never delivered by the player API. Admin sessions expire after eight hours. The editor has Overview, NPCs, Monsters, Spots, Drops, Items, Shops, Classes, Balance, Map, Players and advanced Raw Config sections. Edit structured fields, then **Validar y aplicar**. The map editor moves the selected spawn/NPC/spot/landmark on click. Config changes are validated and persisted before being broadcast. Applying content restarts spots and clears temporary ground loot. A stale editor revision is rejected.

The default content is in `src/content/default.json`. Once an admin configuration is saved, SQLite holds the effective configuration. Updating the seed file does not overwrite a saved configuration. Export from the editor before experimenting.

## Verification

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Browser tests use port **3101** and a fresh database under the system's temporary directory; they do not touch your `.data` world. Build before running them. Tests exercise the production bundle, not a separate mock client. See `docs/ACCEPTANCE.md` for the evidence and remaining gates.

```powershell
npx.cmd tsx scripts/capture.ts
```

The capture script uses the development URL and stores a screenshot and renderer counters under `docs/evidence/`. Override `ETER_URL` to capture the production URL. Render counters are observations, not a hardware performance guarantee.

## Persistence and configuration

`.data/eter.sqlite` stores accounts, sessions, complete character snapshots and edited content. The server saves every two seconds, on disconnect and on graceful shutdown. Keep the database and its SQLite WAL files together when backing up a running server.

Environment variables: `PORT` (3001), `HOST` (127.0.0.1), `ETER_DATA_DIR` (`.data`), `ETER_ADMIN_TOKEN` (optional override), `ETER_ORIGINS` (comma-separated explicitly permitted origins). Local same-origin use works without extra setup.

`src/client/` renders the world and sends intentions. `server/simulation.ts` validates and resolves movement, combat, XP, loot, ownership, inventory, equipment, currency and purchases. `src/shared/` holds content schemas, protocol and grid/path logic. `server/store.ts` persists only server-owned state. Original asset prompts and provenance are recorded in `docs/ASSETS.md`.
