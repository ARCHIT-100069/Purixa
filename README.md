# Purixa — Data Cleaning, Refined

A full-stack data cleaning web application built with **FastAPI** + **React + TailwindCSS**.

## Features

- 📁 Upload CSV, JSON, or TSV files (up to 500MB)
- ⚙️ 6 configurable cleaning operations
- 🚀 Chunked streaming processing for files > 50MB
- 📊 Real-time progress bar and live cleaning log
- 👁️ Preview cleaned data before downloading
- 💾 Download as CSV or JSON

## Cleaning Operations

| Operation | Description |
|-----------|-------------|
| Remove Duplicates | Drop exact duplicate rows |
| Handle Missing Values | Fill numeric with mean, text with mode |
| Fix Data Types | Convert numeric strings to int/float |
| Normalize Text | Trim & lowercase text columns |
| Remove Outliers | IQR method (3× fence) for numeric columns |
| Fix Formatting | Emails, phones, dates, names standardized |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file → returns file_id + stats |
| POST | `/api/clean/{file_id}` | Start cleaning job → returns job_id |
| GET | `/api/status/{job_id}` | Poll progress, log, and stats |
| GET | `/api/preview/{job_id}` | First 20 rows + summary |
| GET | `/api/download/{job_id}?format=csv` | Stream download |
| DELETE | `/api/cleanup/{file_id}` | Delete temp files |

## Project Structure

```
purixa/
├── backend/
│   ├── main.py              # FastAPI app + CORS
│   ├── routers/
│   │   ├── upload.py        # File upload endpoint
│   │   ├── clean.py         # Cleaning job management
│   │   └── export.py        # Preview + download endpoints
│   ├── services/
│   │   ├── file_handler.py  # File I/O and stats
│   │   ├── cleaner.py       # In-memory cleaning (< 50MB)
│   │   └── chunked_cleaner.py # Chunked pipeline (> 50MB)
│   ├── models/
│   │   └── schemas.py       # Pydantic models
│   ├── temp/                # Temp storage (auto-created)
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/      # All UI components
    │   ├── pages/App.jsx    # 4-step main page
    │   ├── hooks/           # useCleaningJob polling hook
    │   └── utils/api.js     # Axios API calls
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```
