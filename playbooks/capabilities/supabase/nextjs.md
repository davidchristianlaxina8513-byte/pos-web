# Supabase with Next.js

> **Web-track (advisory):** pos-app's current baseline is Expo React Native with direct `@supabase/supabase-js` transport in `src/api/*` (see `CONTEXT.md` → Product Decisions). This playbook activates with the planned web migration; until then it is reference only.

## Clients and Proxy

Use `@supabase/ssr` with three responsibilities:

```text
Client Component → browser client
Server Component/Function/Route Handler → cookie-aware server client
Next Proxy → getClaims() + synchronized request/response cookies
```

Proxy refresh keeps cookies current but is not authorization. Every protected server
operation verifies claims and lets RLS enforce row access. Do not trust `getSession()`'s
user object alone on the server. Use `getUser()` only when a fresh Auth user record is
specifically required.

Use PKCE callbacks. Allow only registered origins and validated application-relative
destinations; never redirect to an arbitrary query-string URL. Mark server/admin modules
`server-only`. The admin client is not imported into Client Components.

Repositories under a Next feature may use the authenticated server client when Next owns
the application operation. Preserve the caller's RLS context instead of automatically
switching to a secret client.
