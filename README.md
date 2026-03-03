# Stratum

> OSS renderer for [Meridia](https://github.com/joshdavisind/meridia) infrastructure diagrams.

Stratum takes a Meridia JSON model and renders it as an interactive diagram using React Flow with ELK.js automatic layout.

```
f(Meridia JSON) → Interactive React Flow Canvas
```

---

## Status

**Pre-release scaffold.** Full implementation is planned. This repository establishes the package namespace, architecture, and contribution surface.

---

## What It Does

- Accepts a valid [Meridia](https://github.com/joshdavisind/meridia) model JSON as input
- Renders nodes and relationships onto a React Flow canvas
- Uses [ELK.js](https://eclipse.dev/elk/) for automatic, deterministic layout
- Supports all Meridia node types, relationship types, and group nesting
- No manual positioning — same input always produces the same diagram

---

## Tech Stack

| Technology | Role |
|------------|------|
| React 19 | UI framework |
| React Flow | Canvas rendering and interaction |
| ELK.js | Automatic graph layout |
| TypeScript | Type safety |

---

## Package

Published (when ready) as **`@gordian/stratum`** on npm.

```bash
npm install @gordian/stratum
```

---

## Usage (planned)

```tsx
import { StratumRenderer } from '@gordian/stratum';
import model from './my-infrastructure.json';

export default function App() {
  return <StratumRenderer model={model} />;
}
```

---

## Meridia Spec

Stratum renders models that conform to the [Meridia v1 specification](https://github.com/joshdavisind/meridia).

---

## Related

- **[Meridia](https://github.com/joshdavisind/meridia)** — the infrastructure diagram standard Stratum renders
- **[Kronum](https://github.com/joshdavisind/kronum)** — companion renderer for Pneuma timeline diagrams
- **[Gaia](https://github.com/joshdavisind/gaia)** — SaaS platform hosting Stratum as a first-class app

---

## License

MIT
