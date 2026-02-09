import Link from "next/link";
import { listDatasets } from "@/lib/api";

export default async function DatasetsPage() {
  const datasets = await listDatasets();

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">データセット一覧</h1>

      <ul className="space-y-2">
        {datasets.map((d) => (
          <li key={d.slug}>
            <Link className="underline" href={`/d/${d.slug}`}>
              {d.name} <span className="text-gray-500">({d.slug})</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

