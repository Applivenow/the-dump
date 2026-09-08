import { useEngineRuntime } from "@/lib/useEngineRuntime";
import RuntimeBar from "./RuntimeBar";
import DecisionCard from "./DecisionCard";
import LiveVault from "./LiveVault";
import ListingWire from "./ListingWire";
import PaperBook from "./PaperBook";
import LiveBook from "./LiveBook";

export default function EngineDesk() {
  const rt = useEngineRuntime();
  const openPaper = rt.paperPositions.filter((p) => !p.closedAt);
  const readyFills = rt.lastRun?.decisions.filter((d) => d.action === "paper-short") ?? [];
  const watches = rt.lastRun?.decisions.filter((d) => d.action === "watch") ?? [];

  return (
    <div className="space-y-6">
      <RuntimeBar
        running={rt.running}
        setRunning={rt.setRunning}
        scanning={rt.scanning}
        settings={rt.settings}
        setSettings={rt.setSettings}
        lastRun={rt.lastRun}
      />

      {rt.lastRun && (
        <div className="dateline border-b border-foreground/30 pb-2">
          SCAN {rt.lastRun.scanned} · ENRICHED {rt.lastRun.enriched} · {rt.lastRun.headline}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {rt.lastRun ? (
            readyFills.length > 0 ? (
              <div>
                <h2 className="font-display font-black text-3xl mb-3 border-b-2 border-accent pb-1">Ready Fills</h2>
                <div className="space-y-3">
                  {readyFills.map((d) => (
                    <DecisionCard key={d.symbol} decision={d} onPaper={rt.openPaper} onLive={rt.openLive} liveAcked={rt.liveAcked} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-foreground/30 py-16 text-center">
                <p className="font-display text-2xl text-muted-foreground">No Ready fills. No new listing.</p>
              </div>
            )
          ) : (
            <div className="border-2 border-dashed border-foreground/30 py-20 text-center">
              <p className="font-display text-2xl text-muted-foreground">Press Run Engine to scan the tape.</p>
            </div>
          )}

          {watches.length > 0 && (
            <div className="border-t-2 border-foreground pt-4">
              <h3 className="font-display font-bold text-xl mb-3">On the Watch</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {watches.slice(0, 12).map((d) => (
                  <DecisionCard key={d.symbol} decision={d} compact />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <LiveVault
            creds={rt.creds}
            setCreds={rt.setCreds}
            liveAcked={rt.liveAcked}
            setLiveAcked={rt.setLiveAcked}
            liveAccount={rt.liveAccount}
          />
          <ListingWire watches={rt.listingWatches} />
          {openPaper.length > 0 && (
            <PaperBook positions={openPaper} lastRun={rt.lastRun} onClose={rt.closePaper} />
          )}
          {rt.liveAcked && rt.livePositions.length > 0 && (
            <LiveBook positions={rt.livePositions} onFlatten={rt.flattenLive} onScale={rt.scaleLive} />
          )}
        </div>
      </div>
    </div>
  );
}