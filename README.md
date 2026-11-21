# Kiran Solar: Solar Installation Management System

A web app that manages a solar installation business from the first enquiry to warranty support: leads, surveys, quotes, orders, dispatch, installation, tickets, stock and profit.

## Tech stack

- Frontend: React (PWA features)
- Backend: Node.js API (see the server folder)
- Database: Neon or Supabase
- File storage: Cloudinary or Supabase Storage
- Mobile tools: html5-qrcode (serial scanning), react-signature-canvas (customer signature)
- Hosting: Vercel (frontend), Render or Railway (backend)

## Project structure

- client: React frontend
- server: backend API
- docs: project documents, including docs/FEATURES.md (feature tracker)

## Getting started

1. Clone the repo and switch to the dev branch.
2. Copy client/.env.example to client/.env and fill in the values.
3. Copy server/.env.example to server/.env and fill in the values.
4. Open a terminal in the client folder, run npm install, then npm run dev.
5. Backend setup steps will be added by Person 1.

Never commit .env files or API keys.

## Team

- Person 1: Backend
- Person 2: Frontend and design system
- Person 3: Field screens, tracking, deployment and demo

## Git rules

- Branches: main (always demo-ready), dev (integration), feature/Fxx-name for features.
- Never commit directly to main. Open a PR to dev.
- Commit format: type(Fxx): short message (types: feat, fix, docs, chore, refactor).
- Write Closes Fxx in every PR description and update docs/FEATURES.md.

## Features

See docs/FEATURES.md for the full list and current status.

## Live links and demo

Live links and the demo script will be added at deployment.
