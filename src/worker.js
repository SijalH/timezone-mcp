// Remote MCP server for Cloudflare Workers (free tier) — for claude.ai web/phone.
// Stateless: each person's timezone lives in their own connector URL:  https://<host>/mcp?tz=Asia/Kolkata
// The home page auto-detects the visitor's browser timezone and builds that URL for them.
import { handleMessage, validTz } from "./core.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Timezone connector</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 16px;color:#1a1a1a}
input,button{font:inherit;padding:8px 10px;border:1px solid #bbb;border-radius:6px}
button{cursor:pointer;background:#1a1a1a;color:#fff;border-color:#1a1a1a}
code{display:block;word-break:break-all;background:#f3f3f3;padding:10px;border-radius:6px;margin:8px 0}
@media(prefers-color-scheme:dark){body{background:#151515;color:#eee}code{background:#262626}input{background:#222;color:#eee;border-color:#555}}
</style></head><body>
<h1>Timezone connector</h1>
<p>Gives Claude the real current date and time in <b>your</b> timezone.</p>
<p>Your timezone (auto-detected, editable):</p>
<input id="tz" size="28" list="zones"><datalist id="zones"></datalist>
<h3>Your personal connector URL</h3>
<code id="url"></code>
<button id="copy">Copy URL</button>
<h3>Add it</h3>
<ol><li>claude.ai → Settings → Connectors → Add custom connector</li>
<li>Paste the URL above and save.</li></ol>
<script>
const tz=document.getElementById('tz'),url=document.getElementById('url');
tz.value=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
try{document.getElementById('zones').innerHTML=Intl.supportedValuesOf('timeZone').map(z=>'<option value="'+z+'">').join('')}catch(e){}
const upd=()=>{url.textContent=location.origin+'/mcp?tz='+encodeURIComponent(tz.value)};
tz.addEventListener('input',upd);upd();
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(url.textContent);
</script></body></html>`;

export default {
  async fetch(request) {
    const u = new URL(request.url);
    if (u.pathname === "/" && request.method === "GET") {
      return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (u.pathname === "/mcp") {
      if (request.method !== "POST") return new Response("Use POST", { status: 405 });
      const tzParam = u.searchParams.get("tz");
      const tz = validTz(tzParam) ? tzParam : "UTC";
      const ctx = { canPersist: false, getTz: () => tz };
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
      }
      if (Array.isArray(body)) {
        const outs = (await Promise.all(body.map((m) => handleMessage(m, ctx)))).filter(Boolean);
        return outs.length ? json(outs) : new Response(null, { status: 202 });
      }
      const out = await handleMessage(body, ctx);
      return out ? json(out) : new Response(null, { status: 202 });
    }
    return new Response("Not found", { status: 404 });
  },
};
