# Éter — Goal 0 progress

Recorded: 2026-10-07 23:50 UTC / 20:50 America/Buenos_Aires. This is a status handoff, not a completion report. **Goal 0 is incomplete.** The latest browser suite is red; performance and the classic MMORPG visual/feel acceptance gate remain unverified.

## Exact task at this stop

The current task is only to record this state in `PROGRESS.md` and stop, as requested. No new features, gameplay changes, or new test runs are authorized by this status request. Existing finished test output and local process/file state were inspected to make this report accurate.

Immediately before the status request, work was on renderer responsiveness and production-browser verification of the playable slice and structured admin editor. That verification run has now finished, with two failures and one pass. It is no longer a running background task.

## Completed implementation and verified evidence

- This is a new implementation in an initially empty repository. No previous Éter frontend was reused. Original source, authored models, SVG icons, and generated terrain textures are present; asset provenance and exact texture prompts are in `docs/ASSETS.md`.
- Authoritative simulation, intention-only WebSocket protocol, strict action validation, session/origin checks, rate limits, protected admin APIs, optimistic content revisions, and SQLite persistence are implemented.
- Server/navigation/inventory rules are verified by **12/12 automated tests**, including the latest rerun (exit code 0; approximately 69 seconds). Coverage includes invalid content, obstacle navigation, targeting/approach and combat timing, strong/AoE skills, XP/points, physical drops/respawn, 30-second ownership, Crowns/Éter awards, variable-size inventory and atomic equipment swaps, purchases/repair, client-state forgery rejection, monster aggression/leash/safe-zone behavior, death penalties, and SQLite reopening with account/character/config persistence.
- The latest confirmed production build passed TypeScript checking and Vite bundling. Output was approximately 632 KB main JavaScript (166 KB gzip), 120 KB lazy admin JavaScript (36 KB gzip), and 17 KB CSS (5 KB gzip). These are bundle sizes, not frame-rate evidence.
- The latest production-browser HTTP/WebSocket authority workflow passed in about 3 seconds: unauthenticated admin access, invalid references, stale revisions, cross-origin requests, and forged client authority were rejected.
- Latest browser gameplay workflow reached Lyra purchases/potion use, Brom weapon purchase, inventory drag/drop, and double-click equipment swap before failing on movement.
- Latest browser admin workflow progressed through login, NPC creation/duplication/deletion/toggle, negative-HP rejection, monster edit, nested spot/drop/item/shop/class/balance edits, persistence checks, and map placement/save UI. It did not finish the map verification or remaining workflow. These observed steps do not constitute a green end-to-end test.

## Implemented but only partially accepted

The following exist in source, but full browser and visual acceptance is still pending:

- Aurelia: compact safe town, original crystal landmark, spawn, timber/stone buildings, forge, market props, Brom and Lyra, one gated exit to connected Greenfields.
- Vanguard: adult male articulated model, movement, equipment presentation, Strength/Agility/Vitality/Energy, configurable starting stats/free points, derived damage/defense/HP/mana and assignment UI.
- Fixed orthographic camera and bounded wheel zoom; ground click pathing, generous screen-space picking, selection indicator, automatic approach and repeated attacks.
- Normal attack, strong melee and AoE; original Sproutling and Forest Wolf models with idle/move/attack/hit/death animation logic; passive/aggressive behavior and fixed respawning spots.
- XP/level progression, physical item/currency/resource drops, visible loot labels, killer ownership followed by public availability, subtle Éter crystal effects.
- Classic 8×8 inventory with variable footprints and drag/drop; weapon/chest/boots equipment; compact HUD, character panel, shops, repair, guest/account login and persistence.
- Structured admin sections: Overview, NPCs, Monsters, Spots, Drops, Items, Shops, Classes, Balance, Map, Players, and optional Raw Config. Generic structured CRUD/duplicate/enable controls, nested rows, top-down click placement, validation and persisted live updates are implemented. Not every field/action has a completed browser acceptance check.
- Visual refinements: original cobble/meadow textures, asymmetrical building arrangement, building occlusion fade, batched geometry, cached static shadows, actor contact shadows, reduced software-GPU resolution, and RAF scheduling gaps. Their final appearance and responsiveness remain to be measured.

## Known failures, limitations, and blockers

