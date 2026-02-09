import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-8">
      {/* ヘッダー */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">偏差値ワールド</h1>
        <p className="text-gray-700">
          いろんな数値を「平均との差＝偏差値」で直感的に見るサイト
        </p>
      </header>

      {/* メイン導線：Apex */}
      <section className="border rounded-xl p-5 space-y-3 bg-white">
        <h2 className="text-xl font-semibold">🎮 Apex ランク偏差値</h2>
        <p className="text-gray-700">
          自分のランクが、全体の中でどの位置なのかを
          <span className="font-medium"> 偏差値と上位%</span>で確認できます。
        </p>

        <Link
          href="/apex/rank"
          className="inline-block px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
        >
          Apexランク偏差値を測る →
        </Link>
      </section>

      {/* サブ導線：データセット */}
      <section className="border rounded-xl p-5 space-y-3 bg-gray-50">
        <h2 className="text-lg font-semibold">📊 データセット偏差値</h2>
        <p className="text-gray-700 text-sm">
          既存データセットに基づく各種指標の偏差値を確認できます。
          （やや上級者向け）
        </p>

        <Link
          href="/datasets"
          className="inline-block px-4 py-2 border rounded-lg hover:bg-white text-sm"
        >
          データセット一覧を見る →
        </Link>
      </section>
    </main>
  );
}

