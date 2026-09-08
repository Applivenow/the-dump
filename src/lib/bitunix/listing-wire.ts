import { base44 } from "@/api/base44Client";
import type { ListingWatch } from "./types";

const CJK: Record<string, string> = { 哈基米: "HAJIMI" };

export function latinListingBase(title: string): string | null {
  for (const [cjk, latin] of Object.entries(CJK)) if (title.includes(cjk)) return latin;
  const tickers = title.match(/\b([A-Z]{2,12})\b/g) ?? [];
  const skip = new Set(["USDT", "USD", "THE", "AND", "FOR", "NEW", "LISTING", "PERP", "SPOT", "FUTURES", "AI", "DEFI", "NFT"]);
  const candidates = tickers.filter((t) => !skip.has(t));
  return candidates[candidates.length - 1] ?? null;
}

export async function fetchListingWatches(): Promise<ListingWatch[]> {
  try {
    const response = await base44.functions.invoke("bitunixScan", { endpoint: "listings" });
    const articles = (response.data?.articles ?? []) as { title?: string; created_at?: string; name?: string }[];
    const now = Date.now();
    const rows: ListingWatch[] = [];
    for (const a of articles.slice(0, 20)) {
      const title = a.title || a.name || "";
      const base = latinListingBase(title);
      if (!base) continue;
      const announcedAt = Date.parse(a.created_at || "") || now;
      const age = now - announcedAt;
      rows.push({
        symbol: `${base}USDT`,
        base,
        title,
        kind: /delist/i.test(title) ? "delist" : "meme",
        state: age < 3600_000 ? "announce" : age < 12 * 3600_000 ? "fuel" : "watch",
        announcedAt,
      });
    }
    return rows;
  } catch {
    return [];
  }
}