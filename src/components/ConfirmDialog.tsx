"use client";
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmOpts = { title: string; body?: string; confirmText?: string; cancelText?: string; destructive?: boolean };
type Pending = { opts: ConfirmOpts; resolve: (v: boolean) => void };
const EVENT = "offcourse:confirm";

// Styled replacement for window.confirm(). Usage: if (await confirmDialog({...})) {...}
export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { opts, resolve } }));
  });
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    function onConfirm(e: Event) {
      setPending((e as CustomEvent<Pending>).detail);
    }
    window.addEventListener(EVENT, onConfirm as EventListener);
    return () => window.removeEventListener(EVENT, onConfirm as EventListener);
  }, []);

  function done(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) done(false); }}>
      {pending && (
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{pending.opts.title}</DialogTitle>
            {pending.opts.body && <DialogDescription className="whitespace-pre-line">{pending.opts.body}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => done(false)}>{pending.opts.cancelText ?? "Cancel"}</Button>
            <Button variant={pending.opts.destructive ? "destructive" : "default"} onClick={() => done(true)}>
              {pending.opts.confirmText ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
