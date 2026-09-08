import { cn } from "@/lib/utils";

const ACTION_STYLES = {
  "paper-short": { label: "Ready", class: "stamp-filled" },
  watch: { label: "Watch", class: "stamp-red" },
  "stand-down": { label: "Stand Down", class: "border-muted-foreground text-muted-foreground" },
};

export default function DecisionCard({ decision: d, onPaper, onLive, liveAcked, compact }) {
  const style = ACTION_STYLES[d.action] ?? ACTION_STYLES["stand-down"];

  return (
    <article className={cn("border border-foreground bg-card p-4", !compact && "border-b-2")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-black text-2xl tracking-tight leading-none">{d.base}</h3>
            <span className={cn("stamp", style.class)}>{style.label}</span>
            {d.book === "list" && <span className="stamp border-foreground text-foreground">List</span>}
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1">{d.symbol} · ${d.last.toPrecision(4)}</p>
        </div>
        <div className="text-right font-mono text-xs space-y-0.5 shrink-0">
          <div className="font-bold text-sm">{d.retracePct.toFixed(1)}% off</div>
          {d.red4h !== undefined && (
            <div className={d.red4h ? "text-accent font-bold" : "text-muted-foreground"}>
              {d.red4h ? "4H RED" : "4H GREEN"}
            </div>
          )}
        </div>
      </div>

      {!compact && <p className="font-body text-sm mt-2 italic text-foreground/80">{d.reason}</p>}
      {compact && <p className="font-body text-xs mt-1 text-muted-foreground line-clamp-2">{d.reason}</p>}

      {!compact && d.action === "paper-short" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onPaper(d)}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Paper Short
          </button>
          {liveAcked && (
            <button
              onClick={() => onLive(d)}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Live Short
            </button>
          )}
        </div>
      )}
    </article>
  );
}