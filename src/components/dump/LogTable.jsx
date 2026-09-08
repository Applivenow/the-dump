const KIND_LABELS = {
  scan: "SCAN",
  "paper-open": "PAPER+",
  "paper-close": "PAPER-",
  "live-open": "LIVE+",
  "live-ride": "RIDE",
  "live-close": "LIVE-",
  info: "INFO",
};

export default function LogTable({ log, onClear }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-black text-3xl">Auto Log</h2>
        {log.length > 0 && (
          <button onClick={onClear} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">
            Clear Log
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/30 py-20 text-center">
          <p className="font-display text-xl text-muted-foreground">No runs yet. Start the engine on the Desk.</p>
        </div>
      ) : (
        <div className="border-2 border-foreground bg-card overflow-x-auto">
          <div className="grid grid-cols-[90px_70px_1fr_90px] gap-2 px-3 py-2 border-b-2 border-foreground bg-foreground text-background font-mono text-[10px] uppercase tracking-wider min-w-[500px]">
            <span>Time</span>
            <span>Kind</span>
            <span>Message</span>
            <span className="text-right">PnL</span>
          </div>
          {log.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[90px_70px_1fr_90px] gap-2 px-3 py-2 border-b border-foreground/20 font-mono text-xs min-w-[500px]"
            >
              <span className="text-muted-foreground">{new Date(entry.at).toLocaleTimeString()}</span>
              <span className="font-bold">{KIND_LABELS[entry.kind] ?? entry.kind}</span>
              <span className="truncate">{entry.message}</span>
              <span className={`text-right ${entry.pnl != null && entry.pnl >= 0 ? "text-accent" : ""}`}>
                {entry.pnl != null ? `${entry.pnl >= 0 ? "+" : ""}${entry.pnl.toFixed(2)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}