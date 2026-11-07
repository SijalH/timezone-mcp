# timezone-mcp

Gives your AI assistant the **real current date and time** in **your** timezone. Two tools only:

- `get_current_time` — date, time, weekday, UTC offset (optional one-off `timezone`)
- `set_timezone` — save your timezone (local mode)

## Local (Claude Desktop, Claude Code, Cursor)

Your timezone is auto-detected from your computer. To change it, just say
"set my timezone to Asia/Kolkata" — it is saved in `~/.timezone-mcp.json`.

Requires Node 18+. Add to your MCP config:

```json
{ "mcpServers": { "timezone": { "command": "npx", "args": ["-y", "github:SijalH/timezone-mcp"] } } }
```

Claude Code: `claude mcp add timezone -- npx -y github:SijalH/timezone-mcp`

## Hosted (claude.ai web and phone)

Open **https://timezone-mcp.vercel.app**, confirm your auto-detected timezone, copy your personal
URL (`https://<host>/mcp?tz=Your/Zone`), and add it under Settings → Connectors →
Add custom connector. The server stores nothing; your timezone lives in your URL.
To change it, generate a new URL (one-off timezones can still be asked in chat).

## Self-hosting the remote server

**Vercel** (sign in with GitHub): import this repo at vercel.com/new and deploy. No settings needed.

**Cloudflare Workers:**

```
npm i -g wrangler
wrangler login
wrangler deploy
```
