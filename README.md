# 🌿 HarvestLink AI

> **Turning scattered harvests into coordinated deliveries.**

AI-powered coordination platform for perishable tomato supply chains. Matches uncertain farm supply with recurring buyer demand and limited transport capacity, while ensuring fair collection access for small producers.

---

## 🎯 Problem

Small tomato farmers lack an intelligent coordination mechanism to match changing harvest quantities and quality with recurring buyer demand and limited transport capacity, while ensuring that collection opportunities are not unfairly concentrated among larger producers.

## 💡 Solution

HarvestLink AI is an AI-powered coordination platform that:

1. **Tracks changing harvests** — Estimated quantities update after sorting
2. **Captures recurring demand** — Buyer orders with quality requirements and frequency
3. **Manages limited transport** — Shared vehicle capacity constraints
4. **Generates AI recommendations** — Intelligent collection and allocation plans
5. **Ensures fairness** — Transparent mechanism to include small producers

## ✨ Key Features

- **AI Coordination Agent** — LLM-powered recommendation with deterministic validation
- **Natural Language Input** — Farmers describe harvests in plain language
- **What-If Analysis** — Explore scenario changes in real-time
- **Fairness Tracking** — Visible small/large producer collection access
- **Rule-Based Fallback** — System works even without AI API
- **Live Dashboard** — KPIs, charts, and allocation metrics

## 🤖 AI Technology

- **Google Gemini** (LLM API) for intelligent coordination
- **Hybrid Architecture**: Deterministic matching engine + AI explanation layer
- **AI Safety**: All LLM output validated by Pydantic schemas and business rules
- The LLM never bypasses backend constraints

## 🏗️ Architecture

```
React Frontend ──→ FastAPI Backend ──→ SQLite Database
                        │
              ┌─────────┼─────────┐
              │         │         │
        Matching    AI Agent   Validation
        Engine     (Gemini)     Layer
              │         │         │
              └─────────┴─────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3, Recharts |
| Backend | Python, FastAPI, Pydantic |
| Database | SQLite (PostgreSQL-ready schema) |
| AI | Google Gemini 1.5 Flash |

## 📊 Database

6 tables: `farmers`, `harvests`, `buyers`, `orders`, `vehicles`, `allocations`

## 📡 API Endpoints

| Group | Endpoints |
|-------|----------|
| Farmers | `POST /api/farmers`, `GET /api/farmers`, `POST /api/harvests`, `GET /api/harvests`, `PUT /api/harvests/{id}` |
| Buyers | `POST /api/buyers`, `GET /api/buyers`, `POST /api/orders`, `GET /api/orders` |
| Vehicles | `POST /api/vehicles`, `GET /api/vehicles` |
| AI | `POST /api/ai/parse-harvest`, `POST /api/ai/match`, `POST /api/ai/what-if` |
| Dashboard | `GET /api/dashboard` |

## 🚀 Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

## 🔐 Environment Variables

Create `backend/.env`:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/).

## ▶️ Running

### Start Backend (Terminal 1)

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Seed Demo Data

```bash
cd backend
python seed_data.py
```

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Open: **http://localhost:5173**

## 🎬 Demo Flow

1. Open **Dashboard** — See KPI overview
2. Open **Farmers** — View/add harvests, update after sorting
3. Open **Buyers** — Create recurring demand orders
4. Open **Transport** — See limited vehicle capacity
5. Open **AI Coordination** — Click **"Generate Collection Plan"**
6. View allocation, explanation, fairness panel
7. Change data (e.g., reduce vehicle capacity) → Re-generate → See dynamic changes

## 🔮 Future Scope

- GPS route optimization
- Real-time vehicle tracking
- Weather integration
- Demand forecasting
- Mobile application
- Multi-crop support
- Digital payments
- Cold-chain monitoring

## 👥 Team

Built for the overnight hackathon.

---

*HarvestLink AI — Turning scattered harvests into coordinated deliveries.*
