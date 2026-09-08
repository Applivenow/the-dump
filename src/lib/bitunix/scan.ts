import { base44 } from "@/api/base44Client";
import { baseFromSymbol, isMajor, retracePct } from "./decide";
import type { ScanRow } from "./types";

function num(v: unknown, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function fetchTickers(): Promise<ScanRow[]> {
  try {
    const response = await base44.functions.invoke("bitunixScan", { endpoint: "tickers" });
    const json = response.data;
    if (!json || json.error) return [];
    const rows = (json.data ?? []) as Record<string, unknown>[];
    return rows
      .map((t) => {
        const symbol = String(t.symbol ?? "");
        const last = num(t.last ?? t.lastPrice);
        const high = num(t.high ?? t.high24h, last);
        const open = num(t.open);
        const changePct = num(t.rose ?? t.change24h, open > 0 ? ((last - open) / open) * 100 : 0);
        const quoteVol = num(t.quoteVol ?? t.turnover ?? t.amount);
        return {
          symbol,
          base: baseFromSymbol(symbol),
          last,
          high,
          changePct,
          quoteVol,
          retracePct: retracePct(last, high),
          stretchPct: open > 0 ? ((high - open) / open) * 100 : 0,
        };
      })
      .filter((r) => r.symbol.endsWith("USDT") && r.last > 0);
  } catch {
    return [];
  }
}

export async function fetchKline(symbol: string, interval: string, limit = 12) {
  try {
    const response = await base44.functions.invoke("bitunixScan", {
      endpoint: "kline",
      symbol,
      interval,
      limit,
    });
    const json = response.data;
    if (!json || json.error) return [];
    const rows = (json.data ?? []) as Record<string, unknown>[];
    return rows.map((b) => ({
      o: num(b.open ?? b.o),
      h: num(b.high ?? b.h),
      l: num(b.low ?? b.l),
      c: num(b.close ?? b.c),
      t: num(b.time ?? b.ts ?? b.openTime),
    }));
  } catch {
    return [];
  }
}

export function lastClosedRed(bars: { o: number; c: number }[]) {
  const closed = bars.length > 1 ? bars[bars.length - 2] : bars[bars.length - 1];
  if (!closed) return false;
  return closed.c < closed.o;
}

export function buyingStepsIn(bars: { o: number; c: number }[]) {
  const lastTwo = bars.slice(-2);
  if (lastTwo.length < 2) return false;
  return lastTwo.every((b) => b.c > b.o);
}

export async function enrichRow(row: ScanRow, opts: { daily?: boolean } = {}): Promise<ScanRow> {
  try {
    const bars = await fetchKline(row.symbol, "4h", 8);
    let listingAgeHours: number | null = null;
    if (opts.daily) {
      const first = await fetchKline(row.symbol, "1d", 30).catch(() => []);
      listingAgeHours = first[0]?.t ? (Date.now() - first[0].t) / 3_600_000 : null;
    }
    return { ...row, red4h: lastClosedRed(bars), listingAgeHours };
  } catch {
    return row;
  }
}

export async function enrichTop(rows: ScanRow[], n = 24): Promise<ScanRow[]> {
  const slice = rows.filter((r) => !isMajor(r.symbol)).slice(0, n);
  const out: ScanRow[] = [];
  for (let i = 0; i < slice.length; i += 6) {
    const batch = slice.slice(i, i + 6);
    out.push(...(await Promise.all(batch.map((row) => enrichRow(row)))));
  }
  return out;
}