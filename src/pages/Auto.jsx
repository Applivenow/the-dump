import LogTable from "@/components/dump/LogTable";
import TradeHistory from "@/components/dump/TradeHistory";
import { useDumpStore } from "@/lib/store";

export default function Auto() {
  const { log, clearLog, paperPositions } = useDumpStore();
  return (
    <div className="space-y-10">
      <TradeHistory positions={paperPositions} />
      <LogTable log={log} onClear={clearLog} />
    </div>
  );
}