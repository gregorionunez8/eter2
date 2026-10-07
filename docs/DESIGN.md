# Goal 0 implementation decisions

The benchmark is MU Online 99b's gameplay feel and ergonomics. The town layout, character/creature models, textures, items, UI, icons and code are original. Do not expand into quests, bosses, extra maps/classes, PvP, trade, party, guilds, crafting, reset or upgrades before all fidelity gates pass.

## Camera and scale

- Orthographic camera, fixed orientation. Offset from player: X=18, Y=22, Z=24. Horizontal azimuth is approximately 36.9 degrees; elevation approximately 35.6 degrees when looking at the 0.5-unit focal height. These are prototype tuning values, not claimed recovered MU constants.
- Default vertical view: 20 world units. Wheel zoom is restricted to 16–25 units, preventing tactical-map zoom.
- Vanguard is approximately 2.1 units tall, with adult proportions and an articulated torso, limbs, head, weapon and original armor silhouette. Buildings are 3.5–4.8 units tall.
- Bounds: X=-26..26, Z=-31..30. Safe town: X=-14..14, Z=7..29. Spawn at (0,17). Palisade and back wall are collidable; the sole wilderness exit passes between the two front wall sections.
- City center to the first spot center is approximately 19.4 units. Vanguard walks at 5.4 units/second; uninterrupted travel takes approximately 3.6 seconds. Buildings require short obstacle detours.
- A* is used only when a straight segment is blocked. Paths are simplified by line-of-sight checks; stops consume the remaining exact distance rather than overshooting.
- Selection uses screen-space volumes around visible actors, rather than tiny triangle hitboxes. Monster labels do not receive pointer events. Obstructing buildings fade when they intersect the sightline to the player.

## Combat timing

Vanguard attack-speed multiplier: 1.05. Server ticks: 30 Hz; snapshots: 15 Hz. A selected target remains selected through approach and repeated attacks; no automatic acquisition of another target is implemented.

| Action | Windup | Recovery | Mana | Range | Radius | Damage multiplier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | 0.26 s | 0.68 s | 0 | 1.65 | 0 | 1.0 |
| Hendidura | 0.35 s | 0.90 s | 8 | 1.90 | 0 | 2.1 |
| Arco de acero | 0.40 s | 1.05 s | 12 | 1.90 | 3.20 | 1.35 |

Windup and recovery are divided by the class attack-speed multiplier. Normal cadence is approximately 0.895 seconds. Impacts validate range again at the hit time. Ground movement/stop cancels an unlanded swing without resetting its cooldown. Mana is spent on initiation. With insufficient mana, combat falls back to normal attacks. Idle, walk, attack, hit and death use articulated animations and server timestamps.

## Spots and progression

| Spot | Creature | Center X,Z | Radius | Count | Respawn | Behavior | XP |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: |
| Claro del brote | Sproutling | -4,-2 | 3.6 | 5 | 7 s | Passive, retaliates | 16 |
| Linde de los lobos | Forest Wolf | 8,-18 | 4.0 | 4 | 10 s | Aggressive, radius 6 | 34 |

Homes are deliberately distributed around each spot, not randomly across the map. Wilderness creatures return to their own spot when leashed and cannot attack inside the safe zone.

XP for the next level is round(45 × level^1.65). The slice caps at level 20; the configuration accepts up to level 500. A level grants five free points. Starting stats, free points, HP, mana, speeds, weapon and stat scaling are configurable. Strength drives damage, Agility defense, Vitality HP and Energy mana.

Loot rolls server-side into physical world entities. Crowns, Éter and inventory items have separate handling. Base Éter probabilities are 0.8% for Sproutling and 1.8% for wolves; the balance field scales these table probabilities relative to the 0.8% baseline. Crowns are much more common. All labels are visible by default and are offset to avoid overlap. Éter has a crystal mesh, restrained emission/light and three subtle drifting particles.

Ownership is exclusive to the killer for 30 seconds, then public. Drops expire after 180 seconds. Both periods are editable. Inventory is 8×8, with rectangle occupancy, 1×1 consumables and a 1×3 sword. Equipment swaps first verify that the outgoing item fits, then change inventory/equipment atomically. Weapon/chest/boots are implemented; the schema reserves the remaining requested slots without adding their gameplay.

## Data and authority

The validated content document contains world/spawn/safe bounds/landmarks/camera, classes, skills, NPCs and shops, monsters, fixed spots, reusable drop tables, item definitions and balance/death rules. Internal IDs link definitions. The editor supports CRUD/duplication/enabling through structured fields; nested tables use individual row controls. Raw JSON is optional and passes the same validator.

Server validation rejects malformed numeric values, duplicates, missing references, impossible/out-of-bounds positions, safe-zone intersecting spots and invalid drop chances. Saved inventory items cannot be orphaned by deletion or footprint/type edits. Vanguard is the only enabled class. Reserved NPC interaction types are schema foundations; only shop and repair execute in Goal 0.

The protocol accepts bounded intentions, not client state. HP, damage, XP, drops, currency, ownership, bag placement, equipment requirements and purchase costs are resolved on the server. WebSockets require a session and a permitted origin; HTTP mutations require JSON and permitted origins. Actions are rate limited. Admin cookies are distinct and HttpOnly. Passwords use salted scrypt hashes. SQLite contains account and character persistence; clients have no state-writing API.

## Rendering and remaining fidelity work

Original raster terrain textures are combined with procedural UV materials and authored compound geometry. Static geometry and rigid pieces of articulated models are batched. Static environment shadows are cached; moving actors use contact shadows. Obstructing buildings fade. The rendering loop leaves a short scheduling gap for input/network tasks. Software GPU detection uses a reduced render pixel ratio and shadow resolution; world simulation, camera, scale and assets stay the same.

Frame-rate targets require measurement on actual hardware. Early FPS averages collected during shader warm-up are insufficient proof. The F3 counter uses actual elapsed frame time. A production/browser pass, fresh screenshots of both spots and loot, and a visual comparison to a reliable classic gameplay reference are still required before completing Goal 0. Generic primitive or toy-like appearance is a failed gate even if the server tests pass.
