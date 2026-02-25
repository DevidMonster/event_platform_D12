# Event Platform (Gateway + Event Projects)

Mo hinh hien tai:

- `frontend-nextjs`: app cha (gateway) de redirect + trang admin
- `event-8-3-nextjs`: app con rieng cho su kien 8/3
- `backend-express`: API + MongoDB Atlas

## 1) Backend (Express)

```bash
cd backend-express
cp .env.example .env
npm install
npm run dev
```

Cap nhat `.env`:

- `MONGODB_URI`: chuoi ket noi Atlas
- `ADMIN_KEY`: key admin
- `CORS_ORIGIN`: `http://localhost:3000,http://localhost:3001`

Backend: `http://localhost:5000`

## 2) Gateway app cha (Next.js)

```bash
cd frontend-nextjs
cp .env.example .env.local
npm install
npm run dev
```

Gateway: `http://localhost:3000`

- `GET /` -> lay `active-event` va redirect sang `publicUrl` cua event do
- `GET /admin` -> CRUD event + set active event

## 3) App con su kien 8/3 (Next.js)

```bash
cd event-8-3-nextjs
cp .env.example .env.local
npm install
npm run dev
```

Event 8/3: `http://localhost:3001`

App su kien da co:

- Giao dien 3 tab: `Trang chu`, `Gui loi chuc`, `MiniGame`
- Card loi chuc dang \"la thu\" voi style ngau nhien
- Auth Firebase: Email/Password + Google sign-in

Can cau hinh them trong `event-8-3-nextjs/.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Can bat providers trong Firebase Console:

- Authentication -> Sign-in method -> `Email/Password` = Enable
- Authentication -> Sign-in method -> `Google` = Enable

## 4) Du lieu event

Event co them truong `publicUrl` de tro den app con.

Vi du event 8/3 duoc seed san:

- `slug`: `8-3-2026`
- `publicUrl`: `http://localhost:3001`

## 5) API chinh

- `GET /api/public/active-event`
- `GET /api/public/events/:slug`
- `POST /api/public/wishes`
- `POST /api/public/wishes/:wishId/like` (toggle tim/bo tim theo tai khoan dang nhap)
- `GET /api/admin/events` (can `x-admin-key`)
- `POST /api/admin/events` (can `x-admin-key`, bat buoc `publicUrl`)
- `PATCH /api/admin/events/:id/active` (can `x-admin-key`)
