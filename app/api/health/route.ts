// Proves the API half of the app is alive and reachable from the UI.
export function GET() {
  return Response.json({ ok: true });
}
