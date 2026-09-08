import type { Book, Decision, DumpAction, EngineRun, Graduate, LiveRidePlan, PaperPosition, ScanRow } from "./types";

export const TRADE_LEVERAGE = 10;
export const TRADE_SIZE_USD = 3000;
export const TRADE_SIZE_PRESETS = [1000, 3000, 10000] as const;
export const MAX_LOSS_USD = 100;
export const MAX_OPEN_PAPER = 3;
export const MAX_BOOK = 3;
export const TAKER_FEE_RT = 0.0012;
export const MAJORS = new Set(["BTC", "ETH", "SOL", "ARB", "BTCUSDT", "ETHUSDT", "SOLUSDT", "ARBUSDT"]);
export const LEADER_ALTS = new Set(["RAY", "ORCA", "JUP", "DOOD", "NAORIS", "UNI", "LINK", "HYPE", "DOGE", "XRP"]);
export const DUMP_MIN_VOL = 10_000_000;
export const LIST_MIN_VOL_FRESH = 500_000;

export function clampTradeSize(n: number) {
  if (n <= 1500) return 1000;
  if (n >= 7000) return 10000;
  return 3000;
}
export function maxLossForSize(_n: number) {
  return MAX_LOSS_USD;
}
export function baseFromSymbol(symbol: string) {
  return symbol.replace(/USDTM?$/i, "").toUpperCase();
}
export function isMajor(symbol: string) {
  const b = baseFromSymbol(symbol);
  if (MAJORS.has(b) || MAJORS.has(symbol.toUpperCase())) return true;
  if (/^(XAU|XAG|XAUT|CL|BYD|TEAM|DDOG|SHEIN|SKHYNIX|NVDA|AAPL|TSLA|SPX|NDX)/i.test(b)) return true;
  return false;
}
export function isLeaderAlt(symbol: string) {
  return LEADER_ALTS.has(baseFromSymbol(symbol));
}
export function retracePct(last: number, high: number) {
  if (!(high > 0) || !(last > 0)) return 0;
  return ((high - last) / high) * 100;
}
export function inReadyWindow(retrace: number) {
  return retrace >= 12 && retrace <= 35;
}
export function dollarRisk(entry: number, stop: number, notional: number) {
  if (!(entry > 0) || !(stop > entry) || !(notional > 0)) return 0;
  return ((stop - entry) / entry) * notional;
}
export function stopForExactRisk(entry: number, notional: number, risk = MAX_LOSS_USD) {
  if (!(entry > 0) || !(notional > 0)) return entry * 1.033;
  return entry * (1 + risk / notional);
}
export function hitOneR(entry: number, stop: number, last: number) {
  if (!(entry > 0) || !(stop > entry) || !(last > 0)) return false;
  return last <= entry - (stop - entry);
}
export function oneRPrice(entry: number, stop: number) {
  if (!(entry > 0) || !(stop > entry)) return entry;
  return entry - (stop - entry);
}
export function breakevenStop(entry: number, feeRt = TAKER_FEE_RT) {
  if (!(entry > 0)) return null;
  return entry * (1 + Math.max(0, feeRt));
}
export function paperPnlUsd(size: number, entry: number, last: number) {
  if (!(entry > 0) || !(last > 0)) return 0;
  return ((entry - last) / entry) * size;
}
export function bookOf(book?: Book): Book {
  return book === "list" ? "list" : "dump";
}