1. **Production gameplay browser test fails at `tests/browser/game.spec.ts:26`.** After inventory/equipment actions, `move(page, 0, 10)` / the following `move(page, 0, 3)` sequence does not reach its requested destination within the helper's 15-second timeout. The stack identifies line 26, which contains both calls; the output alone does not establish which destination failed. Root cause is unconfirmed. Do not assume either navigation or rendering is proven responsible.
2. **Structured admin browser test exceeds its 240-second timeout.** Latest failure is at `tests/browser/game.spec.ts:59`, reading `/api/admin/content` after map placement/save. The request reports the context/browser was closed on timeout. Unlike earlier runs, the editor now opens and many edits succeed. Final moved-coordinate assertions, map screenshot, Players inspection, Raw Config rejection, and final config reset were not reached/completed.
3. Latest full browser suite result: **1 passed, 2 failed, exit code 1, approximately 10.9 minutes**. Failed-run traces, screenshots, and error contexts are under `test-results/`; `.last-run.json` records failure. The build and unit pass do not override these failures.
4. Browser interaction/rendering has been unusually slow. Software rendering/environment load and scene cost remain hypotheses; no reliable warmed-up hardware performance measurement exists. Do not solve this by weakening acceptance assertions or merely raising timeouts.
5. `docs/evidence/initial-render.json` is stale diagnostic output from a no-render capture: FPS 60, drawCalls 0, triangles 0. **It is invalid performance evidence.** It must be replaced with real measurements later. `docs/evidence/aurelia.png` is a real town capture, last written at 20:35:05 local, but town screenshots alone do not prove the full slice or MU-style feel.
6. No final fresh capture of both farming spots, physical loot readability, and all required animation states has been accepted. No reliable MU 99b side-by-side visual reference comparison has been completed. The procedural models/foliage and overall presentation may still fall short of the user's fidelity bar.
7. Dedicated regression coverage for configurable `startingPoints` is not yet added; the field is implemented and the existing 12 tests pass. Saving/reconnecting a dead character, broader accessibility of admin-moved entities, and visual armor changes were noted as potential review areas, not confirmed failing bugs.
8. No external permission/user-input blocker is established. The technical and visual verification failures are the remaining gates. Goal 0 must not be marked complete.

## Exact next unfinished task

When implementation work is explicitly resumed, first diagnose the **line-26 movement timeout** using the latest gameplay trace: establish which destination failed, whether the click reached the world canvas, what intent was sent, and the authoritative player/path state. Inspect existing evidence before starting another long browser run. Then address the confirmed cause and the admin map-stage timeout without expanding scope.

After those failures are resolved, remaining work is:

1. Obtain green production gameplay and structured admin browser workflows, preserving their current acceptance assertions.
2. Verify the remaining browser combat/skills/loot/respawn/stats/repair/account persistence path and final admin map/Players/Raw Config steps; close any uncovered required editor actions.
3. Refresh valid town, Sproutling spot, wolf spot, combat and loot screenshots; compare close camera, player/world scale, compact flow, readable targeting/loot and game HUD with a reliable classic benchmark. Iterate within Goal 0 if presentation still looks like a toy or RTS.
4. Replace invalid performance evidence with warmed-up real renderer measurements, including hardware/software context, and verify console errors and responsiveness.
5. Re-run the appropriate final checks after fixes, reconcile `docs/ACCEPTANCE.md` with the final evidence, and deliver the requested ten-part completion report only once every acceptance gate is satisfied.

## Current background processes/tasks

Read-only process/port inspection at this handoff found the development stack still running:

| Process | PID | State/purpose |
| --- | ---: | --- |
| concurrently | 15028 | Runs world/client development children |
| tsx watch | 13560 | Watches `server/index.ts` |
| authoritative server child | 14928 | Listening on `127.0.0.1:3001` |
| Vite | 10404 | Listening on `127.0.0.1:5173` |

PIDs are observations and can change after restarts. The original development tool session was `28876`; continued operation is supported by the current process/port inspection, not by assuming the old handle is valid.

- Unit-test tool session `15299`: **finished**, exit 0, 12 passed.
- Browser-test tool session `80664`: **finished**, exit 1, 1 passed / 2 failed.
- No project Playwright/Chromium task or test server listening on port 3101 was found during this inspection. No capture job is known to be running. No sub-agents are running.
- No processes were started, stopped, or restarted for this status update. The development stack is left running.

## Commands to continue locally

Node.js 24 is required (uses built-in `node:sqlite`). In PowerShell:

```powershell
cd C:\eter2
# Existing dev stack: open http://127.0.0.1:5173 now.
# Only when dependencies need restoring:
npm.cmd ci
# Only if the existing dev stack has stopped:
npm.cmd run dev
```

Inspect existing failure evidence without running tests:

```powershell
Get-Content test-results\.last-run.json
Get-ChildItem test-results -Recurse -Filter error-context.md
# Substitute the actual trace.zip path listed by this command:
Get-ChildItem test-results -Recurse -Filter trace.zip
npx.cmd playwright show-trace "<actual trace.zip path>"
```

