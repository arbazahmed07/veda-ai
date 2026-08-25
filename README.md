# Veda AI — Intelligent Answer Sheet Evaluator

Veda AI is an AI-powered automated assessment and answer sheet evaluation system designed for academic institutions, educators, and examiners. It leverages multimodal vision-language models and NLP semantic analysis to digitize, parse, map, and grade handwritten and printed answer sheets against question papers and model answers.

---

## 🎯 Approach

Veda AI uses a multi-tier multimodal pipeline that transforms raw physical/digital exam documents into structured, concept-driven grading evaluations:

```
[ Question Paper (PDF/Image) ] ──┐
                                 ├──► [ Gemini Multimodal Engine ] ──► [ Question & Model Answer Extraction ]
[ Answer Sheet (PDF/Image) ]   ──┘                 │
                                                   ├──► [ Multimodal Answer Mapping & OCR ]
                                                   ├──► [ Concept-Based Evaluation Engine ]
                                                   └──► [ Bounding Box & Annotation Mapping ]
                                                                   │
                                                                   ▼
                                                 [ Detailed Score & Feedback Dashboard ]
                                                 [ Semantic Plagiarism Detection ]
```

### 1. Document Ingestion & Image Preprocessing
- Accepts single or multi-page **PDFs** and **Images (JPEG/PNG)** for both Question Papers and Answer Sheets.
- Converts PDF pages to high-resolution JPEG imagery using `PyMuPDF` (`fitz`) and `pypdfium2` at 150 DPI zoom matrix.

### 2. Automated Question Paper Structuring & Model Answer Extraction
- Uses multimodal vision analysis to parse the Question Paper into structured JSON.
- Automatically identifies sub-questions (e.g., `11(a)`, `11(b)`), max marks, and question text in exact printed order.
- Generates reference **Model Answers** on-the-fly using LLM domain knowledge if no official reference solution is provided by the educator.

### 3. Multimodal Answer Mapping & OCR
- **Dual Pipeline Strategy**:
  1. **Direct Vision Pipeline (Single-Pass)**: Uses Gemini Multimodal Vision to simultaneously perform OCR, text correction, question-to-answer alignment, and evaluation directly from the image payload.
  2. **Hybrid OCR & Correction Pipeline**: Combines raw OCR extraction with an AI-driven OCR Correction pass to rectify spelling and transcription errors while preserving student intent.
- Calculates OCR Confidence Score (0–100%) and Handwriting Quality rating (`Good`, `Medium`, `Poor`).
- Extracts **Spatial Bounding Boxes** (`[ymin, xmin, ymax, xmax]` normalized 0–1000) mapping each student answer back to its exact visual region on the original answer sheet page.

### 4. Concept-Based Grading & Feedback Engine
- Evaluates student responses based on **concept coverage percentage** rather than rigid verbatim keyword matching.
- **Scoring Logic**:
  - `Score = (Concepts Covered / Total Model Concepts) × Max Marks` (rounded to nearest 0.5).
  - Deducts penalty (-0.5 per clear factual mistake).
  - Awards partial credit for partially articulated concepts and does not penalize additional correct facts.
- Generates structured feedback: `concept_coverage`, `strengths`, `missing_topics`, inline mistake highlights with corrections (`❌`), and an AI-synthesized **"Improved Answer"** for student learning.

### 5. Semantic Plagiarism & Similarity Detection
- Utilizes sentence-level embedding vectors (`all-MiniLM-L6-v2`) and cosine similarity.
- Asynchronously compares student submissions pairwise across answers to detect peer-to-peer copying (flagging similarities > 80%).
- Implements **lazy model loading** and **thread pool execution** to keep backend startup lightweight and inference non-blocking.

---

## 🤖 AI Models & APIs Used

| Component / Layer | Model / API / Tool | Description & Purpose |
| :--- | :--- | :--- |
| **Multimodal Vision & Evaluation** | **Google Gemini 1.5 Pro** (`gemini-1.5-pro`) | Primary vision-language engine used for document parsing, handwritten OCR, spatial bounding box mapping, concept evaluation, and answer improvement. |
| **Generative SDKs** | `google-genai` & `langchain-google-genai` | Official Google GenAI SDK and LangChain integration for multimodal structured JSON outputs and prompt templating. |
| **Semantic Plagiarism Engine** | `SentenceTransformer` (`all-MiniLM-L6-v2`) | Lightweight HuggingFace transformer model producing dense vector embeddings for cosine similarity evaluation. |
| **Document & Vision Processing** | `PyMuPDF` (`fitz`), `pypdfium2`, `Pillow` | PDF rendering, resolution scaling, image normalization, and base64 encoding. |
| **Backend Framework** | **FastAPI** + **Uvicorn** (Python 3.10+) | Asynchronous RESTful API engine with Pydantic validation, JWT authentication, and MongoDB persistence. |
| **Frontend Framework** | **Next.js 15** + **React 19** + **Tailwind CSS** | Modern web dashboard supporting interactive visual bounding-box overlays, score breakdowns, and exam management. |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm / yarn / pnpm**
- **MongoDB** (Local or MongoDB Atlas)
- **Google Gemini API Key**

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MODEL_NAME=gemini-1.5-pro
MONGO_URI=mongodb://localhost:27017
DB_NAME=veda_ai
SECRET_KEY=your_secret_key_here
```

Start the FastAPI server:
```bash
uvicorn app:app --host 0.0.0.0 --port 7860 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env.local` file in `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:7860
```

Start the Next.js dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
