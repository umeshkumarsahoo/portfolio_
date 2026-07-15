# Umesh Kumar Sahoo Portfolio

A retro terminal-style portfolio built with React, Vite, Tailwind CSS, Express, and an optional Gemini-powered assistant.

## Features

- Interactive terminal-style navigation
- Real resume PDF download from `src/assets/Umesh_Kumar_Sahoo_Resume.pdf`
- Live GitHub repository indexing with a 15-minute server cache
- Optional Gemini assistant through `GEMINI_API_KEY`
- Contact form with local persistence in `contacts.json` and optional SMTP delivery

## Run Locally

Prerequisite: Node.js 20 or newer.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` for optional integrations:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   GITHUB_TOKEN=your_optional_github_token
   SMTP_HOST=
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASS=
   SMTP_TO=sahooumesh2003@gmail.com
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

## Scripts

- `npm run dev` - start the Express and Vite dev server
- `npm run lint` - run TypeScript checks
- `npm run build` - build the frontend and bundled server
- `npm start` - run the production build from `dist/server.cjs`

## Security Notes

- Secrets stay server-side in `.env.local`; do not expose them with `VITE_` prefixes.
- Mutating API requests require a same-origin CSRF token from `/api/csrf`.
- Security headers are applied with Helmet; production also enables a restrictive CSP and HSTS.
- API, contact, and assistant endpoints are rate limited.
- Contact submissions are stored only in local `contacts.json`, which is gitignored and written with owner-only permissions.
- There is no login, password storage, SQL database, or file upload flow in this app today.
