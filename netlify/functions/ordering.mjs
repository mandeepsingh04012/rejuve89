// GET /api/ordering -> which ordering channel the website should show right now.
import { getConfig, getHeartbeat, json, orderingState, store } from "../lib/shared.mjs";

export default async () => {
  const s = store();
  const [config, hb] = await Promise.all([getConfig(s), getHeartbeat(s)]);
  return json(orderingState(config, hb));
};

export const config = { path: "/api/ordering" };
