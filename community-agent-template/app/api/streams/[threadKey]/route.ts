import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getStreamByThreadKey, isStoreConfigured } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadKey: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json(null, { status: 401 });
  }
  if (!isStoreConfigured()) {
    return Response.json(null);
  }

  const { threadKey } = await params;
  const stream = await getStreamByThreadKey(threadKey);
  return Response.json(stream);
}
