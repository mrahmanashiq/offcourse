import { auth } from "@/auth";
import { LibraryView } from "./LibraryView";

function firstName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const part = raw.split(/[\s@]/)[0];
  if (!part) return null;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export default async function LibraryPage() {
  const session = await auth();
  const owner = firstName(session?.user?.name ?? session?.user?.email);
  const user = session?.user?.id
    ? { name: session.user.name ?? null, email: session.user.email ?? null, image: session.user.image ?? null }
    : null;
  return <LibraryView isLocal={!session?.user?.id} owner={owner} user={user} />;
}
