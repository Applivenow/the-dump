import { paperPnlUsd } from "@/lib/bitunix/decide";

export default function PaperBook({ positions, lastRun, onClose }) {
  const priceMap = new Map(lastRun?.decisions.map((d) => [d.symbol, d.last]) ?? []);

  return (
    <div className="border-2 border-foreground bg-card p-4">
      <h3 className="font-display font-bold text-lg mb-3">Paper Book · {positions.length}</h3>
      <div className="space-y-2">
        {positions.map((pos) => {
          const last = priceMap.get(pos.symbol) ?? pos.entry;
          const pnl = paperPnlUsd(pos.sizeUsd, pos.entry, last);
          const pnlPct = pos.entry > 0 ? ((last - pos.entry) / pos.entry) * 100 : 0;
          return (
            <div key={pos.id} className="border border-foreground/40 p-2 font-mono text-xs">
              <div className="flex justify-between font-bold">
                <span>
                  {pos.base} <span className="text-muted-foreground font-normal">{pos.book === "list" ? "LIST" : "DUMP"}</span>
                </span>
                <span className={pnl >= 0 ? "text-accent" : ""}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground mt-1">
                <span>Entry {pos.entry.toPrecision(4)}</span>
                <span>Stop {pos.stop.toPrecision(4)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={pnlPct >= 0 ? "text-accent" : "text-muted-foreground"}>
                  {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                </span>
                {pos.scaled && <span className="stamp stamp-red text-[8px] py-0">Scaled</span>}
              </div>
              <button
                onClick={() => onClose(pos)}
                className="w-full mt-2 py-1 text-[10px] uppercase tracking-wider border border-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                Close
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}