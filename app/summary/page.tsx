import SummaryScreen from "@/components/SummaryScreen";
import { getConfig } from "@/lib/config";

export default function SummaryPage() {
  return <SummaryScreen config={getConfig()} />;
}
