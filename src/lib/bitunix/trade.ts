import type { BitunixCreds, LiveAccount, LivePosition, LiveTpsl } from "./types";
import { TRADE_LEVERAGE, baseFromSymbol, stopForExactRisk } from "./decide";

const FAPI = "https://fapi.bitunix.com";

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

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomHex(n = 16) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signedBitunix(creds: BitunixCreds, method: string, path: string, query?: string, body?: Record<string, unknown>) {
  const nonce = randomHex(16);
  const timestamp = String(Date.now());
  const payload = body ? JSON.stringify(body) : "";
  const digest = await sha256Hex(nonce + timestamp + creds.apiKey + (query ?? "") + payload);
  const sign = await sha256Hex(digest + creds.apiSecret);
  const url = `${FAPI}${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      "api-key": creds.apiKey,
      nonce,
      timestamp,
      sign,
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : payload || undefined,
  });
  const json = (await res.json()) as { code?: number | string; msg?: string; data?: unknown };
  if (String(json.code ?? "") !== "0" && json.code !== 0 && json.code != null) {
    throw new Error(json.msg || `Bitunix ${json.code}`);
  }
  return json.data;
}

export function qtyForNotional(last: number, notional: number) {
  if (!(last > 0) || !(notional > 0)) return "0";
  const raw = notional / last;
  if (raw >= 100) return String(Math.floor(raw));
  if (raw >= 1) return raw.toFixed(2);
  return raw.toFixed(4);
}

export async function placeLiveShort(creds: BitunixCreds, input: { symbol: string; last: number; notional: number }) {
  const qty = qtyForNotional(input.last, input.notional);
  const stop = stopForExactRisk(input.last, input.notional);
  try {
    await signedBitunix(creds, "POST", "/api/v1/futures/account/change_leverage", undefined, {
      symbol: input.symbol,
      leverage: TRADE_LEVERAGE,
      marginMode: "ISOLATION",
    }).catch(() =>
      signedBitunix(creds, "POST", "/api/v1/futures/account/change_leverage", undefined, {
        symbol: input.symbol,
        leverage: TRADE_LEVERAGE,
        marginMode: "ISOLATED",
      }),
    );
    await signedBitunix(creds, "POST", "/api/v1/futures/trade/place_order", undefined, {
      symbol: input.symbol,
      side: "SELL",
      tradeSide: "OPEN",
      orderType: "MARKET",
      qty,
      reduceOnly: false,
    });
    await signedBitunix(creds, "POST", "/api/v1/futures/tpsl/place_order", undefined, {
      symbol: input.symbol,
      slPrice: String(stop),
      slStopType: "LAST",
      slQty: qty,
    }).catch(() => null);
    return { ok: true as const, qty, stop };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Place failed" };
  }
}

export async function flattenPosition(creds: BitunixCreds, positionId: string) {
  try {
    await signedBitunix(creds, "POST", "/api/v1/futures/trade/flash_close_position", undefined, { positionId });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Flatten failed" };
  }
}

export async function scaleLiveShort(creds: BitunixCreds, input: { symbol: string; qty: string }) {
  try {
    await signedBitunix(creds, "POST", "/api/v1/futures/trade/place_order", undefined, {
      symbol: input.symbol,
      side: "BUY",
      tradeSide: "CLOSE",
      orderType: "MARKET",
      qty: input.qty,
      reduceOnly: true,
    });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Scale failed" };
  }
}

export async function fetchLivePositions(creds: BitunixCreds): Promise<LivePosition[]> {
  try {
    const data = await signedBitunix(creds, "GET", "/api/v1/futures/position/list");
    return asRows(data).map((p) => ({
      positionId: String(p.positionId ?? p.id ?? ""),
      symbol: String(p.symbol ?? ""),
      base: baseFromSymbol(String(p.symbol ?? "")),
      side: String(p.side ?? "SHORT") as "LONG" | "SHORT",
      entry: num(p.avgPrice ?? p.entryPrice ?? p.openPrice),
      qty: String(p.qty ?? p.volume ?? "0"),
      leverage: num(p.leverage ?? 10),
      unrealized: num(p.unrealizedProfitLoss ?? p.unrealized ?? 0),
      realized: num(p.realizedProfitLoss ?? p.realized ?? 0),
      margin: num(p.margin ?? p.isolated ?? 0),
      liqPrice: num(p.liquidationPrice ?? p.liqPrice ?? 0),
      entryValue: num(p.openValue ?? p.positionValue ?? 0),
      fee: num(p.fee ?? 0),
      funding: num(p.funding ?? 0),
      marginRate: num(p.marginRate ?? 0),
      marginMode: String(p.marginMode ?? "ISOLATED"),
      openedAt: num(p.openTime ?? p.createdTime ?? Date.now()),
      mark: num(p.markPrice ?? p.lastPrice ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function fetchLiveAccount(creds: BitunixCreds): Promise<LiveAccount | null> {
  try {
    const data = await signedBitunix(creds, "GET", "/api/v1/futures/account");
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