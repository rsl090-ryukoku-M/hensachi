import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "偏差値ワールド",
  description: "いろんな数値を偏差値で見るサイト",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
