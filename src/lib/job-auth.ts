export function authorizedJobRequest(request: Request): boolean {
  const expected = process.env.RESULT_SYNC_SECRET;
  if (!expected) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = request.headers.get("x-sync-secret");
  const urlSecret = new URL(request.url).searchParams.get("secret");

  return bearer === expected || header === expected || urlSecret === expected;
}
