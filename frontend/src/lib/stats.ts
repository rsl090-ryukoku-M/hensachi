export function getOrCreateUserHash(): string {
  if (typeof window === "undefined") return "server";
  const key = "hensachi_user_hash";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  // ざっくり一意なID（本番はUUID推奨）
  const v = `u_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  localStorage.setItem(key, v);
  return v;
}
