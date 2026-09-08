export default function LiveBook({ positions, onFlatten, onScale }) {
  const shorts = positions.filter((p) => p.side === "SHORT");

  return (
    <div className="border-2 border-accent bg-card p-4">
      <h3 className="font-display font-bold text-lg mb-3 text-accent">Live Book · {shorts.length}</h3>
      <div className="space-y-2">
        {shorts.map((pos) => {
          const pnlPct = pos.entry > 0 ? ((pos.entry - pos.mark) / pos.entry) * 100 : 0;
          return (
            <div key={pos.positionId} className="border border-accent/40 p-2 font-mono text-xs">
              <div className="flex justify-between font-bold">
                <span>{pos.base}</span>
                <span className={pos.unrealized >= 0 ? "text-accent" : ""}>
                  {pos.unrealized >= 0 ? "+" : ""}{pos.unrealized.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground mt-1">
                <span>Entry {pos.entry.toPrecision(4)}</span>
                <span>Mark {pos.mark.toPrecision(4)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className={pnlPct >= 0 ? "text-accent" : "text-muted-foreground"}>
                  {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                </span>
                <span className="text-muted-foreground">Qty {pos.qty}</span>
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => onScale(pos)}
                  className="flex-1 py-1 text-[10px] uppercase tracking-wider border border-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  Scale
                </button>
                <button
                  onClick={() => onFlatten(pos)}
                  className="flex-1 py-1 text-[10px] uppercase tracking-wider border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Flatten
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}