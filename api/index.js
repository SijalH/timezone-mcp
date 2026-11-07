// Vercel entrypoint: reuses the same web-standard fetch handler as the Cloudflare Worker.
import worker from "../src/worker.js";

export default worker;