When work resumes and verification is appropriate (not run for this update):

```powershell
npm.cmd test
npm.cmd run build
# Install only if the browser is missing:
npx.cmd playwright install chromium
npm.cmd run test:browser
```

The browser suite launches an isolated production server on port 3101 and a fresh temporary SQLite database; it does not use the development `.data` database. Build before testing; avoid rebuilding `dist/` during an active browser run.

Production locally (stop the development server owning port 3001 first, or choose another port):

```powershell
npm.cmd run build
$env:PORT = '3002'
npm.cmd run start
# Open http://127.0.0.1:3002
```

Admin key and future evidence capture:

```powershell
Get-Content .data\admin-token.txt
# Use the HUD account/settings button, then Editor de contenido.
# Capture performs browser work; run only when resuming verification:
npx.cmd tsx scripts/capture.ts
```

Never publish the admin key. Environment options are `PORT`, `HOST`, `ETER_DATA_DIR`, `ETER_ADMIN_TOKEN`, and `ETER_ORIGINS`. Do not delete the development database to reset test state.

## Architecture and tuning decisions already made

- Three.js renders the client; Node/TypeScript + `ws` runs the authoritative simulation. Server ticks at 30 Hz and broadcasts snapshots at 15 Hz. Client sends bounded intentions and interpolates presentation; it cannot author HP, money, XP, loot or inventory state.
- `src/content/default.json` seeds one validated content document. Zod schemas/references in `src/shared/content.ts` cover world, camera, classes, skills, NPC shops, monsters, spots, drop tables, items and balance. Admin editing uses structured fields, with Raw Config only as an advanced option. Server validation is mandatory; revisions prevent stale overwrites.
- SQLite (`.data/eter.sqlite`, WAL) stores accounts/sessions, full character snapshots and edited config. Passwords use salted scrypt; player/admin sessions are separate HttpOnly cookies. Saves occur every two seconds, on disconnect, and graceful shutdown. Persisted edited config takes precedence over the seed file.
- `server/simulation.ts` owns movement validation, combat, damage, progression, drops/ownership, bag/equipment, currency/resource, purchase and repair logic. `server/store.ts` owns persistence. Shared navigation uses a 0.75-unit A* grid when a straight path is blocked, corner checks and path smoothing; motion consumes exact remaining distance.
- Orthographic fixed camera offset X=18/Y=22/Z=24; default vertical view 20 units, bounded 16–25. Vanguard is about 2.1 units tall; buildings 3.5–4.8. These are prototype tuning values, not recovered proprietary camera constants.
- Safe town X=-14..14/Z=7..29, spawn (0,17); world X=-26..26/Z=-31..30. Sproutling spot (-4,-2), radius 3.6, count 5, respawn 7 seconds. Wolf spot (8,-18), radius 4, count 4, respawn 10 seconds. Only one connected map and one exit.
- Combat normal/strong/AoE windup/recovery: 0.26/0.68, 0.35/0.90, 0.40/1.05 seconds, divided by Vanguard attack-speed multiplier 1.05. Strong costs 8 mana; AoE costs 12, radius 3.2. Server rechecks impact range; movement cancels pending swings without resetting cooldown. Selected targets repeat; no auto-acquisition of the next monster.
- XP curve round(45 × level^1.65), slice maximum 20 (schema supports 500), five free points per level. Starting points are configurable. Loot ownership 30 seconds, lifetime 180; rare Éter table chances default 0.8%/1.8%, scaled by balance. Inventory is 8×8; potion 1×1, sword 1×3, atomic equipment swaps.
- Equipment activates weapon/chest/boots; schema reserves future slots. Reserved NPC interaction types are data foundations; only shop and repair execute. Vanguard is the only enabled class. No parties, guilds, trade, PvP, reset gameplay, crafting, upgrades, quests, bosses, extra maps or additional playable classes were added.
- Renderer batches static geometry/rigid actor parts, caches environmental shadows, uses contact shadows for actors and fades occluding buildings. Admin code is lazy-loaded. Software-GPU fallback lowers pixel ratio/shadow resolution, preserving simulation and camera geometry.
- Documentation exists in `README.md`, `docs/DESIGN.md`, `docs/ACCEPTANCE.md`, and `docs/ASSETS.md`. The acceptance ledger predates the just-collected latest results; this file is the current handoff. All project files remain uncommitted/untracked against initial commit `d1baeaa`; no implementation commit has been made.

Only `PROGRESS.md` was changed for this status request. Work stops after this update.
