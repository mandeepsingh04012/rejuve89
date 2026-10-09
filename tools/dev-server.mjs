// Local preview of the website WITH the online-order functions (no Netlify account needed).
//   node tools/dev-server.mjs              -> http://localhost:8888
//   POS_SYNC_KEY=<key from POS Admin> PORT=8888 node tools/dev-server.mjs
// Orders are kept in .netlify/local-blobs (deleted with the folder).
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { BlobsServer } from "@netlify/blobs/server";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.PORT || 8888);
const dir = join(ROOT, ".netlify", "local-blobs");
await mkdir(dir, { recursive: true });
const blobs = new BlobsServer({ directory: dir, token: "test", port: 0 });
const { port: bport } = await blobs.start();
process.env.BLOBS_TEST_URL = `http://localhost:${bport}`;
process.env.POS_SYNC_KEY ||= "local-dev-key";

const routes = {};
for (const n of ["ordering", "order", "order-status", "order-paid", "pos-sync", "bill-upload", "bill", "order-qr"]) {
  const mod = await import(join(ROOT, "netlify/functions", `${n}.mjs`));
  routes[mod.config.path] = mod.default;
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let fn = routes[url.pathname], params = {};
  if (!fn) {
    for (const [path, f] of Object.entries(routes)) {
      const m = path.includes("/:") && url.pathname.match(new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"));
      if (m) { fn = f; params = m.groups; break; }
    }
  }
  if (fn) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const out = await fn(request, { ip: req.socket.remoteAddress, params });
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
    return;
  }
  if (url.pathname.startsWith("/netlify/") || url.pathname.startsWith("/tools/") || url.pathname.includes("..")) { res.writeHead(404).end(); return; }
  const file = normalize(join(ROOT, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname)));
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(PORT, "0.0.0.0", () => console.log(`Website + order functions: http://localhost:${PORT}  (POS key: ${process.env.POS_SYNC_KEY === "local-dev-key" ? "local-dev-key" : "from POS_SYNC_KEY"})`));
