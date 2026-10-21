# Umesh Kumar Sahoo Portfolio & UMU AI Assistant

A high-performance editorial and terminal-style portfolio with a Dual-LLM intelligent assistant, built with React, Vite, Tailwind CSS, Express, OpenRouter Reasoning LLM, Google Gemini, and SSRF-safe Link RAG.

## Architecture Highlights: Dual-LLM Agentic Engine

1. **Decision & Routing Engine (OpenRouter Reasoning LLM):**
   - Powered by OpenRouter (`thinkingmachines/inkling:free`).
   - Handles multi-turn conversational reasoning, dynamic topic breakout, cancellation detection, and multi-field entity extraction (Name, Email, Collaboration Message) across varied user formats.
   - Eliminates conversational lock-in: if a visitor asks an outside question or shifts topic during contact collection, the reasoning engine immediately breaks out and answers their question.

2. **Synthesis & Knowledge Grounding Tier (Google Gemini):**
   - Uses `gemini-2.0-flash` / `gemini-1.5-flash` for high-throughput responses grounded in Umesh's 30 GitHub repositories, local project documentation, and live Hacker News Tech Pulse stories.

3. **Deterministic Fallback & Security Tier:**
   - 100% uptime with zero-downtime local disk caching and unit-tested heuristic parsers (99/99 automated tests passing).
   - SSRF-safe Link RAG blocking private IP CIDR ranges and cloud metadata (169.254.169.254).
   - Double-submit cookie CSRF protection, Helmet security headers, rate limiting, and 30-second email deduplication.

---

## Environment Variables for Render Deployment

When deploying on [Render](https://render.com), go to **Dashboard > Your Service > Environment** and configure:

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Recommended | OpenRouter API Key for the decision engine (`https://openrouter.ai/keys`) |
| `OPENROUTER_MODEL` | Optional | Defaults to `thinkingmachines/inkling:free` |
| `GEMINI_API_KEY` | Recommended | Google Gemini API key for grounded synthesis |
| `RESEND_API_KEY` | Optional | Resend API key for direct HTTPS email dispatch |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Optional | Alternative SMTP delivery credentials |
| `SMTP_TO` | Optional | Recipient inbox (defaults to `sahooumesh2003@gmail.com`) |
| `GITHUB_TOKEN` | Optional | GitHub personal token to avoid rate limits when scanning repos |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Defaults to `3000` (Render binds this automatically) |

---

## Run Locally

Prerequisite: Node.js 20 or newer.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` for local development:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=thinkingmachines/inkling:free
   GEMINI_API_KEY=your_gemini_api_key
   GITHUB_TOKEN=your_optional_github_token
   PORT=3000
   VITE_HMR_PORT=3001
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open:
   ```text
   http://localhost:3000
   ```

## Test Suites

- `npx tsx tests/emailWorkflow.test.ts` - 99 unit tests for multi-turn extraction, cancellation, outside breakout, and OpenRouter decision resolving.
- `npx tsx tests/assistantQueries.test.ts` - 85 unit tests for query routing, code-first policies, and project isolation.
- `npx tsx tests/promptAcceptanceQueries.test.ts` - 18 acceptance tests for real user prompt scenarios.
- `npx tsx tests/ragEngine.test.ts` - 9 verification tests for SSRF protection, caching, and document indexing.

## Scripts

- `npm run dev` - start Express dev server with Vite HMR
- `npm run lint` - TypeScript validation (`tsc --noEmit`)
- `npm run build` - build client assets and bundle server with esbuild
- `npm start` - launch production server (`node dist/server.cjs`)
