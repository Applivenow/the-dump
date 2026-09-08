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
    return rows
      .map((b) => ({
        o: num(b.open ?? b.o),
        h: num(b.high ?? b.h),
        l: num(b.low ?? b.l),
        c: num(b.close ?? b.c),
        t: num(b.time ?? b.ts ?? b.openTime),
        v: num(b.quoteVol ?? b.vol ?? b.baseVol),
      }))
      .sort((a, b) => a.t - b.t);
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

export async function fetchFunding(symbol: string): Promise<number | null> {
  try {
    const response = await base44.functions.invoke("bitunixScan", { endpoint: "funding", symbol });
    const json = response.data;
    if (!json || json.error) return null;
    const payload = json.data;
    const row = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown> | undefined;
    const f = num(row?.fundingRate, NaN);
    return Number.isFinite(f) ? f : null;
  } catch {
    return null;
  }
}

export async function fetchDepthStats(symbol: string): Promise<{ bidUsd: number; askUsd: number; spreadBps: number } | null> {
  try {
    const response = await base44.functions.invoke("bitunixScan", { endpoint: "depth", symbol, limit: 50 });
    const json = response.data;
    if (!json || json.error || !json.data) return null;
    const book = json.data as { bids?: [number, number][]; asks?: [number, number][] };
    const bids = book.bids ?? [];
    const asks = book.asks ?? [];
    if (!bids.length || !asks.length) return null;
    const bestBid = num(bids[0][0]);
    const bestAsk = num(asks[0][0]);
    const mid = (bestBid + bestAsk) / 2;
    if (!(mid > 0)) return null;
    const within1Pct = (levels: [number, number][], ref: number, isBid: boolean) =>
      levels
        .filter(([p]) => (isBid ? p >= ref * 0.99 : p <= ref * 1.01))
        .reduce((sum, [p, q]) => sum + num(p) * num(q), 0);
    return {
      bidUsd: within1Pct(bids, bestBid, true),
      askUsd: within1Pct(asks, bestAsk, false),
      spreadBps: ((bestAsk - bestBid) / mid) * 10_000,
    };
  } catch {
    return null;
  }
}

export function atrPctFromBars(bars: { h: number; l: number; c: number }[]): number | null {
  const closed = bars.length > 1 ? bars.slice(0, -1) : bars;
  if (closed.length < 6) return null;
  const trs = closed
    .slice(-12)
    .map((b) => (b.h - b.l) / b.c)
    .filter((x) => Number.isFinite(x) && x > 0);
  if (!trs.length) return null;
  return (trs.reduce((s, x) => s + x, 0) / trs.length) * 100;
}

export function failedBounce(bars: { o: number; h: number; c: number }[]): boolean | null {
  const closed = bars.length > 1 ? bars.slice(0, -1) : bars;
  const window = closed.slice(-6);
  if (window.length < 4) return null;
  let bounceHigh = 0;
  for (let i = 1; i < window.length; i++) {
    if (window[i].h > window[i - 1].h && window[i].c > window[i].o) bounceHigh = Math.max(bounceHigh, window[i].h);
  }
  if (!(bounceHigh > 0)) return false;
  const last = window[window.length - 1];
  return last.c < bounceHigh && last.c < last.o;
}

export function volumeFade(bars: { o: number; c: number; v: number }[]): boolean | null {
  const closed = bars.length > 1 ? bars.slice(0, -1) : bars;
  if (closed.length < 4) return null;
  let peak = closed[0];
  for (const b of closed) if (b.v > peak.v) peak = b;
  const last = closed[closed.length - 1];
  return peak.c > peak.o && last.v < peak.v;
}

export function dailyBreak(bars: { h: number; l: number; c: number }[]): boolean | null {
  const closed = bars.length > 1 ? bars.slice(0, -1) : bars;
  if (closed.length < 2) return null;
  const prev = closed[closed.length - 2];
  const last = closed[closed.length - 1];
  if (!(prev.l > 0) || !(last.h > last.l)) return null;
  const belowPrevLow = last.c < prev.l;
  const bottomThird = (last.c - last.l) / (last.h - last.l) <= 1 / 3;
  return belowPrevLow && bottomThird;
}

export function btcCrashPct(bars: { o: number; c: number }[]): number {
  const closed = bars.length > 1 ? bars.slice(0, -1) : bars;
  const last = closed[closed.length - 1];
  if (!last || !(last.o > 0)) return 0;
  return ((last.c - last.o) / last.o) * 100;
}

export async function enrichRow(row: ScanRow, opts: { daily?: boolean } = {}): Promise<ScanRow> {
  try {
    const [bars, bars15, funding, bars1d] = await Promise.all([
      fetchKline(row.symbol, "4h", 8),
      fetchKline(row.symbol, "15m", 14),
      fetchFunding(row.symbol),
      fetchKline(row.symbol, "1d", 30),
    ]);
    let listingAgeHours: number | null = null;
    if (opts.daily) {
      listingAgeHours = bars1d[0]?.t ? (Date.now() - bars1d[0].t) / 3_600_000 : null;
    }
    return {
      ...row,
      red4h: lastClosedRed(bars),
      atrPct: atrPctFromBars(bars15),
      bounceFailed: failedBounce(bars15),
      funding,
      listingAgeHours,
      volFade: volumeFade(bars1d),
      dailyBreak: dailyBreak(bars1d),
    };
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