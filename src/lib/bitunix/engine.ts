import { fetchTickers, enrichTop, enrichRow, fetchKline, btcCrashPct } from "./scan";
import { fetchListingWatches } from "./listing-wire";
import { scoreDump, scoreList, isMajor } from "./decide";
import type { EngineRun, ScanRow, Decision, Settings } from "./types";

const BTC_CRASH_PCT = -3;

export async function runEngine(settings: Settings): Promise<EngineRun> {
  const startedAt = Date.now();
  const tickers = await fetchTickers();
  const sorted = [...tickers].sort((a, b) => b.quoteVol - a.quoteVol);
  const nonMajors = sorted.filter((r) => !isMajor(r.symbol));

  const allDecisions: Decision[] = [];
  let enrichedCount = 0;

  if (settings.dumpOn) {
    const top = await enrichTop(nonMajors, 24);
    enrichedCount = top.length;
    for (const row of top) {
      const selling = row.changePct < 0;
      allDecisions.push(scoreDump(row, selling, settings.tradeSize));
    }
  }

  if (settings.listOn) {
    const watches = await fetchListingWatches();
    for (const w of watches) {
      const ticker = tickers.find((t) => t.symbol === w.symbol);
      if (!ticker) continue;
      const enriched = await enrichRow(ticker, { daily: true });
      const selling = enriched.changePct < 0;
      allDecisions.push(scoreList(enriched, selling, enriched.listingAgeHours ?? null, settings.tradeSize, w.kind));
    }
  }

  const btcBars = await fetchKline("BTCUSDT", "4h", 4);
  const btc4h = btcCrashPct(btcBars);
  let btcNote = "";
  if (btc4h <= BTC_CRASH_PCT) {
    btcNote = `BTC ${btc4h.toFixed(1)}% on the 4h — meme squeeze risk, shorts suppressed.`;
    for (const d of allDecisions) {
      if (d.action === "paper-short") {
        d.action = "watch";
        d.score = 60;
        d.reason = btcNote;
      }
    }
  }

  allDecisions.sort((a, b) => b.score - a.score);
  const readyCount = allDecisions.filter((d) => d.action === "paper-short").length;

  return {
    generatedAt: startedAt,
    interval: "4h",
    scanned: tickers.length,
    enriched: enrichedCount,
    headline: btcNote
      ? btcNote
      : readyCount > 0
        ? `${readyCount} READY FILL${readyCount > 1 ? "S" : ""}`
        : "No Ready fills. No new listing.",
    decisions: allDecisions,
    regime: btcNote ? { headline: "BTC CAPITULATION" } : undefined,
  };
}