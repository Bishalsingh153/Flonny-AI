# Floony AI - End-to-End Project Flows & Execution Sequences

This document provides a step-by-step walk-through of the execution paths in Floony AI. It traces actions from the user input on the React client, through the Express APIs and business logic, down to the PostgreSQL database, and back to the user.

---

## Flow 1: User Registration & Authentication Flow

This flow handles user sign-up, secure password hashing, session creation, and subsequent authenticated page rendering.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Interface
    participant AuthL as UI/AuthLayout.jsx
    participant AuthC as context/AuthContext.jsx
    participant API as Express API (/api/auth/register)
    participant Hash as utils/authService.js
    participant DB as Supabase PostgreSQL
    
    User->>AuthL: Fills Username, Email, Password & Clicks Submit
    AuthL->>AuthC: Triggers handleAuthSubmit(e)
    activate AuthC
    AuthC->>API: HTTP POST request with username, email, password
    deactivate AuthC
    activate API
    API->>DB: Query: Check if username or email exists
    DB-->>API: Return empty row (unique user confirmed)
    API->>Hash: Call hashPassword(password)
    activate Hash
    Hash->>Hash: Generate 16-byte random salt
    Hash->>Hash: Hash using PBKDF2 Sync (10,000 iterations, SHA-512)
    Hash-->>API: Return "salt:hashedString"
    deactivate Hash
    API->>DB: INSERT INTO users VALUES (username, email, passwordHash)
    DB-->>API: Return inserted user row (id, username, email)
    API->>Hash: Call generateToken(newUser)
    Hash-->>API: Return signed JWT token (expires in 30 days)
    API-->>AuthC: Respond HTTP 201 with { user, token }
    deactivate API
    activate AuthC
    AuthC->>AuthC: Save 'floony_token' & 'floony_user' in localStorage
    AuthC->>AuthC: Update state variables (token, user)
    AuthC->>AuthC: Trigger confetti celebration
    deactivate AuthC
    AuthC-->>AuthL: State changes -> App rerenders
    AuthL->>User: Switches layout from login screen to AppContainer dashboard!
```

### Steps in Detail:
1. **Trigger**: The user fills out the form on [AuthLayout.jsx](file:///home/bishalsingh/Floony%20AI/frontend/src/components/Layout/AuthLayout.jsx) and submits.
2. **Context Dispatch**: [AuthContext.jsx](file:///home/bishalsingh/Floony%20AI/frontend/src/context/AuthContext.jsx) receives the submission event, updates loading states, and makes a POST call to the backend server.
3. **Database Check & Encryption**: In the backend, the database is checked for duplicates. If clear, Node's native `crypto` module runs `pbkdf2Sync` to create a secure salt-hash combination.
4. **JWT Generation**: A signed JWT is constructed containing the user's ID, username, and email.
5. **Storage & Rerender**: The frontend saves the token in the browser's `localStorage` for session persistence. React state updates, switching the view router shell from `AuthLayout` to `AppContent`.

---

## Flow 2: Natural Language AI Expense Logging Flow

This is one of the core features of Floony AI, transforming free-form text input into structured database logs.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Interface
    participant Input as AI/AiParseBox.jsx
    participant Context as context/FinanceContext.jsx
    participant API as Express API (/api/ai/parse)
    participant Model as services/aiService.js (Gemini/Fallback)
    participant DB as Supabase PostgreSQL
    
    User->>Input: Enters "Spent ₹450 on Uber ride to airport today"
    Input->>Context: Triggers handleAiParse(e)
    activate Context
    Context->>API: HTTP POST /api/ai/parse with { text: "Spent ₹450..." }
    deactivate Context
    activate API
    API->>Model: Call parseExpenseWithGemini(text)
    activate Model
    alt GEMINI_API_KEY is configured
        Model->>Model: Format System Prompt with today's date
        Model->>Model: Execute gemini-1.5-flash content generation
        Model-->>API: Return parsed JSON
    else GEMINI_API_KEY is missing
        Model->>Model: Trigger parseExpenseTextFallback(text)
        Model->>Model: Extract parameters via Regex & Category Keyword mappings
        Model-->>API: Return parsed JSON
    end
    deactivate Model
    API-->>Context: Respond with transaction JSON object
    deactivate API
    activate Context
    Context->>Context: Set aiPreview state to parsed object
    deactivate Context
    Context-->>Input: State change -> Renders verify overlay modal
    User->>Input: Reviews fields and clicks "Approve & Save"
    Input->>Context: Triggers handleApproveAiPreview()
    activate Context
    Context->>API: HTTP POST /api/transactions with preview data
    activate API
    API->>DB: INSERT INTO transactions (user_id, amount, type, category, merchant, date, description)
    DB-->>API: Return logged database transaction row
    API-->>Context: Return saved record
    deactivate API
    Context->>Context: Add new transaction to transactions array state
    Context->>Context: Set aiPreview and aiInput to null
    Context->>Context: Trigger celebration confetti!
    deactivate Context
    Context-->>User: Dashboard and charts automatically update in real-time
```

