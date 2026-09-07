import ClosingScreen from "@/components/ClosingScreen";
import { getConfig } from "@/lib/config";

// The config is read on the server at build time and handed to the client as
// props, so the product list is in the HTML on first paint — no spinner and no
// API round trip before staff can start a closing.
export default function Home() {
  return <ClosingScreen config={getConfig()} />;
}
