# NextGen Finance

A resume-ready full-stack banking platform built with FastAPI, React, SQLAlchemy, and JWT authentication.

## Features
- User registration and JWT login
- Role-based access control
- Open bank accounts
- Deposit, withdraw, and transfer money
- Transaction history
- Admin endpoints for users and accounts
- Profile update and account lifecycle controls
- Detailed onboarding with phone, address, city, pincode, and date of birth
- OTP-based profile verification before sensitive updates
- Downloadable PDF account statements
- React dashboard with a modern UI
- SQLite for easy local learning
- PostgreSQL-ready for deployment

## Tech Stack
# NextGen Finance
- React + Vite
- SQLAlchemy
- SQLite by default
4. Run the API:
   ```bash
# NextGen Finance
   - http://127.0.0.1:8000/health

Frontend:
1. Go to the frontend folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.
4. Run the app:
   ```bash
   npm run dev
   ```

## Deployment Without Docker

Backend on Render:
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add env vars from `.env.example`
- `DEBUG_OTP=true` is fine for demo mode; set it to `false` when you wire real email/SMS delivery

Frontend on Vercel or Netlify:
- Set the project root to `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to the deployed backend URL

## Resume Highlights
- Built a secure full-stack banking platform with JWT auth, role-based endpoints, and transaction workflows
- Implemented account lifecycle, ledger-style transactions, profile updates, and admin controls
- Designed the project for GitHub, cloud deployment, and portfolio presentation
