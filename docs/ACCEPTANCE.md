# Goal 0 evidence ledger

Goal remains active. Source implementation alone does not prove gameplay feel. The repository was initially empty (`git ls-tree HEAD` returned no files); this is a new implementation.

## Current verification

- Production build passed after the latest camera/geometry/authority implementation; subsequent edits must be rebuilt before using that result.
- Twelve server/navigation/inventory/SQLite tests passed before the latest visual refinements and starting-points field. Rerun before final acceptance.
- A real production-browser HTTP/WebSocket authority test passed: unauthenticated admin access, invalid references, stale config revisions, cross-origin requests and forged client state were rejected.
- Two end-to-end browser workflows have timed out. Earlier runs reached NPC purchases and inventory; their full gameplay and admin paths are not accepted. Recent changes address renderer scheduling/cost and the test's separate admin session. A passing rerun is required.
- `evidence/aurelia.png` is an actual rendered town capture from a browser run, but it is not proof of the full slice. It must be refreshed after visual changes. Do not treat screenshot existence as proof of camera feel or correct farming/combat.

## Required gates

| Requirement | Authoritative evidence to obtain | Current status |
| --- | --- | --- |
| Aurelia playable; one exit; compact scale | Browser walk from spawn through gate to Greenfields, town screenshot | Implemented; full browser path pending |
| Classic camera and readable Vanguard/monsters/loot | Fresh default/zoom-limit town, both spots and loot screenshots; reliable classic reference comparison | Iterating; not accepted |
| Point/click, repeated destination, path obstacles, exact stop | Navigation tests and actual browser clicks | Unit verified; browser pending |
| Reliable targeting and automatic approach | Target ID/range assertions, visible selection and actual clicks | Unit verified; browser pending |
| Normal + strong + AoE timing and mana | Server timing/range/area tests and browser impacts | Unit verified; browser pending |
| Two types and all five animation states | Browser capture of original Sproutling/Forest Wolf states | Implemented; visual states pending |
| Intentional fixed spots and respawn | Server homes/counts/respawn tests and browser respawn | Unit verified; browser pending |
| XP, level-up, five points and assignment | Server progression assertions and character panel browser action | Unit verified; browser pending |
| All physical drops; ownership/public transition | Deterministic drops and two-player ownership test; loot screenshot/clicks | Unit verified; browser pending |
| Crowns purchases and rare Éter | Currency award/drop tests and browser collection | Unit verified; browser pending |
| Variable-size grid, drag/drop and equip/unequip | Occupancy/swap tests and actual DOM drag/equip | Unit verified; browser workflow incomplete |
| Character derived stats and equipment durability | Server stat/equipment/repair tests and character panel | Unit verified; browser pending |
| Brom weapon/repair; Lyra health/mana | Server shop distance/funds/stock/cost tests; both browser shops | Units verified; purchases observed; full browser pending |
| Account/character persistence of all requested fields | SQLite close/reopen test and different-context registered login | SQLite verified; browser login pending |
| NPC CRUD/duplicate/toggle and every field | Structured admin browser workflow and persisted document | Implemented; browser pending |
| Monster CRUD and balance/drop fields | Structured admin actions and persisted document | Implemented; browser pending |
| Spot CRUD/toggle/map/ref/coordinates | Structured admin actions, map click and spawned count | Implemented; browser pending |
| Drop rows/chances/amounts/restrictions/toggles | Structured row edits and server document/deterministic rolls | Implemented; unit validation verified; browser pending |
| Item fields/properties/requirements/footprints | Structured edits and validation plus equip/grid rules | Implemented; unit rules verified; browser pending |
| Shop assignments/price/order/category | Structured nested row edits and server purchase | Implemented; purchase rules verified; browser pending |
| Class starting stats/points/HP/mana/scaling/weapon | Structured edits and server derivation | Implemented; latest starting-points test pending |
| Balance XP/points/Crowns/Éter/ownership/speed/death | Structured edits and server behavior | Implemented; browser pending |
| Map spawn/NPC/spot/safe bounds/landmarks, visual place/move | Structured and top-down editor; persisted coordinates and client update | Implemented; browser pending |
| Validation rejects all invalid admin input without mutation | Unit validator and authenticated HTTP rejection tests | Covered for tested invalid classes; final full pass pending |
| Server authority for every requested subsystem | Strict protocol tests, shop/bag/equip/loot tests, real WS forgery test | Tested server rules verified; final full pass pending |
| Production build, automated tests, browser tests | All commands green against final source | Build and units previously green; browser not green |
| Performance | Warmed-up renderer measurements on town and spots; no console errors | Unproven; renderer optimization in progress |
| No scope expansion and original content | Content defaults and asset provenance inspection | One map/class, two NPCs/types; no forbidden gameplay implemented |

Completion requires every gate, including visual feel, to be satisfied. Do not replace this ledger with a smaller definition of success. The completion report must include camera settings, scale, timing, spot config, admin capabilities, architecture, tests, performance, remaining visual limits and exact local run commands.
