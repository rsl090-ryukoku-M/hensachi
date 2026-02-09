import { getMetricHensachi } from "@/lib/api";

type PageProps = {
  params: Promise<{ datasetSlug: string; metricKey: string }> | { datasetSlug: string; metricKey: string };
};

export default async function MetricPage({ params }: PageProps) {
  const p = await params; // params が Promise の環境でも確実に動く

  const data = await getMetricHensachi(p.datasetSlug, p.metricKey);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">
        {data.dataset} / {data.metric} 偏差値
      </h1>

      <div className="text-sm text-gray-700">
        件数: {data.count} / 平均: {data.mean} / 標準偏差: {data.std} / 単位:{" "}
        {data.unit || "—"}
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">順位</th>
              <th className="text-left p-3">名前</th>
              <th className="text-right p-3">値</th>
              <th className="text-right p-3">偏差値</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r, idx) => (
              <tr key={r.item.key} className="border-t">
                <td className="p-3">{idx + 1}</td>
                <td className="p-3">{r.item.name}</td>
                <td className="p-3 text-right">{r.value}</td>
                <td className="p-3 text-right font-semibold">{r.hensachi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