export function scoreDump(row: ScanRow, selling: boolean, notional = TRADE_SIZE_USD): Decision {
  const retrace = row.retracePct;
  const stop = stopForExactRisk(row.last, notional);
  let action: DumpAction = "stand-down";
  let reason = "Not a dump.";
  let score = 0;
  const tells: string[] = [];
  if (isMajor(row.symbol) || isLeaderAlt(row.symbol)) {
    reason = "Majors and still-bid alts are not the book.";
  } else if (row.quoteVol < DUMP_MIN_VOL) {
    reason = `Need ≥ $10M volume. Tape is $${(row.quoteVol / 1e6).toFixed(1)}M.`;
  } else if (row.changePct > 8) {
    action = "watch";
    reason = "Still stretching. Fuel. Never short the pump.";
    score = 20;
  } else if (retrace > 35) {
    action = "watch";
    reason = `${retrace.toFixed(0)}% off high · late vs ATH. Wait for a failed bounce.`;
    score = 35;
  } else if (retrace < 12) {
    action = "watch";
    reason = `Only ${retrace.toFixed(0)}% off high. Need 12–35% before a Ready short.`;
    score = 25;
  } else if (!selling) {
    action = "watch";
    reason = "Top is printed, but it is not selling off now. Wait for a red close.";
    score = 45;
  } else if (row.red4h === false) {
    action = "watch";
    reason = "12–35% off, but 4h is not red. Next fill must be topped and 4h red.";
    score = 50;
    tells.push("4h still green");
  } else {
    action = "paper-short";
    score = 70 + Math.min(20, Math.abs(row.changePct));
    reason = `Ready. ${retrace.toFixed(1)}% off high. $100 stop. Confirmed still fails.`;
    if (row.red4h) tells.push("4h red");
  }
  return {
    symbol: row.symbol,
    base: row.base,
    last: row.last,
    entry: row.last,
    stop,
    target: oneRPrice(row.last, stop),
    retracePct: retrace,
    score,
    action,
    reason,
    book: "dump",
    red4h: row.red4h,
    tells,
  };
}

export function scoreList(row: ScanRow, selling: boolean, listingAgeHours: number | null, notional = TRADE_SIZE_USD): Decision {
  const d = scoreDump({ ...row, quoteVol: Math.max(row.quoteVol, LIST_MIN_VOL_FRESH) }, selling, notional);
  d.book = "list";
  if (row.quoteVol < LIST_MIN_VOL_FRESH) {
    d.action = "watch";
    d.score = 15;
    d.reason = `LIST needs ≥ $500k. Tape is $${(row.quoteVol / 1e3).toFixed(0)}k.`;
    return d;
  }
  if (listingAgeHours != null && listingAgeHours < 1) {
    d.action = "watch";
    d.score = 12;
    d.reason = "Never short the print. First hour must close.";
    return d;
  }
  if (d.action === "paper-short") d.reason = `LIST Ready. ${d.retracePct.toFixed(1)}% off listing high. Never the print. $100 stop.`;
  return d;
}

export function mergeBookFills(dump?: EngineRun, list?: EngineRun, dumpOn = true, listOn = true): Decision[] {
  const out: Decision[] = [];
  if (dumpOn) for (const d of dump?.decisions ?? []) if (d.action === "paper-short") out.push({ ...d, book: "dump" });
  if (listOn) for (const d of list?.decisions ?? []) if (d.action === "paper-short") out.push({ ...d, book: d.book ?? "list" });
  const seen = new Set<string>();
  return out.filter((d) => {
    if (seen.has(d.symbol)) return false;
    seen.add(d.symbol);
    return true;
  });
}

export function planLiveRide(input: {
  entry: number;
  last: number;
  stop: number;
  scaled: boolean;
  buying: boolean;
  qty?: string;
}): LiveRidePlan {
  const { entry, last, stop, scaled, buying, qty } = input;
  if (!(entry > 0) || !(last > 0)) return { action: "hold", note: "No tape." };
  if (buying && last > entry) return { action: "cover", note: "Buying steps in. Cover the runner.", coverQty: qty };
  if (last >= stop) return { action: "stop", note: "Stop tagged." };
  if (!scaled && hitOneR(entry, stop, last)) {
    const half = qty ? String(Math.max(1, Math.floor(Number(qty) / 2))) : undefined;
    return { action: "scale", note: "+1R. Cover half, trail the rest.", coverQty: half, slPrice: breakevenStop(entry) ?? entry };
  }
  if (scaled) {
    const trail = breakevenStop(entry) ?? entry;
    if (stop > trail * 1.002) return { action: "trail", note: "Trail to entry + fees.", slPrice: trail };
  }
  return { action: "hold", note: "Ride the dump." };
}