# SaafHisaab

SaafHisaab is a mobile-first mandi accounting and staff portal. It provides separate workflows for Seth (mandi owner), Munsi, and Labour accounts, backed by a React progressive web app and an Express/MongoDB API.

## What it does

- Manages mandi operations including farmers, crop weighing, rates, settlements, expenses, wallets/transfers, and godown stock.
- Provides dashboards, analytics, interest tracking, reports, and B2B dispatch management for permitted roles.
- Supports staff accounts, profile/settings management, OTP-based account flows, and session-based authentication.
- Allows profile photos to be uploaded to Cloudinary. App icons and character artwork remain static frontend assets.
- Can be installed as a PWA on supported browsers.

See [APP_DOCUMENTATION.md](./APP_DOCUMENTATION.md) for role workflows, configuration, API groups, and deployment notes. Authentication endpoints are also described in [backend/AUTH_API_DOCUMENTATION.md](./backend/AUTH_API_DOCUMENTATION.md).

## Technology

- Frontend: React 18, Vite, Tailwind CSS, wouter, lucide-react
- Backend: Node.js (ES modules), Express, Mongoose
- Database: MongoDB
- Authentication: JWT access tokens and HttpOnly refresh-token cookies
- SMS: Fast2SMS
- Email: Resend
- Profile image storage: Cloudinary (profile photos only)

## Requirements

- Node.js 20 or newer (Node.js 24 was used for recent local validation)
- npm
- MongoDB database
- Provider accounts/credentials for email, SMS, and profile image upload as needed

## Local development

### 1. Install dependencies

Run each command from its package directory:

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

### 2. Configure the backend

Create `backend/.env` (do not commit it):

```dotenv
PORT=8080
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/saafhisaab
JWT_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=re_your_resend_key
FAST2SMS_API_KEY=your_fast2sms_key
```

Cloudinary is needed only for profile-photo uploads. Configure either:

```dotenv
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
```

or the equivalent separate `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` variables.

For production SMS, also configure the approved provider values:

```dotenv
FAST2SMS_SENDER_ID=ABCDEF
FAST2SMS_TEMPLATE_ID=1234567890123456789
```

Production SMS requires an approved DLT sender/template whose registered message content matches the OTP message. See [APP_DOCUMENTATION.md](./APP_DOCUMENTATION.md#6-environment-configuration) before deploying.

### 3. Start the API

```powershell
cd backend
npm run dev
```

The API listens on port `8080` by default. Check `http://localhost:8080/api/healthz` for the database connection status.

### 4. Start the frontend

In another terminal:

```powershell
cd frontend
$env:VITE_BACKEND_URL="http://localhost:8080/api"
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The backend currently allows `http://localhost:5173` and the configured SaafHisaab production web origin; update the CORS allowlist in `backend/src/index.js` if your frontend uses another origin.

## Build

```powershell
cd frontend
npm run build
```

The production bundle is generated in `frontend/dist/`. The backend currently has `dev` and `start` scripts; it does not define a test script.

## Security and operations

- Keep all API secrets in backend environment variables. Never put provider secrets in frontend variables or source control.
- Production API traffic must use HTTPS because the refresh-token cookie is configured as Secure and SameSite=None.
- Use a strong, unique `JWT_SECRET` and a production MongoDB connection string with appropriate access controls.
- Set `NODE_ENV=production` in the deployed API to use the DLT SMS path and suppress demo OTP values in API responses.
- Frontend route visibility is not a security boundary; backend authorization is required for protected data and actions.

## Project layout

```text
backend/
  src/
    Config/        Environment and MongoDB configuration
    controllers/   API/business logic
    middleware/    Authentication and role authorization
    models/        Mongoose schemas
    routes/        Express route definitions
    Service/       SMS and email providers
    utils/         Shared helpers
frontend/
  public/          PWA and static public assets
  src/
    components/    Shared UI
    lib/           API, authentication, and offline helpers
    pages/         App screens
```

## Documentation

- [Complete app and operations guide](./APP_DOCUMENTATION.md)
- [Authentication API reference](./backend/AUTH_API_DOCUMENTATION.md)
