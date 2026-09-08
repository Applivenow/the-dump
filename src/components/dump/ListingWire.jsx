import { cn } from "@/lib/utils";

const STATE_STYLES = {
  announce: { label: "Announce", class: "stamp-filled" },
  fuel: { label: "Fuel", class: "stamp-red" },
  watch: { label: "Watch", class: "border-foreground text-foreground" },
  ready: { label: "Ready", class: "stamp-filled" },
};

export default function ListingWire({ watches }) {
  return (
    <div className="border-2 border-foreground bg-card p-4">
      <h3 className="font-display font-bold text-lg mb-3">Listing Wire</h3>
      {watches.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">No new listings on the wire.</p>
      ) : (
        <div className="space-y-2">
          {watches.slice(0, 8).map((w) => {
            const ageH = Math.max(0, (Date.now() - w.announcedAt) / 3_600_000);
            const s = STATE_STYLES[w.state] ?? STATE_STYLES.watch;
            return (
              <div key={w.symbol} className="border border-foreground/40 p-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm">{w.base}</span>
                  <span className={cn("stamp", s.class)}>{s.label}</span>
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-1">{w.title}</p>
                <div className="text-muted-foreground mt-0.5">
                  {ageH < 1 ? `${Math.round(ageH * 60)}m ago` : `${ageH.toFixed(1)}h ago`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}