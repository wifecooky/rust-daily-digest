# Rust Daily Digest

Automated, trilingual daily digest for the Rust ecosystem.

Collects articles from 14 sources — Rust official blog, major crate releases, community blogs, and Hacker News — then uses AI to score, filter, and translate into English, Chinese, and Japanese.

Built with [digest-factory](https://github.com/wifecooky/digest-factory).

## Sources

| Category | Sources |
|----------|---------|
| Official | Rust Blog, Rust Releases, This Week in Rust |
| Community | Baby Steps (Niko), fasterthanlime, without.boats, Shuttle, rust-analyzer |
| Ecosystem | Tokio, Bevy, Tauri |
| News | Google News Rust (en/zh/ja), Hacker News |

## Quick Start

```bash
npm install
cd frontend && npm install && cd ..
export OPENAI_API_KEY=sk-...
npm run generate-daily
cd frontend && npm run build && npm run preview
```

## Pipeline

| Command | Description |
|---------|-------------|
| `npm run collect` | Fetch articles from all sources |
| `npm run filter` | AI editorial selection (Rust-focused) |
| `npm run translate` | Translate to en/zh/ja |
| `npm run generate-daily` | Full pipeline |
| `npm run newsletter` | Send via Buttondown |

## Contact

[@wifecooky](https://x.com/wifecooky)
