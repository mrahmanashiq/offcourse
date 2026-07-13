import { PageLoader } from "@/components/PageLoader";

export default function Loading() {
  return (
    <div className="grid h-dvh place-items-center">
      <PageLoader label="Loading course…" />
    </div>
  );
}
