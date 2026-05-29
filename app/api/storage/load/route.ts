import { NextResponse } from "next/server";
import { getStableIdentityKey } from "../../../server/auth_identity";
import MongoDbClient from "../../../server/mongodb_client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const identityKey = await getStableIdentityKey();
    if (!identityKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mongoClient = MongoDbClient.getInstance();
    const appState = await mongoClient.loadExportedState(identityKey);

    return NextResponse.json(appState, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
