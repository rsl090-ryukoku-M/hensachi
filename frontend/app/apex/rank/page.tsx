import { Suspense } from "react";
import ApexRankClient from "./ApexRankClient";

export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams?: { rank?: string };
}) {
  const initialRank = searchParams?.rank ?? "platinum-2";

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ApexRankClient initialRank={initialRank} />
    </Suspense>
  );
}

