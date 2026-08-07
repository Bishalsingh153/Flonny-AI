# Floony 💸
### AI-Powered Financial Intelligence

Floony is a minimal, sleek, and world-class expense tracker built with React (Vite) frontend and Express/Node.js backend. It connects to a PostgreSQL database (hosted on Supabase) and uses Google Gemini AI to parse natural language expense logs and offer personalized wealth coaching insights.

---

## 🌟 Key Features

1. **Natural Language Logging (The Floony AI Box)**
   - Type transactions naturally (e.g., *"Spent $25 on delicious sushi at Tokyo Dining last night"* or *"Earned $450 from Upwork freelance project"*).
   - Floony's backend automatically extracts the `amount`, `type` (income/expense), `category`, `merchant`, relative `date`, and a clean `description`.
   - Verify the parsed data in a sleek confirmation modal before committing to the database.

2. **AI Financial Intelligence (Chat & Insights)**
   - Interact with a dedicated AI Coach via chat. Ask: *"Am I spending too much on food?"*, *"Give me 3 tips to save money this month"*, or *"Analyze my spending habits"*.
   - The AI reviews your recent transaction logs, net balance, and budget progress to output highly customized, context-aware financial advice.

3. **Dynamic Budget Health Monitoring**
   - Set category-specific spending ceilings.
   - View live progress indicators showing budget consumption. If you breach a budget, the dashboard highlights it and the AI Coach issues specific warnings.

4. **Zero-Configuration PostgreSQL Database**
   - Pre-packaged database initialization that creates tables on first run.
   - Uses Supabase PostgreSQL as the database provider.

5. **Local AI Algorithmic Fallback**
   - **No API Keys required to start!** If you do not configure a Gemini API key, Floony will run local, smart regular expression and keyword-matching fallbacks so the app remains fully functional out-of-the-box.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Bishalsingh153/Flonny-AI.git
cd Flonny-AI
```

### 2. Install Dependencies

Install dependencies for the root coordinator, backend, and frontend with a single command:

```bash
npm run install-all
```

### 3. Configure Environment Variables

Create a `backend/.env` file (or copy from `backend/.env.example` if available) and add your database and optional API credentials:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

- **DATABASE_URL**: Your Supabase PostgreSQL connection pooler URL.
- **JWT_SECRET**: Any random string for signing JSON Web Tokens.
- **GEMINI_API_KEY**: Optional. Get yours from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Running the App

Start both the frontend client and the Express backend server concurrently:

```bash
npm run dev
```

- **Frontend Client**: Runs on [http://localhost:5173](http://localhost:5173)
- **Backend API**: Runs on [http://localhost:5000](http://localhost:5000)

### 5. Build for Production

```bash
npm run build
```

This builds the React frontend into `frontend/dist/`.

---

## 🛠️ Architecture

- **Frontend**: React (Vite), Vanilla CSS (custom dark design system), Recharts (data visualizations), Lucide React (vector iconography), Canvas Confetti (celebratory feedback).
- **Backend**: Node.js, Express, PostgreSQL (`pg`), Google Gen AI SDK (`@google/generative-ai`).
- **Database**: Supabase PostgreSQL (auto-creates tables on first run via `initDb()`).
- **Deployment**: Render (single Web Service — backend serves built frontend and API from the same origin).

---

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run install-all` | Install dependencies for root, backend, and frontend |
| `npm run dev` | Start both frontend (Vite) and backend (nodemon) concurrently |
| `npm run build` | Install frontend deps and build for production |
| `npm start` | Start backend in production mode (expects built frontend in `frontend/dist/`) |
