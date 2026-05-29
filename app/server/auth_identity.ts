import { auth } from "@/auth";

const IDENTITY_PREFIX = "google-email:";

export async function getStableIdentityKey(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  return `${IDENTITY_PREFIX}${email}`;
}
