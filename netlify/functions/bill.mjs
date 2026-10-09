// GET /bill/<id> -> the bill PDF (opened from the WhatsApp message).
import { store } from "../lib/shared.mjs";

export default async (req, context) => {
  const id = context?.params?.id || new URL(req.url).pathname.split("/").pop();
  if (!/^\d{6}-[0-9a-f]{24}$/.test(id)) return new Response("Bill not found", { status: 404 });
  const hit = await store().getWithMetadata(`bill/${id}`, { type: "arrayBuffer" });
  if (!hit) return new Response("This bill link has expired. Please ask us for a copy.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(hit.data, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${hit.metadata?.name || "Bill.pdf"}"`,
      "cache-control": "private, max-age=86400",
      "x-robots-tag": "noindex",
    },
  });
};

export const config = { path: "/bill/:id" };
