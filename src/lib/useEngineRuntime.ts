import { useState, useEffect, useRef, useCallback } from "react";
import { runEngine } from "./bitunix/engine";
import { fetchKline, buyingStepsIn } from "./bitunix/scan";
import { fetchLivePositions, fetchLiveAccount, placeLiveShort, flattenPosition, scaleLiveShort } from "./bitunix/trade";
import { planLiveRide, paperPnlUsd, breakevenStop, hitOneR } from "./bitunix/decide";
import { fetchListingWatches } from "./bitunix/listing-wire";
import { useDumpStore, uid } from "./store";
import type { EngineRun, LivePosition, LiveAccount, Decision, PaperPosition, ListingWatch } from "./bitunix/types";

export function useEngineRuntime() {
  const store = useDumpStore();
  const { creds, setCreds, liveAcked, setLiveAcked, setPaperPositions, addLog, clearLog, settings, setSettings } = store;

  const [running, setRunning] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastRun, setLastRun] = useState<EngineRun | null>(null);
  const [livePositions, setLivePositions] = useState<LivePosition[]>([]);
  const [liveAccount, setLiveAccount] = useState<LiveAccount | null>(null);
  const [listingWatches, setListingWatches] = useState<ListingWatch[]>([]);

  const livePositionsRef = useRef<LivePosition[]>([]);
  const scaledSyms = useRef<Set<string>>(new Set());
  const settingsRef = useRef(settings);
  const liveAckedRef = useRef(liveAcked);
  const credsRef = useRef(creds);

  useEffect(() => { livePositionsRef.current = livePositions; }, [livePositions]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { liveAckedRef.current = liveAcked; }, [liveAcked]);
  useEffect(() => { credsRef.current = creds; }, [creds]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;

    async function tick() {
      setScanning(true);
      try {
        const run = await runEngine(settingsRef.current);
        if (cancelled) return;
        setLastRun(run);
        addLog({ kind: "scan", message: run.headline, action: `${run.scanned} scanned · ${run.enriched} enriched` });

        const priceMap = new Map(run.decisions.map((d) => [d.symbol, d.last]));
        setPaperPositions((prev) =>
          prev.map((pos) => {
            if (pos.closedAt) return pos;
            const last = priceMap.get(pos.symbol) ?? pos.entry;
            if (!pos.scaled && hitOneR(pos.entry, pos.stop, last)) {
              addLog({ kind: "paper-close", message: `PAPER +1R SCALE ${pos.base}`, symbol: pos.symbol, pnl: paperPnlUsd(pos.sizeUsd / 2, pos.entry, last), book: pos.book });
              return { ...pos, scaled: true, stop: breakevenStop(pos.entry) ?? pos.stop };
            }
            if (last >= pos.stop) {
              const pnl = paperPnlUsd(pos.sizeUsd, pos.entry, last);
              addLog({ kind: "paper-close", message: `PAPER STOP ${pos.base}`, symbol: pos.symbol, pnl, book: pos.book });
              return { ...pos, closedAt: Date.now(), closePrice: last, closeReason: "stop" as const };
            }
            return pos;
          }),
        );

        if (liveAckedRef.current && credsRef.current) {
          const ready = run.decisions.filter((d) => d.action === "paper-short");
          const openSyms = new Set(livePositionsRef.current.map((p) => p.symbol));
          let slots = livePositionsRef.current.length;
          for (const d of ready) {
            if (slots >= 3) break;
            if (openSyms.has(d.symbol)) continue;
            const result = await placeLiveShort(credsRef.current, { symbol: d.symbol, last: d.last, notional: settingsRef.current.tradeSize });
            if (result.ok) {
              addLog({ kind: "live-open", message: `LIVE SHORT ${d.base} @ ${d.entry}`, symbol: d.symbol, book: d.book });
              slots++;
              openSyms.add(d.symbol);
            } else {
              addLog({ kind: "info", message: `Live short failed: ${result.error}`, symbol: d.symbol });
            }
          }

          for (const pos of livePositionsRef.current) {
            if (pos.side !== "SHORT") continue;
            const bars = await fetchKline(pos.symbol, "1h", 4);
            const buying = buyingStepsIn(bars);
            const scaled = scaledSyms.current.has(pos.symbol);
            const plan = planLiveRide({ entry: pos.entry, last: pos.mark || pos.entry, stop: pos.liqPrice || pos.entry * 1.1, scaled, buying, qty: pos.qty });
            if (plan.action === "cover") {
              await flattenPosition(credsRef.current, pos.positionId);
              addLog({ kind: "live-close", message: `LIVE COVER ${pos.base}`, symbol: pos.symbol });
            } else if (plan.action === "scale" && plan.coverQty) {
              await scaleLiveShort(credsRef.current, { symbol: pos.symbol, qty: plan.coverQty });
              scaledSyms.current.add(pos.symbol);
              addLog({ kind: "live-ride", message: `LIVE +1R SCALE ${pos.base}`, symbol: pos.symbol, action: "scale" });
            }
          }
        }
      } catch (err) {
        addLog({ kind: "info", message: `Engine error: ${err instanceof Error ? err.message : "unknown"}` });
      } finally {
        if (!cancelled) setScanning(false);
      }
    }

    tick();
    const id = setInterval(tick, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [running]);

  useEffect(() => {
    let cancelled = false;
    async function pollWire() {
      const watches = await fetchListingWatches();
      if (!cancelled) setListingWatches(watches);
    }
    pollWire();
    const wireId = setInterval(pollWire, 45_000);
    return () => { cancelled = true; clearInterval(wireId); };
  }, []);

  useEffect(() => {
    if (!liveAcked || !creds) {
      setLivePositions([]);
      setLiveAccount(null);
      return;
    }
    async function poll() {
      const positions = await fetchLivePositions(creds);
      const account = await fetchLiveAccount(creds);
      setLivePositions(positions);
      setLiveAccount(account);
    }
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [liveAcked, creds]);

  const openPaper = useCallback((d: Decision) => {
    const pos: PaperPosition = {
      id: uid(), symbol: d.symbol, base: d.base, entry: d.entry, stop: d.stop,
      target: d.target, sizeUsd: settingsRef.current.tradeSize, leverage: 10,
      openedAt: Date.now(), closedAt: null, closePrice: null,
      closeReason: "open", scaled: false, book: d.book ?? "dump",
    };
    setPaperPositions((prev) => [...prev, pos]);
    addLog({ kind: "paper-open", message: `PAPER SHORT ${d.base} @ ${d.entry}`, symbol: d.symbol, book: d.book });
  }, [setPaperPositions, addLog]);

  const closePaper = useCallback((pos: PaperPosition, reason: "manual" | "target" | "cover" = "manual") => {
    const last = lastRun?.decisions.find((d) => d.symbol === pos.symbol)?.last ?? pos.entry;
    const pnl = paperPnlUsd(pos.sizeUsd, pos.entry, last);
    setPaperPositions((prev) => prev.map((p) => (p.id === pos.id ? { ...p, closedAt: Date.now(), closePrice: last, closeReason: reason } : p)));
    addLog({ kind: "paper-close", message: `PAPER ${reason.toUpperCase()} ${pos.base}`, symbol: pos.symbol, pnl, book: pos.book });
  }, [lastRun, setPaperPositions, addLog]);

  const openLive = useCallback(async (d: Decision) => {
    if (!creds) return;
    const result = await placeLiveShort(creds, { symbol: d.symbol, last: d.last, notional: settingsRef.current.tradeSize });
    if (result.ok) addLog({ kind: "live-open", message: `LIVE SHORT ${d.base} @ ${d.entry}`, symbol: d.symbol, book: d.book });
    else addLog({ kind: "info", message: `Live short failed: ${result.error}`, symbol: d.symbol });
  }, [creds, addLog]);

  const flattenLive = useCallback(async (pos: LivePosition) => {
    if (!creds) return;
    const result = await flattenPosition(creds, pos.positionId);
    addLog({ kind: "live-close", message: result.ok ? `LIVE FLATTEN ${pos.base}` : `Flatten failed: ${result.error}`, symbol: pos.symbol });
  }, [creds, addLog]);

  const scaleLive = useCallback(async (pos: LivePosition) => {
    if (!creds) return;
    const half = String(Math.max(1, Math.floor(Number(pos.qty) / 2)));
    const result = await scaleLiveShort(creds, { symbol: pos.symbol, qty: half });
    if (result.ok) scaledSyms.current.add(pos.symbol);
    addLog({ kind: "live-ride", message: result.ok ? `LIVE SCALE ${pos.base} (half)` : `Scale failed: ${result.error}`, symbol: pos.symbol, action: "scale" });
  }, [creds, addLog]);

  return {
    creds, setCreds, liveAcked, setLiveAcked,
    paperPositions: store.paperPositions, log: store.log, clearLog,
    settings, setSettings,
    running, setRunning, scanning, lastRun,
    livePositions, liveAccount, listingWatches,
    openPaper, closePaper, openLive, flattenLive, scaleLive,
  };
}