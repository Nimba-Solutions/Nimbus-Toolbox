# Nimbus Toolbox

**Free & open-source launcher and manager for the Cloud Nimbus desktop suite.**

One dashboard to discover, install, launch, and build all Cloud Nimbus tools.

## Managed Tools

| Tool | Description |
|---|---|
| [Bandwidth Governor](https://github.com/Nimba-Solutions/Bandwidth-Governor) | Rate-limit upload/download bandwidth per-app via Windows QoS |
| [Port Pilot](https://github.com/Nimba-Solutions/Port-Pilot) | Visual localhost port manager — see, search, kill |
| [Process Governor](https://github.com/Nimba-Solutions/Process-Governor) | CPU/memory limiter per-app via processor affinity |

## Features

- **Auto-discover** — Scans your projects folders to find installed Cloud Nimbus tools
- **One-click launch** — Start any tool directly from the dashboard
- **Clone & install** — Download tools you don't have yet from GitHub
- **Build .exe** — Build portable executables from source
- **Open folder / terminal** — Quick access to any tool's directory
- **System info** — Shows CPU, memory, and system details at a glance
- **System tray** — Launch any tool from the tray menu
- **Configurable scan paths** — Add custom directories to scan

## Download

Grab the latest portable `.exe` from [Releases](https://github.com/Nimba-Solutions/Nimbus-Toolbox/releases).

No installation required — just run it.

## Requirements

- Windows 10/11
- Git (for cloning tools)
- Node.js + npm (for dev mode and building)

## Build from source

```bash
npm install
npm run build
```

The portable `.exe` appears in `dist/`.

## Development

```bash
npm start
```

## How it works

Nimbus Toolbox scans configurable directories for `package.json` files matching known Cloud Nimbus tool names. It can launch tools via `npx electron .`, install dependencies, build portables, and clone repos from GitHub — all from a single dashboard.

## License

[BSL 1.1](LICENSE.md) — Converts to Apache 2.0 after four years per release.

**Author:** [Cloud Nimbus LLC](https://cloudnimbusllc.com)
