export function getOutboxAuthToken(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const secret = process.env.OUTBOX_CONSUMER_SECRET;
  if (!secret) return null;
  return token === secret ? token : null;
}
