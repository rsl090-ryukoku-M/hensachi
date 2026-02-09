"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApexRankHensachi } from "@/lib/api";
import type { ApexRankHensachiResponse } from "@/lib/types";

type RankOption = { code: string; label: string };

const RANK_OPTIONS: RankOption[] = [
  { code: "bronze-4", label: "Bronze IV" },
  { code: "bronze-3", label: "Bronze III" },
  { code: "bronze-2", label: "Bronze II" },
  { code: "bronze-1", label: "Bronze I" },
  { code: "silver-4", label: "Silver IV" },
  { code: "silver-3", label: "Silver III" },
  { code: "silver-2", label: "Silver II" },
  { code: "silver-1", label: "Silver I" },
  { code: "gold-4", label: "Gold IV" },
  { code: "gold-3", label: "Gold III" },
  { code: "gold-2", label: "Gold II" },
  { code: "gold-1", label: "Gold I" },
  { code: "platinum-4", label: "Platinum IV" },
  { code: "platinum-3", label: "Platinum III" },
  { code: "platinum-2", label: "Platinum II" },
  { code: "platinum-1", label: "Platinum I" },
  { code: "diamond-4", label: "Diamond IV" },
  { code: "diamond-3", label: "Diamond III" },
  { code: "diamond-2", label: "Diamond II" },
  { code: "diamond-1", label: "Diamond I" },
  { code: "master", label: "Master" },
  { code: "predator", label: "Predator" },
];

function fmt2(x: unknown): string {
  const n = Number(x);
  if (Number.isNaN(n)) return String(x ?? "");
  return n.toFixed(2);
}

export default function ApexRankClient({ initialRank }: { initialRank: string }) {
  const router = useRouter();

  const [rankCode, setRankCode] = useState<string>(initialRank);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApexRankHensachiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URLに反映（共有用）
  useEffect(() => {
    const qs = new URLSearchParams();
    qs.set("rank", rankCode);
    router.replace(`/apex/rank?${qs.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankCode]);

  const label = useMemo(() => {
    return RANK_OPTIONS.find((r) => r.code === rankCode)?.label ?? rankCode;
  }, [rankCode]);

  async function onFetch() {
    try {
      setError(null);
      setLoading(true);
      const res = await getApexRankHensachi(rankCode);
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "fetch error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Apex ランク偏差値</h1>
      <p className="text-sm text-gray-600">
        ランクを選んで「取得」を押すと、分布ベースで偏差値・上位%を表示します。
      </p>

      <div className="flex gap-2 items-center">
        <select
          className="border p-2 rounded"
          value={rankCode}
          onChange={(e) => setRankCode(e.target.value)}
        >
          {RANK_OPTIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>

        <button
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={onFetch}
          disabled={loading}
        >
          {loading ? "取得中..." : "取得"}
        </button>
      </div>

      <div className="text-xs text-gray-500">
        選択中: <span className="font-mono">{label}</span>（
        <span className="font-mono">{rankCode}</span>）
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {data && (
        <div className="border p-4 rounded space-y-2">
          <p className="font-bold text-lg">偏差値: {fmt2(data.hensachi)}</p>
          {data.top_percent != null && <p>上位: {fmt2(data.top_percent)} %</p>}
          {data.bottom_percent != null && (
            <p>下位: {fmt2(data.bottom_percent)} %</p>
          )}
          {data.meta && (
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer">meta</summary>
              <pre className="text-xs overflow-auto mt-2">
                {JSON.stringify(data.meta, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </main>
  );
}

