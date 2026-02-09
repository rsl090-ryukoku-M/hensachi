import Link from "next/link";
import { listDatasetMetrics } from "@/lib/api";

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ datasetSlug: string }>;
}) {
  const { datasetSlug } = await params;
  const metrics = await listDatasetMetrics(datasetSlug);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">指標一覧</h1>
      <p className="text-gray-600">dataset: {datasetSlug}</p>

      <ul className="space-y-2">
        {metrics.map((m) => (
          <li key={m.key}>
            <Link className="underline" href={`/d/${datasetSlug}/m/${m.key}`}>
              {m.name}{" "}
              <span className="text-gray-500">
                ({m.key}) {m.unit ? `unit=${m.unit}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link className="underline" href="/datasets">
        ← データセット一覧へ
      </Link>
    </main>
  );
}

