import { Loader2, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RuntimeBar({ running, setRunning, scanning, settings, setSettings, lastRun }) {
  const readyCount = lastRun?.decisions.filter((d) => d.action === "paper-short").length ?? 0;

  return (
    <div className="border-2 border-foreground bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunning(!running)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 font-display font-bold uppercase tracking-wider text-sm border-2 border-foreground transition-colors",
              running ? "bg-accent text-accent-foreground" : "bg-foreground text-background hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Stop" : "Run Engine"}
          </button>
          <div className="dateline">
            {scanning ? "SCANNING THE TAPE…" : lastRun ? `LAST RUN ${new Date(lastRun.generatedAt).toLocaleTimeString()}` : "IDLE"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold cursor-pointer">
            <input type="checkbox" checked={settings.dumpOn} onChange={(e) => setSettings({ dumpOn: e.target.checked })} className="accent-accent w-4 h-4" />
            A DUMP
          </label>
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold cursor-pointer">
            <input type="checkbox" checked={settings.listOn} onChange={(e) => setSettings({ listOn: e.target.checked })} className="accent-accent w-4 h-4" />
            B LIST
          </label>
          <select
            value={settings.tradeSize}
            onChange={(e) => setSettings({ tradeSize: Number(e.target.value) })}
            className="bg-transparent border border-foreground text-xs font-mono px-2 py-1 cursor-pointer"
          >
            <option value={1000}>$1K ticket</option>
            <option value={3000}>$3K ticket</option>
            <option value={10000}>$10K ticket</option>
          </select>
          <div className={cn("stamp", readyCount > 0 ? "stamp-filled" : "stamp-red")}>
            {readyCount} Ready
          </div>
        </div>
      </div>
    </div>
  );
}