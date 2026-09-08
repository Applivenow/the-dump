import { paperPnlUsd } from "@/lib/bitunix/decide";

export default function TradeHistory({ positions }) {
  const closed = positions
    .filter((p) => p.closedAt)
    .map((p) => ({ ...p, pnl: paperPnlUsd(p.sizeUsd, p.entry, p.closePrice ?? p.entry) }))
    .sort((a, b) => b.closedAt - a.closedAt);

  const totalPnl = closed.reduce((s, r) => s + r.pnl, 0);
  const wins = closed.filter((r) => r.pnl >= 0).length;
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  return (
    <div>
      <h2 className="font-display font-black text-3xl mb-4">Trade History</h2>

      {closed.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/30 py-12 text-center">
          <p className="font-display text-xl text-muted-foreground">No closed trades yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 border-2 border-foreground bg-foreground text-background font-mono mb-0">
            <div className="px-4 py-2 border-r border-background/30">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Closed</div>
              <div className="text-xl font-bold">{closed.length}</div>
            </div>
            <div className="px-4 py-2 border-r border-background/30">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Win Rate</div>
              <div className="text-xl font-bold">{winRate}%</div>
            </div>
            <div className="px-4 py-2">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Net PnL</div>
              <div className="text-xl font-bold">{totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}</div>
            </div>
          </div>

          <div className="border-2 border-t-0 border-foreground bg-card overflow-x-auto">
            <div className="grid grid-cols-[80px_60px_90px_90px_80px_90px] gap-2 px-3 py-2 border-b-2 border-foreground bg-card font-mono text-[10px] uppercase tracking-wider min-w-[520px]">
              <span>Base</span>
              <span>Book</span>
              <span>Entry</span>
              <span>Close</span>
              <span>Reason</span>
              <span className="text-right">PnL</span>
            </div>
            {closed.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[80px_60px_90px_90px_80px_90px] gap-2 px-3 py-2 border-b border-foreground/20 font-mono text-xs min-w-[520px]"
              >
                <span className="font-bold">{p.base}</span>
                <span className="text-muted-foreground">{p.book === "list" ? "LIST" : "DUMP"}</span>
                <span>{p.entry.toPrecision(4)}</span>
                <span>{(p.closePrice ?? p.entry).toPrecision(4)}</span>
                <span className={p.closeReason === "stop" ? "text-accent" : "text-muted-foreground"}>{p.closeReason}</span>
                <span className={`text-right font-bold ${p.pnl >= 0 ? "text-accent" : ""}`}>
                  {p.pnl >= 0 ? "+" : ""}{p.pnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}