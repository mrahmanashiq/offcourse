"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { deleteCourse } from "@/server/courses";
import { deleteHandle } from "@/lib/fs/handleStore";
import styles from "./library.module.css";

export function CourseCardMenu({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onRemove() {
    if (!confirm(`Remove “${title}” from your library?\n\nYour video files stay on your drive — only this library entry is removed.`)) return;
    startTransition(async () => {
      await deleteCourse(id);
      try { await deleteHandle(id); } catch { /* handle may not exist on this device */ }
      router.refresh();
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={styles.menuBtn} aria-label={`Actions for ${title}`} disabled={pending}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menuContent} align="end" sideOffset={6}>
          <DropdownMenu.Item
            className={styles.menuItemDanger}
            onSelect={(e) => { e.preventDefault(); onRemove(); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {pending ? "Removing…" : "Remove course"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
