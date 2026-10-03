# Documentation

The active application is the Next.js web app under `web/`. The former Expo-specific architecture and feature documents were removed during the web-only cutover.

- [`../README.md`](../README.md): setup and features.
- [`../AGENTS.md`](../AGENTS.md): development rules and quality checks.
- [`../CONTEXT.md`](../CONTEXT.md): product boundaries and approved changes.
- [`database.md`](database.md): Supabase table and RPC reference. Treat migrations under `supabase/migrations/` as authoritative.

## Current interface structure

- Admin Reports is the single sales and transaction review destination.
- Cashier Shift and Cash Turnover share the Cashier Operations page for each role; their existing actions, calculations, and authorization remain separate.
- Admin Settings and Cashier Profile provide persisted notification, language, and appearance preferences.
- Light, Dark, and System themes use the existing design tokens and responsive components.
- Daily product quotas remain the only product availability mechanism. Raw ingredient and restock features remain removed.
- A broader visual redesign is intentionally postponed until functional work is complete.
