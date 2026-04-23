# TruckerLog — Deployment Guide

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs at http://localhost:5173

---

## Production Deployment

### Backend → Railway (free tier)

1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select the `backend/` folder
3. Railway auto-detects Python via `requirements.txt`
4. Set environment variables:
   - `SECRET_KEY` = any long random string
   - `DEBUG` = False
   - `ALLOWED_HOSTS` = your-app.up.railway.app
5. Deploy — Railway runs `gunicorn backend.wsgi --bind 0.0.0.0:$PORT`
6. Copy the public URL (e.g. `https://truckerlog-backend.up.railway.app`)

### Frontend → Vercel (free)

1. Go to https://vercel.com → New Project → Import GitHub repo
2. Set **Root Directory** to `frontend`
3. Add Environment Variable:
   - `VITE_API_URL` = `https://YOUR-RAILWAY-URL.up.railway.app/api`
4. Deploy — Vercel auto-detects Vite

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend | Django 6 + Django REST Framework |
| Frontend | React + Vite + Tailwind CSS |
| Routing | OSRM (free, no key needed) |
| Geocoding | Nominatim/OSM (free, no key needed) |
| Map | Leaflet + OpenStreetMap |
| ELD Log | Custom SVG renderer |

## HOS Rules Implemented (FMCSA 49 CFR Part 395)

- ✅ 11-hour driving limit per shift
- ✅ 14-hour driving window per shift
- ✅ 30-minute break after 8 cumulative driving hours
- ✅ 10-hour mandatory rest between shifts
- ✅ 70-hour / 8-day cycle tracking
- ✅ 1-hour pickup + 1-hour dropoff (on-duty time)
- ✅ Fuel stop every 1,000 miles (0.5h)
- ✅ Multi-day log sheet generation
