#!/usr/bin/env node
// Local MCP server over stdio. Timezone is auto-detected from the computer,
// and can be overridden by chat ("set my timezone to ...") — saved to ~/.timezone-mcp.json
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { handleMessage, validTz } from "./core.js";

const CONFIG = path.join(os.homedir(), ".timezone-mcp.json");

function readSaved() {
  try {
    const tz = JSON.parse(fs.readFileSync(CONFIG, "utf8")).timezone;
    return validTz(tz) ? tz : null;
  } catch {
    return null;
  }
}

const ctx = {
  canPersist: true,
  getTz: () => readSaved() || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  setTz: (tz) => fs.writeFileSync(CONFIG, JSON.stringify({ timezone: tz }, null, 2)),
};

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n");
    return;
  }
  const out = await handleMessage(msg, ctx);
  if (out) process.stdout.write(JSON.stringify(out) + "\n");
});
