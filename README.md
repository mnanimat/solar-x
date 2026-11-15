# Solar-X: Space Mission Architect

**Play Now:** [https://solarx.mnanimat.xyz](https://solarx.mnanimat.xyz)

Interactive 3D spacecraft design and orbital mission simulator grounded in NASA systems engineering (JPL Concept Maturity Levels 1–4 & CubeSat 101). Built for the NASA Space Apps Challenge by team **Solar-X**.

---

## Core Gameplay Loop

1. **Instant 3D Launch Preview** — Watch liftoff, stage separation, fairing split past the 100 km Kármán line, and satellite deployment while testing live mission presets.
2. **CML 1 · Mission Selection** — Pick NASA-inspired programs across Earth LEO, SSO, Moon, Mars, and Europa (`1/r²` solar irradiance scaling) in **Solo** or **4-Player Team** mode.
3. **CML 2–3 · Modular Assembly** — Configure rocket, spacecraft bus, solar wings, battery, ADCS, thermal shielding, payload instruments, and RF/ground link in interactive 3D / Exploded CAD view.
4. **CML 4 · Real-Time Trade-Off Validation** — Monitor coupled Mass, Budget, Power Margin, Eclipse DoD, and RF Link dB before clearing launch gates or using **Auto-Setup**.
5. **In-Flight Simulation & Debrief** — Fly continuous orbital passes, fire orbital burns, resolve in-flight anomalies, and earn a TMCO post-flight readiness score.

---

## Flight Controls

- **Keyboard:** `WASD` / `Arrows` (Attitude), `Q` / `E` (Roll), `Shift` / `Ctrl` (Prograde / Retrograde), `I` / `K` (Inclination), `P` / `Esc` (Pause)
- **Mouse 3D:** Drag canvas to orbit camera, Scroll to zoom, Drag gold orbital node to reshape altitude & inclination
- **PS4 DualShock 4 / PS5 DualSense:** Left Stick (Attitude), Right Stick (Camera), `R2` / `L2` (Burns with haptics), `D-Pad` (Inclination & Zoom)

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **3D Engine:** Three.js procedural planets, rockets, ascent arcs, and modular spacecraft CAD
- **Physics Engine:** Coupled orbital mechanics, Friis RF link budget, eclipse thermal & battery DoD
- **Deployment:** Vite static bundle deployed to Cloudflare Workers (`wrangler.jsonc`)

---

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Build, Test & Deploy

```bash
npm run lint
npx tsx --test src/engine/*.test.ts
bun run build
npx wrangler deploy
```

---

## Team & Data References

- **Team:** Solar-X Development Team
- **References:** NASA Concept Maturity Levels (CML 1–4), NASA CubeSat 101, NASA BioSentinel / Moon / Mars / Europa mission baselines
