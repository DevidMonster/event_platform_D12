'use client';

import { useEffect, useMemo, useState } from 'react';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('Su kien moi');
  const [slug, setSlug] = useState('su-kien-moi');
  const [publicUrl, setPublicUrl] = useState('http://localhost:3001');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-admin-key': adminKey
    }),
    [adminKey]
  );

  async function loadEvents() {
    if (!adminKey) return;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/events`, { headers });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || 'Khong tai duoc danh sach event');
      return;
    }
    setEvents(json);
  }

  useEffect(() => {
    loadEvents();
  }, [adminKey]);

  async function createEvent(e) {
    e.preventDefault();
    setMessage('');

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, slug, publicUrl, description })
    });

    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || 'Tao event that bai');
      return;
    }

    setMessage('Da tao event');
    await loadEvents();
  }

  async function setActive(id) {
    setMessage('');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/events/${id}/active`, {
      method: 'PATCH',
      headers
    });

    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || 'Set active that bai');
      return;
    }

    setMessage('Da chuyen event active');
    await loadEvents();
  }

  return (
    <main className="container">
      <section className="card">
        <h1>Admin Event</h1>
        <p>Nhap Admin Key de quan tri su kien.</p>
        <input
          placeholder="Admin key"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
        />
        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>Tao su kien moi</h2>
        <form onSubmit={createEvent}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ten su kien" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" />
          <input
            value={publicUrl}
            onChange={(e) => setPublicUrl(e.target.value)}
            placeholder="Public URL project con"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mo ta"
          />
          <button>Tao event</button>
        </form>
      </section>

      <section className="card">
        <h2>Danh sach su kien</h2>
        {events.map((ev) => (
          <div key={ev._id} className="card">
            <strong>{ev.name}</strong>
            <p>Slug: {ev.slug}</p>
            <p>Public URL: {ev.publicUrl || '(chua set)'}</p>
            <p>Active: {ev.isActive ? 'Yes' : 'No'}</p>
            <button onClick={() => setActive(ev._id)}>Dat lam su kien chinh</button>
          </div>
        ))}
      </section>
    </main>
  );
}
