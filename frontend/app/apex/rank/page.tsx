"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ✅ 相対import（@が壊れている前提）
import type { ApexRankHensachiResponse } from "../../../src/lib/types";
import { getApexRankHensachi } from "../../../src/lib/api";

type RankOption = { code: string; label: string };

function roman(n: number) {
  const map: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };
  return map[n] ?? String(n);
}

function buildTierOptions(tier: string): RankOption[] {
  return [4, 3, 2, 1].map((div) => ({
    code: `${tier}-${div}`,
    label: `${tier[0].toUpperCase()}${tier.slice(1)} ${roman(div)}`,
  }));
}

function toNumberSafe(s?: string): number | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmtPercent(n: number | null): string {
  if (n == null) return "-";
  // "7" でも "7.12" でも綺麗に出す
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}%`;
}

function fmtHensachi(s?: string): string {
  if (!s) return "-";
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return String(Math.round(n * 10) / 10);
}

function buildInsight(topP: number | null, bottomP: number | null): string {
  if (topP != null) {
    // top_percent: 小さいほど強い（上位◯%）
    if (topP <= 1) return `かなり上位（上位${fmtPercent(topP)}）です。`;
    if (topP <= 5) return `強い（上位${fmtPercent(topP)}）です。`;
    if (topP <= 20) return `平均より上（上位${fmtPercent(topP)}）です。`;
    if (topP <= 50) return `だいたい平均付近（上位${fmtPercent(topP)}）です。`;
    return `まだ伸びしろ大（上位${fmtPercent(topP)}）です。`;
  }
  if (bottomP != null) {
    // bottom_percent: 小さいほど弱い（下位◯%）
    if (bottomP <= 20) return `平均より上（下位${fmtPercent(bottomP)}）です。`;
    if (bottomP <= 50) return `だいたい平均付近（下位${fmtPercent(bottomP)}）です。`;
    return `まだ伸びしろ大（下位${fmtPercent(bottomP)}）です。`;
  }
  return `分布情報が不足しているため、偏差値のみ表示しています。`;
}

export default function ApexRankPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const options = useMemo<RankOption[]>(() => {
    return [
      ...buildTierOptions("bronze"),
      ...buildTierOptions("silver"),
      ...buildTierOptions("gold"),
      ...buildTierOptions("platinum"),
      ...buildTierOptions("diamond"),
      { code: "master", label: "Master" },
      { code: "predator", label: "Predator" },
    ];
  }, []);

  const initialRank = sp.get("rank") ?? "platinum-2";

  const [rankCode, setRankCode] = useState<string>(initialRank);
  const [data, setData] = useState<ApexRankHensachiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchRank = useCallback(async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await getApexRankHensachi(code);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRank(rankCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (next: string) => {
    setRankCode(next);

    // URL共有：クエリ更新
    const qs = new URLSearchParams(Array.from(sp.entries()));
    qs.set("rank", next);
    router.replace(`/apex/rank?${qs.toString()}`);
  };

  const topP = toNumberSafe(data?.top_percent);
  const bottomP = toNumberSafe(data?.bottom_percent);
  const insight = buildInsight(topP, bottomP);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
        Apex ランク偏差値
      </h1>
      <p style={{ marginTop: 0, opacity: 0.85, marginBottom: 14 }}>
        ランクを選ぶと、<b>偏差値</b>と<b>上位%</b>（または下位%）で位置づけを表示します。
      </p>

      {/* 操作 */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontWeight: 700 }}>ランク</label>
        <select
          value={rankCode}
          onChange={(e) => onChange(e.target.value)}
          style={{ padding: "8px 10px", minWidth: 240 }}
        >
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label} ({o.code})
            </option>
          ))}
        </select>

        <button
          onClick={() => fetchRank(rankCode)}
          disabled={loading}
          style={{
            padding: "8px 12px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          {loading ? "取得中..." : "更新"}
        </button>

        <span style={{ opacity: 0.75, fontSize: 13 }}>
          共有URL: <code>?rank={rankCode}</code>
        </span>
      </div>

      {/* 目安説明 */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>偏差値の目安</div>
        <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
          <li>
            <b>50</b>：平均
          </li>
          <li>
            <b>60</b>：平均よりかなり上
          </li>
          <li>
            <b>70</b>：上位層（かなり強い）
          </li>
        </ul>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          ※ 上位% は「全体のうちどれくらい上にいるか」を直接示すので、初心者にも分かりやすいです。
        </div>
      </div>

      {/* エラー */}
      {error ? (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>エラー</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
            ※ backend側でその rank_code が未対応の場合もここに出ます。
          </div>
        </div>
      ) : null}

      {/* 結果 */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>結果</div>
          <div style={{ opacity: 0.8 }}>{data?.rank_code ?? rankCode}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ opacity: 0.8, fontSize: 13 }}>偏差値</div>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.05 }}>
            {fmtHensachi(data?.hensachi)}
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{insight}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10 }}>
            <div style={{ opacity: 0.8, fontSize: 13 }}>上位%</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {fmtPercent(topP)}
            </div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
              小さいほど強い（例：上位5%）
            </div>
          </div>

          <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10 }}>
            <div style={{ opacity: 0.8, fontSize: 13 }}>下位%</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {fmtPercent(bottomP)}
            </div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
              小さいほど強い（例：下位20%）
            </div>
          </div>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>
            meta（詳細）
          </summary>
          <pre
            style={{
              marginTop: 10,
              marginBottom: 0,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #eee",
              overflowX: "auto",
              fontSize: 12,
              background: "#fafafa",
            }}
          >
            {JSON.stringify(data?.meta ?? null, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

