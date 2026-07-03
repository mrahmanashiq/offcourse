import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import styles from "./login.module.css";

export default async function LoginPage() {
  if (await auth()) redirect("/library");
  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Offcourse</h1>
        <p className={styles.sub}>Sign in to access your course library.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/library" });
          }}
        >
          <button className={styles.btn} type="submit">
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
