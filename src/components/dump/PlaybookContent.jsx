export default function PlaybookContent() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="font-display font-black text-4xl mb-2">The Playbook</h2>
      <p className="dateline mb-6">SHORT-ONLY DESK · BITUNIX USDT-M · NOT FINANCIAL ADVICE</p>

      <section className="mb-8">
        <h3 className="font-display font-bold text-2xl border-b-2 border-foreground pb-1 mb-3">Size &amp; Risk</h3>
        <ul className="font-body space-y-1.5 text-base list-disc pl-5">
          <li>$3,000 ticket · 10x · ~$300 isolated · $100 max loss</li>
          <li>Isolated margin only</li>
          <li>Ready = 12–35% off high. 4h red. Confirmed still fails.</li>
          <li>Exit: +1R cover half, stop to entry + fees, trail the rest. Do not auto-exit at 2.5R.</li>
          <li>Cover when buying steps in.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="font-display font-bold text-2xl border-b-2 border-foreground pb-1 mb-3">Two Books</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-l-2 border-accent pl-4">
            <h4 className="font-display font-bold text-lg text-accent mb-1">Formula A — DUMP</h4>
            <p className="font-body text-sm">
              High-vol memes. ≥ $10M. 12–35% off high. No BTC/ETH/SOL/ARB. No RAY/ORCA/JUP-class. Selling. 4h red.
            </p>
          </div>
          <div className="border-l-2 border-accent pl-4">
            <h4 className="font-display font-bold text-lg text-accent mb-1">Formula B — LIST</h4>
            <p className="font-body text-sm">
              Help Center listing. Never the first hour. 12–35% off listing high. ≥ $500k. 4h red. 24/7, honed 1–6 AM ET. 哈基米 → HAJIMI.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="font-display font-bold text-2xl border-b-2 border-foreground pb-1 mb-3">Off-Chat</h3>
        <ul className="font-body space-y-1.5 text-base list-disc pl-5">
          <li>Off-chat may send isolated $300 / $100-stop live shorts if Live is acked.</li>
          <li>Off-chat ride: scale / trail / cover on every live short.</li>
          <li>Never print API keys.</li>
          <li>If note is "No Ready fill. No new listing." stay silent.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="font-display font-bold text-2xl border-b-2 border-foreground pb-1 mb-3">The Core Line</h3>
        <blockquote className="font-display text-2xl italic border-l-4 border-accent pl-4 leading-snug">
          Don't short the pump. Don't short the first drop. Short the failed attempt to restart the pump.
        </blockquote>
      </section>

      <section>
        <h3 className="font-display font-bold text-2xl border-b-2 border-foreground pb-1 mb-3">Go Live</h3>
        <p className="font-body text-base">
          Bitunix card on the Desk → paste API key + secret → Save and Go Live. Keys stay in this browser.
          Never put them in chat or GitHub. Isolated only.
        </p>
      </section>
    </div>
  );
}