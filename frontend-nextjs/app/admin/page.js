'use client';

import { useEffect, useMemo, useState } from 'react';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('Sự kiện mới');
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
      setMessage(json.message || 'Không tải được danh sách sự kiện');
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
      setMessage(json.message || 'Tạo sự kiện thất bại');
      return;
    }

    setMessage('Đã tạo sự kiện');
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
      setMessage(json.message || 'Đặt sự kiện active thất bại');
      return;
    }

    setMessage('Đã chuyển sự kiện active');
    await loadEvents();
  }

  return (
    <main className="container">
      <section className="card">
        <h1>Quản trị sự kiện</h1>
        <p>Nhập Admin Key để quản trị sự kiện.</p>
        <input
          placeholder="Admin key"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
        />
        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>Tạo sự kiện mới</h2>
        <form onSubmit={createEvent}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên sự kiện" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" />
          <input
            value={publicUrl}
            onChange={(e) => setPublicUrl(e.target.value)}
            placeholder="Public URL dự án con"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả"
          />
          <button>Tạo sự kiện</button>
        </form>
      </section>

      <section className="card">
        <h2>Danh sách sự kiện</h2>
        {events.map((ev) => (
          <div key={ev._id} className="card">
            <strong>{ev.name}</strong>
            <p>Slug: {ev.slug}</p>
            <p>Public URL: {ev.publicUrl || '(chưa cài đặt)'}</p>
            <p>Active: {ev.isActive ? 'Yes' : 'No'}</p>
            <button onClick={() => setActive(ev._id)}>Đặt làm sự kiện chính</button>
          </div>
        ))}
      </section>
    </main>
  );
}
