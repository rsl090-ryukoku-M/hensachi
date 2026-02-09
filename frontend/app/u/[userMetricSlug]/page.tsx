"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  submitUserValue,
  getUserMetricHensachi,
  getUserMetricHistory,
  type UserMetricHistoryItem,
  type UserMetricHensachiExtendedResponse,
} from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatDateTime(iso: string | null): string {
  if (!iso) return "（日時なし）";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function fmt2(x: unknown): string {
  const n = Number(x);
  if (Number.isNaN(n)) return String(x ?? "");
  return n.toFixed(2);
}

type ChartPoint = {
  idx: number;
  value: number;
  label: string;
};

export default function UserMetricPage() {
  const params = useParams<{ userMetricSlug?: string }>();
  const userMetricSlug = params?.userMetricSlug;

  if (!userMetricSlug) {
    return (
      <main className="p-6 max-w-md mx-auto space-y-2">
        <h1 className="text-xl font-bold">エラー</h1>
        <p className="text-red-600">
          userMetricSlug が取れませんでした（useParamsが空）
        </p>
        <p className="text-xs text-gray-600">
          params: <span className="font-mono">{JSON.stringify(params)}</span>
        </p>
      </main>
    );
  }

  const KEY = "hensachi_user_hash";

  const [userHash, setUserHash] = useState<string | null>(null);

  const [value, setValue] = useState("");
  const [result, setResult] = useState<UserMetricHensachiExtendedResponse | null>(
    null
  );

  const [history, setHistory] = useState<UserMetricHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let h = localStorage.getItem(KEY);
    if (!h) {
      h = crypto.randomUUID();
      localStorage.setItem(KEY, h);
    }
    setUserHash(h);
  }, []);

  async function refreshHistory(h: string) {
    try {
      setLoadingHistory(true);
      const res = await getUserMetricHistory(userMetricSlug, h, 10);
      setHistory(res.items);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (!userHash) return;
    refreshHistory(userHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHash, userMetricSlug]);

  const parsedValue = useMemo(() => {
    const s = value.trim();
    if (s === "")
      return { ok: false as const, x: null as any, message: "値を入力してください" };
    const x = Number(s);
    if (Number.isNaN(x))
      return { ok: false as const, x: null as any, message: "数値を入力してください" };
    return { ok: true as const, x };
  }, [value]);

  async function computeOnly(x: number) {
    const res = await getUserMetricHensachi(userMetricSlug, x);
    setResult(res);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      if (!userHash) {
        setError("user_hash の初期化に失敗しました（再読み込みしてください）");
        return;
      }
      if (!parsedValue.ok) {
        setError(parsedValue.message);
        return;
      }

      setLoading(true);
      const x = parsedValue.x;

      await submitUserValue(userMetricSlug, userHash, x);
      await computeOnly(x);
      await refreshHistory(userHash);
    } catch (e: any) {
      setError(e.message ?? "error");
    } finally {
      setLoading(false);
    }
  }

  async function onClickHistoryItem(item: UserMetricHistoryItem) {
    try {
      setError(null);
      const x = Number(item.value);
      if (Number.isNaN(x)) return;
      setValue(String(x));
      setLoading(true);
      await computeOnly(x);
    } catch (e: any) {
      setError(e.message ?? "error");
    } finally {
      setLoading(false);
    }
  }

  const chartData: ChartPoint[] = useMemo(() => {
    // history は「新しい順」で来るので、グラフは「古い→新しい」にする
    const items = [...history].reverse();
    const points: ChartPoint[] = [];
    for (let i = 0; i < items.length; i++) {
      const v = Number(items[i].value);
      if (Number.isNaN(v)) continue;
      points.push({
        idx: i + 1,
        value: v,
        label: items[i].created_at ? formatDateTime(items[i].created_at) : `#${i + 1}`,
      });
    }
    return points;
  }, [history]);

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{userMetricSlug} 偏差値チェック</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="値を入力"
          className="border p-2 w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? "計算中..." : "偏差値を見る"}
        </button>
      </form>

      {userHash && (
        <p className="text-xs text-gray-500">
          user_hash: <span className="font-mono">{userHash}</span>
        </p>
      )}

      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <div className="border p-4 space-y-2">
          <div className="space-y-1">
            <p>あなたの値: {result.x}</p>
            <p className="font-bold text-lg">偏差値: {fmt2(result.hensachi)}</p>
            <p className="text-sm text-gray-600">
              平均: {fmt2(result.mean)} / 標準偏差: {fmt2(result.std)}
            </p>
            <p className="text-sm text-gray-600">件数: {result.count}</p>
          </div>

          <div className="border-t pt-2 space-y-1 text-sm">
            {result.diff != null && (
              <p className="text-gray-700">
                平均との差: <span className="font-mono">{fmt2(result.diff)}</span>
              </p>
            )}
            {result.rank != null && (
              <p className="text-gray-700">
                順位: <span className="font-mono">{result.rank}</span> 位
              </p>
            )}
            {result.top_percent != null && (
              <p className="text-gray-700">
                上位: <span className="font-mono">{fmt2(result.top_percent)}</span> %
              </p>
            )}
          </div>
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">推移（直近10件）</h2>
          <button
            type="button"
            onClick={() => userHash && refreshHistory(userHash)}
            className="text-sm underline"
            disabled={!userHash || loadingHistory}
          >
            {loadingHistory ? "更新中..." : "更新"}
          </button>
        </div>

        {chartData.length < 2 ? (
          <p className="text-sm text-gray-600">
            グラフを表示するにはデータが2件以上必要です
          </p>
        ) : (
          <div className="border p-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="idx" />
                  <YAxis />
                  <Tooltip
                    formatter={(v) => [v, "value"]}
                    labelFormatter={(label, payload) => {
                      const p = (payload && payload[0] && payload[0].payload) as
                        | ChartPoint
                        | undefined;
                      return p?.label ?? `#${label}`;
                    }}
                  />
                  <Line type="monotone" dataKey="value" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※ 直近10件の「値」の推移（古い→新しい）
            </p>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">直近10件（クリックで再計算）</h2>

        {history.length === 0 ? (
          <p className="text-sm text-gray-600">まだ履歴がありません</p>
        ) : (
          <ul className="border divide-y">
            {history.map((h) => (
              <li key={h.id} className="p-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onClickHistoryItem(h)}
                  className="text-left flex-1"
                  disabled={loading}
                >
                  <div className="font-mono">{h.value}</div>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(h.created_at)}
                  </div>
                </button>
                <span className="text-xs text-gray-400 ml-3">→再計算</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

