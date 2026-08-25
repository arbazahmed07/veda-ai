# Veda AI Frontend Application

This is the Next.js 15 frontend client for **Veda AI** — an intelligent, AI-powered automated answer sheet evaluation system.

For full project documentation, including the **Approach**, **AI Models & APIs used**, **Assumptions & Limitations**, and **Backend Architecture**, please see the main [Root README](../README.md).

---

## 🛠️ Features

- 📄 **Assessment Mapping UI**: Upload Question Papers and Student Answer Sheets with visual page previews.
- 🎯 **Bounding Box Visualizer**: View bounding-box overlays (`[ymin, xmin, ymax, xmax]`) mapping student handwritten answers directly onto original sheet pages.
- 📊 **Detailed Grade Reports**: Concept coverage percentage, score breakdown, strengths, missing topics, and inline mistake highlights (`❌`).
- ✍️ **AI-Improved Answer View**: Generates reference student answers for learning and review.
- 🔍 **Plagiarism Dashboard**: Displays peer-to-peer similarity scores (>80%) across student submissions.

---

## 🚀 Getting Started

First, ensure your backend server is running at `http://localhost:7860`.

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📖 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
