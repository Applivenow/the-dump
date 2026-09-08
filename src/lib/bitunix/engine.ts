import { fetchTickers, enrichTop, enrichRow } from "./scan";
import { fetchListingWatches } from "./listing-wire";
import { scoreDump, scoreList, isMajor } from "./decide";
import type { EngineRun, ScanRow, Decision, Settings } from "./types";

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
      allDecisions.push(scoreList(enriched, selling, enriched.listingAgeHours ?? null, settings.tradeSize));
    }
  }

  allDecisions.sort((a, b) => b.score - a.score);
  const readyCount = allDecisions.filter((d) => d.action === "paper-short").length;

  return {
    generatedAt: startedAt,
    interval: "4h",
    scanned: tickers.length,
    enriched: enrichedCount,
    headline: readyCount > 0 ? `${readyCount} READY FILL${readyCount > 1 ? "S" : ""}` : "No Ready fills. No new listing.",
    decisions: allDecisions,
  };
}