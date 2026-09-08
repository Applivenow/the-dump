import LogTable from "@/components/dump/LogTable";
import { useDumpStore } from "@/lib/store";

export default function Auto() {
  const { log, clearLog } = useDumpStore();
  return <LogTable log={log} onClear={clearLog} />;
}