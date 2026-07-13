import { auth } from "@/auth";
import { LibraryView } from "./LibraryView";

export default async function LibraryPage() {
  const session = await auth();
  return <LibraryView isLocal={!session?.user?.id} />;
}
