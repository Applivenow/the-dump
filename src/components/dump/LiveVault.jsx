import { useState } from "react";
import { cn } from "@/lib/utils";

export default function LiveVault({ creds, setCreds, liveAcked, setLiveAcked, liveAccount }) {
  const [key, setKey] = useState(creds?.apiKey ?? "");
  const [secret, setSecret] = useState(creds?.apiSecret ?? "");
  const [show, setShow] = useState(false);

  function save() {
    if (key && secret) setCreds({ apiKey: key, apiSecret: secret });
  }
  function clear() {
    setCreds(null);
    setKey("");
    setSecret("");
    setLiveAcked(false);
  }

  return (
    <div className="border-2 border-foreground bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg">Bitunix Vault</h3>
        {liveAcked ? <span className="stamp stamp-filled">Live</span> : <span className="stamp stamp-red">Paper</span>}
      </div>

      {!creds ? (
        <>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="API Key"
            className="w-full bg-transparent border border-foreground px-2 py-1.5 text-sm font-mono mb-2 focus:outline-none focus:border-accent"
          />
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            type={show ? "text" : "password"}
            placeholder="API Secret"
            className="w-full bg-transparent border border-foreground px-2 py-1.5 text-sm font-mono mb-2 focus:outline-none focus:border-accent"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 cursor-pointer">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="accent-accent" /> Show secret
          </label>
          <button
            onClick={save}
            disabled={!key || !secret}
            className="w-full py-2 text-xs font-bold uppercase tracking-wider bg-foreground text-background disabled:opacity-30 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Save Keys
          </button>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            Keys stay in this browser. Never in chat or GitHub. Isolated margin only.
          </p>
        </>
      ) : (
        <>
          <div className="font-mono text-xs space-y-1 mb-3">
            <div className="text-muted-foreground">Key: {creds.apiKey.slice(0, 6)}…{creds.apiKey.slice(-4)}</div>
            {liveAccount && (
              <>
                <div className="border-t border-foreground/30 pt-1">Available: ${liveAccount.available.toFixed(2)}</div>
                <div>Margin: ${liveAccount.margin.toFixed(2)}</div>
                <div className={liveAccount.unrealized < 0 ? "text-accent" : ""}>
                  Unrealized: ${liveAccount.unrealized.toFixed(2)}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setLiveAcked(!liveAcked)}
            className={cn(
              "w-full py-2 text-xs font-bold uppercase tracking-wider border-2 transition-colors",
              liveAcked
                ? "border-accent bg-accent text-accent-foreground"
                : "border-foreground hover:bg-foreground hover:text-background",
            )}
          >
            {liveAcked ? "Stand Down" : "Go Live"}
          </button>
          <button onClick={clear} className="w-full py-1 mt-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-accent">
            Remove Keys
          </button>
        </>
      )}
    </div>
  );
}