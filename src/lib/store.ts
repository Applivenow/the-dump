import { useReducer, useEffect } from "react";
import type { BitunixCreds, PaperPosition, LogEntry, Settings } from "./bitunix/types";

const PREFIX = "dump.";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let credsState: BitunixCreds | null = load("creds", null);
let liveAckedState = load<boolean>("live", false);
let paperPositionsState = load<PaperPosition[]>("positions", []);
let logState = load<LogEntry[]>("log", []);
let settingsState = load<Settings>("settings", { tradeSize: 3000, dumpOn: true, listOn: true });

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

export function setCreds(c: BitunixCreds | null) {
  credsState = c;
  if (c) save("creds", c);
  else localStorage.removeItem(PREFIX + "creds");
  notify();
}
export function setLiveAcked(v: boolean) {
  liveAckedState = v;
  save("live", v);
  notify();
}
export function setPaperPositions(updater: (prev: PaperPosition[]) => PaperPosition[]) {
  paperPositionsState = updater(paperPositionsState);
  save("positions", paperPositionsState);
  notify();
}
export function addLog(entry: Omit<LogEntry, "id" | "at">) {
  logState = [{ ...entry, id: uid(), at: Date.now() }, ...logState].slice(0, 200);
  save("log", logState);
  notify();
}
export function clearLog() {
  logState = [];
  save("log", []);
  notify();
}
export function setSettings(patch: Partial<Settings>) {
  settingsState = { ...settingsState, ...patch };
  save("settings", settingsState);
  notify();
}

export function useDumpStore() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(forceUpdate);
    return () => {
      listeners.delete(forceUpdate);
    };
  }, []);
  return {
    creds: credsState,
    setCreds,
    liveAcked: liveAckedState,
    setLiveAcked,
    paperPositions: paperPositionsState,
    setPaperPositions,
    log: logState,
    addLog,
    clearLog,
    settings: settingsState,
    setSettings,
  };
}