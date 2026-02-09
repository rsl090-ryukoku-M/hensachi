import { getMetricHensachi } from "@/lib/api";

export default async function MetricPage({
  params,
}: {
  params: Promise<{ datasetSlug: string; metricKey: string }>;
}) {
  const { datasetSlug, metricKey } = await params;

  const data = await getMetricHensachi(datasetSlug, metricKey);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">
        {data.dataset} / {data.metric} 偏差値
      </h1>

      <p className="text-gray-700">
        件数: {data.count} / 平均: {data.mean} / 標準偏差: {data.std} / 単位:{" "}
        {data.unit}
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">順位</th>
            <th className="text-left p-2">名前</th>
            <th className="text-left p-2">値</th>
            <th className="text-left p-2">偏差値</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((r, idx) => (
            <tr key={r.item.key} className="border-b">
              <td className="p-2">{idx + 1}</td>
              <td className="p-2">{r.item.name}</td>
              <td className="p-2">{r.value}</td>
              <td className="p-2">{r.hensachi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

