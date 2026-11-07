// Shared MCP logic: dependency-free JSON-RPC handler used by both stdio and remote (Worker) entrypoints.

export function validTz(tz) {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function nowIn(tz, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23", weekday: "long", timeZoneName: "longOffset",
  }).formatToParts(date);
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const offset = (g("timeZoneName") || "GMT").replace("GMT", "") || "+00:00";
  const d = `${g("year")}-${g("month")}-${g("day")}`;
  const t = `${g("hour")}:${g("minute")}:${g("second")}`;
  return {
    timezone: tz,
    date: d,
    time: t,
    weekday: g("weekday"),
    utc_offset: offset,
    iso: `${d}T${t}${offset}`,
  };
}

const TOOLS = [
  {
    name: "get_current_time",
    description:
      "Get the real current date and time. Defaults to the user's saved timezone. Use this whenever the answer depends on the actual current date or time.",
    inputSchema: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "Optional IANA timezone for this call only, e.g. 'Asia/Kolkata'. Omit to use the user's default.",
        },
      },
    },
  },
  {
    name: "set_timezone",
    description:
      "Save the user's timezone (IANA name, e.g. 'Asia/Kolkata', 'America/New_York'). Used as the default for get_current_time.",
    inputSchema: {
      type: "object",
      properties: { timezone: { type: "string", description: "IANA timezone name." } },
      required: ["timezone"],
    },
  },
];

const text = (s, isError = false) => ({ content: [{ type: "text", text: s }], isError });

// ctx: { getTz(): string, setTz?(tz): void|Promise, canPersist: boolean }
async function callTool(name, args, ctx) {
  if (name === "get_current_time") {
    const tz = args?.timezone || ctx.getTz();
    if (!validTz(tz)) return text(`Unknown timezone "${tz}". Use an IANA name like Asia/Kolkata.`, true);
    return text(JSON.stringify(nowIn(tz), null, 2));
  }
  if (name === "set_timezone") {
    const tz = args?.timezone;
    if (!validTz(tz)) return text(`Unknown timezone "${tz}". Use an IANA name like Asia/Kolkata.`, true);
    if (!ctx.canPersist) {
      return text(
        `This hosted connector can't store settings. To change your default timezone, open the setup page and generate a new connector URL for "${tz}". For one-off questions, I can still pass the timezone per request.`,
        true
      );
    }
    await ctx.setTz(tz);
    return text(`Timezone saved: ${tz}. Current time there: ${nowIn(tz).iso}`);
  }
  return text(`Unknown tool: ${name}`, true);
}

export async function handleMessage(msg, ctx) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;
  const reply = (result) => ({ jsonrpc: "2.0", id, result });
  const fail = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

  switch (method) {
    case "initialize":
      return reply({
        protocolVersion: params?.protocolVersion || "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "timezone-mcp", version: "1.0.0" },
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call":
      return reply(await callTool(params?.name, params?.arguments, ctx));
    default:
      if (isNotification) return null; // e.g. notifications/initialized
      return fail(-32601, `Method not found: ${method}`);
  }
}
