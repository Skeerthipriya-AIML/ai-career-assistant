# AI Career Assistant - Production Telemetry & Orchestration Portal

A production-ready, full-stack Generative AI career intelligence and learning platform containing four enterprise-grade modules:
1. **AI Chatbot with RAG**: Semantic text search, Hybrid Vector/BM25 retrieval, query rewriting, reranking, source citations, and memory.
2. **AI Agent**: ReAct-based executor executing tools (Calculator, Web Search, File Reader, Python executing environment, CSV, Weather, Research) with plan-reflect-retry reasoning.
3. **AI Document Assistant**: OCR, PDF/Docx/Pptx/Xlsx converters, mind-map generation (via Mermaid), translation, comparison, flashcards, and quizzes.
4. **AI Interview Coach**: Technical coding sandbox, behavioral STAR scoring, ATS compatibility checker, voice synthesis transcription, and visual webcam feedback simulation.

Includes an **Admin Dashboard** tracking system health (MongoDB and FastAPI ping), security audit log events, dynamic feature flags, and token latency telemetry.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[React SPA Frontend] -->|HTTP / JSON / Streams| Gateway[FastAPI Backend Router]
    Gateway --> Auth[JWT Security Guard]
    Auth --> Chat[AI Chatbot & RAG Engine]
    Auth --> Agent[ReAct AI Agent Loop]
    Auth --> Doc[Document Assistant Workspace]
    Auth --> Coach[Interview Coach & Skill Intelligence]
    
    Chat --> Vector[ChromaDB Vector Store]
    Chat --> MongoDB[(MongoDB History/State)]
    Agent --> Tools[Agent Tool Registry]
    Doc --> Extract[Text Extraction OCR / EasyOCR]
    Coach --> Skills[Skills Gap & Roadmap Engines]
```

---

## 🔄 Core Request Lifecycles

### 1. User Login & Token Verification
```mermaid
sequenceDiagram
    participant User as React Frontend
    participant API as FastAPI Security
    participant DB as MongoDB Users
    User->>API: POST /auth/login (email, password)
    API->>DB: Fetch user doc and hash
    DB-->>API: Match status
    API->>API: Generate JWT bearer token
    API-->>User: Status 200 (JWT access token cookie)
```

### 2. Document Indexing & RAG Retrieval
```mermaid
sequenceDiagram
    participant User as React Frontend
    participant API as FastAPI Documents
    participant Pipe as RAG Pipeline
    participant DB as ChromaDB / Mongo
    User->>API: POST /document/upload (multipart file)
    API->>Pipe: Parse text chunks & metadata
    Pipe->>DB: Write vectors (Chroma) & original file (Mongo)
    DB-->>User: Indexing Finished Event (Notification Center)
```

### 3. Interview Coach Evaluation Flow
```mermaid
sequenceDiagram
    participant User as Candidate React
    participant API as FastAPI Coach Router
    participant Skills as Skill Gap Service
    participant Eval as Evaluation Engine
    participant DB as MongoDB Session Log
    User->>API: POST /coach/submit-answer (audio/text)
    API->>Eval: STAR Check / Concept Accuracy check
    Eval->>Skills: Strengths / Weaknesses / Study Roadmap
    API->>DB: Save session exchange record
    DB-->>User: return Score & Actionable Roadmap
```

---

## 🛠️ Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite, Mermaid UI, Prism syntax highlighters.
- **Backend**: FastAPI (Python 3.10+), LangChain, ChromaDB, Hugging Face Inference API, Motor (Async MongoDB).
- **Inference Models**:
  - Chat: `Qwen/Qwen2.5-7B-Instruct`
  - Embeddings: `BAAI/bge-small-en-v1.5`
  - Speech-to-Text: `Whisper`

---

## 🚀 Getting Started

### 1. Requirements
- Docker and Docker Compose installed.
- Hugging Face Access Token (`HUGGINGFACEHUB_API_TOKEN`).

### 2. Configuration
Create a `.env` file in the `backend/` directory:
```env
MONGODB_URI=mongodb://localhost:27017/ai_career_assistant
CHROMA_DB_PATH=./chroma_db
HUGGINGFACEHUB_API_TOKEN=your_hugging_face_token_here
JWT_SECRET=supersecretportfoliojwtkey123
ENVIRONMENT=development
```

### 3. Running with Docker Compose
Run the entire application ecosystem with:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/docs` (Swagger OpenAPI UI)
- MongoDB: `mongodb://localhost:27017`

### 4. Running Locally (without Docker)
**Backend Setup**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend Setup**:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security & Performance
- **Dynamic Feature Flags**: Control chatbot streaming, agent execution loops, and OCR tasks directly from the Admin Telemetry Portal.
- **Auditing**: Every critical security action (logins, updates, uploads) registers structured event logs in MongoDB.
- **Health Checks**: Endpoint `/api/v1/admin/health` actively queries system dependencies and database connections.
