import { redirect } from 'next/navigation';

async function getActiveEvent() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/active-event`, {
    cache: 'no-store'
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function HomePage() {
  const active = await getActiveEvent();

  if (active?.publicUrl) {
    redirect(active.publicUrl);
  }

  return (
    <main className="container">
      <div className="card">Chua co su kien active co publicUrl. Vao /admin de cau hinh.</div>
    </main>
  );
}
