import { auth } from "@/auth";

export default async function UserAvatar() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return (
    <button
      type="button"
      title={session.user.name ?? "Signed in user"}
      aria-label={session.user.name ?? "Signed in user"}
      className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-100"
    >
      {session.user.image ? (
        <img
          src={session.user.image}
          alt="User Avatar"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-xs font-medium text-zinc-700">
          {(session.user.name ?? "U").slice(0, 1).toUpperCase()}
        </span>
      )}
    </button>
  );
}
