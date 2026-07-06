import { NextResponse } from "next/server";
import { createJsonErrorResponse } from "../../common";
import { getStableIdentityKey } from "../../../server/auth_identity";
import MongoDbClient from "../../../server/mongodb_client";
import type { SerializedAppState } from "../../../state/app_state";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const identityKey = await getStableIdentityKey();
    if (!identityKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appState = (await request.json()) as SerializedAppState;

    const mongoClient = MongoDbClient.getInstance();
    await mongoClient.saveExportedState(identityKey, appState);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to save state.");
  }
}
