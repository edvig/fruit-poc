import { getConfig } from "@/lib/config";

// The whole product/container/multiplier config the client needs for a
// closing. Fetched once on load; every calculation after that is local.
export function GET() {
  return Response.json(getConfig());
}
