import { auth } from "@/auth";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  return <SettingsForm accountName={session?.user?.name ?? ""} email={session?.user?.email ?? null} />;
}
