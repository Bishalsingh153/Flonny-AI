# Floony 💸
### AI-Powered Financial Intelligence

Floony is a minimal, sleek, and world-class expense tracker built with the MERN-variant stack (React/Vite frontend + Express/Node.js backend + local SQLite database). 

Designed with a premium dark-themed interface reminiscent of modern tech companies like Linear or Apple, Floony leverages Google Gemini AI to parse natural language expense logs and offer personalized wealth coaching insights.

---

## 🌟 Key Features

1. **Natural Language Logging (The Floony AI Box)**
   * Type transactions naturally (e.g., *"Spent $25 on delicious sushi at Tokyo Dining last night"* or *"Earned $450 from Upwork freelance project"*).
   * Floony's backend automatically extracts the `amount`, `type` (income/expense), `category`, `merchant`, relative `date` (calculating yesterday/today dates automatically), and a clean `description`.
   * Verify the parsed data in a sleek confirmation modal before committing to the secure database ledger.

2. **AI Financial Intelligence (Chat & Insights)**
   * Interact with a dedicated AI Coach via chat. Ask: *"Am I spending too much on food?"*, *"Give me 3 tips to save money this month"*, or *"Analyze my spending habits"*.
   * The AI reviews your recent transaction logs, net balance, and budget progress to output highly customized, context-aware financial advice.

3. **Dynamic Budget Health Monitoring**
   * Set category-specific spending ceilings.
   * View live progress indicators showing budget consumption. If you breach a budget, the dashboard highlights it and the AI Coach issues specific warnings.

4. **Zero-Configuration SQLite Database**
   * Pre-packaged database initialization that runs completely locally.
   * Auto-seeds mock transactions and budget parameters on initial startup so you can immediately see the dashboard charts and widgets in action.

5. **Local AI Algorithmic Fallback**
   * **No API Keys required to start!** If you do not configure a Gemini API key, Floony will run local, smart regular expression and keyword-matching fallbacks so the app remains fully functional out-of-the-box.

---

## 🚀 Getting Started

### 1. Installation

Install dependencies for the root coordinator, backend, and frontend with a single command:

```bash
npm run install-all
```

### 2. Configure Google Gemini AI (Optional)

To enable the generative AI features (highly recommended), add your Google Gemini API key:

1. Open `backend/.env`
2. Insert your key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

### 3. Running the App

Start both the frontend client and the Express backend server concurrently:

```bash
npm run dev
```

* **Frontend Client**: Runs on [http://localhost:5173](http://localhost:5173)
* **Backend API**: Runs on [http://localhost:5000](http://localhost:5000)

---

## 🛠️ Architecture

* **Frontend**: React (Vite), Vanilla CSS (Vesper custom dark design system), Recharts (data visualizations), Lucide React (vector iconography), Canvas Confetti (celebratory feedback).
* **Backend**: Node.js, Express, SQLite (`sqlite3` and `sqlite` wrapper), Google Gen AI SDK (`@google/generative-ai`).