### Steps in Detail:
1. **Interaction**: The user types a transaction description in [AiParseBox.jsx](file:///home/bishalsingh/Floony%20AI/frontend/src/components/AI/AiParseBox.jsx).
2. **AI Request**: [FinanceContext.jsx](file:///home/bishalsingh/Floony%20AI/frontend/src/context/FinanceContext.jsx) catches the request and sends the query text to `/api/ai/parse`.
3. **Execution Options**:
   - **Gemini Path**: The server builds a prompt instructing Gemini to parse values according to a rigid JSON template.
   - **Fallback Path**: If no API key is found, regular expressions isolate amounts and dates, and lookup lists match keywords to categories (e.g. *sushi* mapped to *Food & Dining*).
4. **User Verification**: A modal overlay pops up, allowing the user to make adjustments or confirm details before recording.
5. **Completion**: Upon clicking "Approve & Save", a POST request logs the item permanently into the PostgreSQL table, updating dashboard charts instantly.

---

## Flow 3: Interactive AI Coach Chat Flow

This flow allows users to converse with an AI financial advisor that has real-time context about their expenditures.

```mermaid
graph TD
    UserChat[User submits question in AI/ChatPanel.jsx]
    Context[FinanceContext: handleAiChat updates history]
    API[POST /api/ai/chat]
    ServerContext[Server aggregates profile: Income, Expenses, Budgets, 15 recent logs]
    CallAI{Is Gemini API key set?}
    
    GeminiModel[Instruct Gemini 1.5 Flash with full context + chat history]
    FallbackCoach[Trigger generateFinancialAdviceFallback rule-based intelligence]
    
    Response[Send advisors markdown response back to client]
    ClientScroll[Append to ChatPanel bubbles & auto scroll to bottom]
    
    UserChat --> Context
    Context -- HTTP POST --> API
    API --> ServerContext
    ServerContext --> CallAI
    CallAI -- Yes --> GeminiModel
    CallAI -- No --> FallbackCoach
    GeminiModel --> Response
    FallbackCoach --> Response
    Response --> ClientScroll
```

### Steps in Detail:
1. **User Action**: The user inputs a question (e.g., *"Am I overspending?"*) in [ChatPanel.jsx](file:///home/bishalsingh/Floony%20AI/frontend/src/components/AI/ChatPanel.jsx).
2. **History Accumulation**: The prompt is appended to the chat array state locally.
3. **Context Assembly**: The server constructs a profile payload containing:
   - Total income, expenses, and savings rate.
   - Budgets limits compared to category spending.
   - Details of the last 15 transaction rows.
4. **AI Generation**: 
   - **Gemini**: Analyzes the context and returns markdown advice.
   - **Fallback**: Generates rule-based calculations regarding savings margins and category trends.
5. **Rerender**: The response is rendered dynamically using simple HTML markdown conversion, and scrolls smoothly into the viewport list.

---

## Flow 4: Budget Setting & Real-Time Alerting Flow

Ensures that setting limits is stored correctly and translates to immediate warnings on user thresholds.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Interface
    participant Panel as Budgets View (AppContent)
    participant Hook as hooks/useBudgets.js
    participant Context as context/FinanceContext.jsx
    participant API as Express API (/api/budgets)
    participant DB as Supabase PostgreSQL
    
    User->>Panel: Changes Food & Dining budget limit input to 5000
    Panel->>Hook: Triggers handleBudgetChange(category, amount)
    Hook->>Context: Delegates operation
    activate Context
    Context->>API: HTTP POST /api/budgets with category, amount
    deactivate Context
    activate API
    API->>DB: INSERT INTO budgets ... ON CONFLICT (category, user_id) DO UPDATE SET amount = EXCLUDED.amount
    DB-->>API: Return updated budget row
    API-->>Context: Return budget JSON
    deactivate API
    activate Context
    Context->>Context: Update budgets array state (insert new or swap old row)
    deactivate Context
    Context-->>Panel: React state updates
    Panel->>User: Updates charts. Sidebar status checks trigger warnings if spent > 5000!
```

### Steps in Detail:
1. **Interaction**: The user inputs a budget amount on the Budgets tab.
2. **State Delegation**: The event triggers `handleBudgetChange` via the [useBudgets.js](file:///home/bishalsingh/Floony%20AI/frontend/src/hooks/useBudgets.js) hook.
3. **SQL Upsert**: The server issues a PostgreSQL upsert query. If the user already had a budget set for that category, it is overwritten; otherwise, a new line is created.
4. **Real-time Checks**: Frontend computes the sum of expenses matching the budget category. If total expenditure exceeds the budget, warning banners appear on both the dashboard budget bar and the AI insight sidebar cards.
