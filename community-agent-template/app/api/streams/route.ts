import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getActiveStreams,
  hasActionForThread,
  isStoreConfigured,
} from "@/lib/store";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json([], { status: 401 });
  }
  if (!isStoreConfigured()) {
    return Response.json([]);
  }

  const streams = await getActiveStreams();
  const results = await Promise.all(
    streams.map(async (s) => ({
      ...s,
      isFollowUp: await hasActionForThread(s.threadId),
    }))
  );
  return Response.json(results);
}
