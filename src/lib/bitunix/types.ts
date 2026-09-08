export type Interval = "15m" | "1h" | "4h";
export type Book = "dump" | "list";
export type TradeMode = "paper" | "live";
export type DumpAction = "paper-short" | "watch" | "stand-down";
export type UniverseFilter = "scanner" | "desk" | "ready" | "watch" | "fuel" | "dump" | "starred" | "trade";
export type LiveRideAction = "stop" | "scale" | "trail" | "cover" | "hold";

export interface ScanRow {
  symbol: string;
  base: string;
  last: number;
  high: number;
  changePct: number;
  quoteVol: number;
  retracePct: number;
  stretchPct: number;
  red4h?: boolean;
  selling?: boolean;
  listingAgeHours?: number | null;
  funding?: number | null;
  spreadBps?: number | null;
  atrPct?: number | null;
  bounceFailed?: boolean | null;
}

export interface Decision {
  symbol: string;
  base: string;
  last: number;
  entry: number;
  stop: number;
  target: number | null;
  retracePct: number;
  score: number;
  action: DumpAction;
  reason: string;
  book?: Book;
  red4h?: boolean;
  tells?: string[];
  sizeUsd?: number;
  stopPct?: number;
}

export interface EngineRun {
  generatedAt: number;
  interval: Interval;
  scanned: number;
  enriched: number;
  headline: string;
  decisions: Decision[];
  regime?: { headline: string };
  breadth?: { headline: string };
}

export interface PaperPosition {
  id: string;
  symbol: string;
  base: string;
  entry: number;
  stop: number;
  target: number | null;
  sizeUsd: number;
  leverage: number;
  openedAt: number;
  closedAt: number | null;
  closePrice: number | null;
  closeReason: "open" | "stop" | "target" | "cover" | "manual";
  scaled: boolean;
  book: Book;
}

export interface LivePosition {
  positionId: string;
  symbol: string;
  base: string;
  side: "LONG" | "SHORT";
  entry: number;
  qty: string;
  leverage: number;
  unrealized: number;
  realized: number;
  margin: number;
  liqPrice: number;
  entryValue: number;
  fee: number;
  funding: number;
  marginRate: number;
  marginMode: string;
  openedAt: number;
  mark: number;
}

export interface LiveAccount {
  available: number;
  frozen: number;
  margin: number;
  unrealized: number;
  spot: number;
}

export interface ListingWatch {
  symbol: string;
  base: string;
  title: string;
  kind: "meme" | "delist" | "tradfi";
  state: "announce" | "fuel" | "watch" | "ready";
  announcedAt: number;
}

export interface LiveTpsl {
  id: string;
  symbol: string;
  positionId: string;
  slPrice: number;
  slQty: string;
}

export interface LiveRidePlan {
  action: LiveRideAction;
  note: string;
  slPrice?: number;
  coverQty?: string;
}

export interface Graduate {
  symbol: string;
  base: string;
  greenRunLow: number;
  at: number;
  fired: boolean;
}

export interface BitunixCreds {
  apiKey: string;
  apiSecret: string;
}

export interface LogEntry {
  id: string;
  at: number;
  kind: "scan" | "paper-open" | "paper-close" | "live-open" | "live-ride" | "live-close" | "info";
  message: string;
  symbol?: string;
  book?: Book;
  action?: string;
  pnl?: number;
}

export interface Settings {
  tradeSize: number;
  dumpOn: boolean;
  listOn: boolean;
}