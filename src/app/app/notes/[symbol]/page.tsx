import { redirect } from 'next/navigation';

export default async function NameNoteRedirect({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  redirect(`/app/forecast/${encodeURIComponent(symbol)}`);
}
