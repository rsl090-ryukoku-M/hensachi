import type {
  Dataset,
  MetricHensachiResponse,
  UserMetricHensachiResponse,
  ApexRankHensachiResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

if (!API_BASE) {
  throw new Error("NEXT_PUBLIC_API_BASE is not set. Check .env.local");
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export function listDatasets() {
  return apiGet<Dataset[]>("/datasets/");
}

export function listDatasetMetrics(datasetSlug: string) {
  return apiGet<{ key: string; name: string; unit: string }[]>(
    `/datasets/${datasetSlug}/metrics/`
  );
}

export function getMetricHensachi(datasetSlug: string, metricKey: string) {
  return apiGet<MetricHensachiResponse>(
    `/datasets/${datasetSlug}/metrics/${metricKey}/hensachi/`
  );
}

export function submitUserValue(
  userMetricSlug: string,
  userHash: string,
  value: number
) {
  return apiPost<{ detail: string }>(`/u/${userMetricSlug}/submit/`, {
    user_hash: userHash,
    value,
  });
}

// --- hensachi response (extended) ---
export type UserMetricHensachiExtendedResponse = UserMetricHensachiResponse & {
  diff?: string; // x - mean
  rank?: number; // 1 is best
  percentile?: string; // 0-100 (lower -> higher)
  top_percent?: string; // 0-100 (higher -> smaller)
};

export function getUserMetricHensachi(userMetricSlug: string, x: number) {
  return apiGet<UserMetricHensachiExtendedResponse>(
    `/u/${userMetricSlug}/hensachi/${x}/`
  );
}

// --- history ---
export type UserMetricHistoryItem = {
  id: number;
  value: string;
  created_at: string | null;
};

export type UserMetricHistoryResponse = {
  user_metric: string;
  user_hash: string;
  limit: number;
  items: UserMetricHistoryItem[];
};

export function getUserMetricHistory(
  userMetricSlug: string,
  userHash: string,
  limit = 10
) {
  const qs = new URLSearchParams({
    user_hash: userHash,
    limit: String(limit),
  });
  return apiGet<UserMetricHistoryResponse>(
    `/u/${userMetricSlug}/history/?${qs.toString()}`
  );
}

// --- apex rank hensachi ---
export function getApexRankHensachi(rankCode: string) {
  return apiGet<ApexRankHensachiResponse>(`/apex/rank/hensachi/${rankCode}/`);
}

