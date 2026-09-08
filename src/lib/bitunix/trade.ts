import { base44 } from "@/api/base44Client";
import type { BitunixCreds, LiveAccount, LivePosition } from "./types";
import { TRADE_LEVERAGE, baseFromSymbol, stopForExactRisk } from "./decide";

function num(v: unknown, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

async function callTrade(creds: BitunixCreds, op: string, params: Record<string, unknown> = {}) {
  const res = await base44.functions.invoke("bitunixTrade", {
    op,
    apiKey: creds.apiKey,
    apiSecret: creds.apiSecret,
    ...params,
  });
  const json = res.data as { code?: number | string | null; msg?: string; data?: unknown; error?: string };
  if (json == null) throw new Error("Trade proxy unreachable");
  if (json.error) throw new Error(json.error);
  if (json.code != null && String(json.code) !== "0") throw new Error(json.msg || `Bitunix ${json.code}`);
  return json.data;
}

export function qtyForNotional(last: number, notional: number) {
  if (!(last > 0) || !(notional > 0)) return "0";
  const raw = notional / last;
  if (raw >= 100) return String(Math.floor(raw));
  if (raw >= 1) return raw.toFixed(2);
  return raw.toFixed(4);
}

export async function placeLiveShort(creds: BitunixCreds, input: { symbol: string; last: number; notional: number; stopPrice?: number }) {
  const qty = qtyForNotional(input.last, input.notional);
  const stop = input.stopPrice ?? stopForExactRisk(input.last, input.notional);
  try {
    await callTrade(creds, "openShort", { symbol: input.symbol, qty, slPrice: stop, leverage: TRADE_LEVERAGE });
    return { ok: true as const, qty, stop };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Place failed" };
  }
}

export async function flattenPosition(creds: BitunixCreds, positionId: string) {
  try {
    await callTrade(creds, "flatten", { positionId });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Flatten failed" };
  }
}

export async function scaleLiveShort(creds: BitunixCreds, input: { symbol: string; qty: string }) {
  try {
    await callTrade(creds, "scale", { symbol: input.symbol, qty: input.qty });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Scale failed" };
  }
}

export async function fetchLivePositions(creds: BitunixCreds): Promise<LivePosition[]> {
  try {
    const data = await callTrade(creds, "positions");
    return asRows(data).map((p) => ({
      positionId: String(p.positionId ?? p.id ?? ""),
      symbol: String(p.symbol ?? ""),
      base: baseFromSymbol(String(p.symbol ?? "")),
      side: String(p.side ?? "SHORT") as "LONG" | "SHORT",
      entry: num(p.avgOpenPrice ?? p.avgPrice ?? p.entryPrice ?? p.openPrice),
      qty: String(p.qty ?? p.volume ?? "0"),
      leverage: num(p.leverage ?? 10),
      unrealized: num(p.unrealizedPNL ?? p.unrealizedProfitLoss ?? p.unrealized ?? 0),
      realized: num(p.realizedPNL ?? p.realizedProfitLoss ?? p.realized ?? 0),
      margin: num(p.margin ?? p.isolated ?? 0),
      liqPrice: num(p.liqPrice ?? p.liquidationPrice ?? 0),
      entryValue: num(p.entryValue ?? p.openValue ?? p.positionValue ?? 0),
      fee: num(p.fee ?? 0),
      funding: num(p.funding ?? 0),
      marginRate: num(p.marginRate ?? 0),
      marginMode: String(p.marginMode ?? "ISOLATED"),
      openedAt: num(p.ctime ?? p.openTime ?? p.createdTime ?? Date.now()),
      mark: num(p.markPrice ?? p.lastPrice ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function fetchLiveAccount(creds: BitunixCreds): Promise<LiveAccount | null> {
  try {
    const data = await callTrade(creds, "account");
    const a = (data ?? {}) as Record<string, unknown>;
    return {
      available: num(a.available ?? a.availableBalance ?? 0),
      frozen: num(a.frozen ?? a.frozenBalance ?? 0),
      margin: num(a.margin ?? a.positionMargin ?? 0),
      unrealized: num(a.unrealized ?? a.unrealizedProfitLoss ?? 0),
      spot: num(a.spot ?? 0),
    };
  } catch {
    return null;
  }
}