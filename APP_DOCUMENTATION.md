# SaafHisaab App Documentation

## 1. Purpose and scope

SaafHisaab is a mandi operations and accounting application. A Seth account manages a mandi and its staff. Munsi and Labour accounts work within the staff workflows granted to their role. The app combines accounting records, inventory-related operations, reporting, and staff access in a mobile-first web application.

This document describes the current repository implementation. It is not a guarantee of any external provider configuration or production deployment state.

## 2. Application architecture

```text
Browser / installed PWA
        |
        | React app, Vite build, wouter routes
        | Bearer access token + refresh-token cookie
        v
Express API (/api)
        |
        +-- MongoDB (Mongoose)
        +-- Fast2SMS (phone OTP messages)
        +-- Resend (email messages)
        +-- Cloudinary (profile photos only)
```

### Main code areas

| Area | Location | Responsibility |
|---|---|---|
| Frontend routing and session bootstrap | `frontend/src/App.jsx` | Auth validation, role-specific pages, token refresh |
| Frontend screens | `frontend/src/pages/` | Login, registration, dashboards, and operations screens |
| Frontend API and offline support | `frontend/src/lib/` | HTTP calls, token handling, offline queue helpers |
| Backend bootstrap | `backend/src/index.js` | Express setup, CORS, middleware, route mounting |
| Backend routes | `backend/src/routes/` | HTTP endpoints and route-level authorization |
| Backend controllers | `backend/src/controllers/` | Request handling and application logic |
| MongoDB schemas | `backend/src/models/` | Users, sessions, OTPs, mandi records |
| External providers | `backend/src/Service/` | SMS and email integrations |

## 3. Roles and access

The application has three account roles:

- **Seth:** mandi owner/administrator. Has owner-oriented dashboards, business settings, staff management, analytics, reports, and B2B screens.
- **Munsi:** staff role with operational access for assigned mandi records. Some financial/operational actions are restricted to Seth and Munsi.
- **Labour:** staff role with a focused weighing/workflow experience.

The frontend conditionally displays role-specific routes and the backend applies authentication and role middleware. Always treat the backend as the authority for access decisions.

## 4. Frontend screens

The signed-out experience includes role selection, login, registration, and account recovery. The signed-in app currently routes to these screen groups:

| Screen/route | Purpose |
|---|---|
| `/` | Role-specific home dashboard |
| `/login`, `/register` | Authentication and Seth registration |
| `/munsi`, `/labour` | Staff home screens |
| `/settings` | Profile, mandi settings, photo, security, and logout |
| `/weigh`, `/munsi/weigh` | Crop weighing workflow |
| `/farmers`, `/farmers/:id` | Farmer list and detail |
| `/rates` | Seth rate management or staff rate view |
| `/godown`, `/godown-analysis` | Stock and stock analysis |
| `/wallets`, `/expenses` | Financial operations |
| `/analytics`, `/interest`, `/reports` | Seth reporting and analysis |
| `/b2b` | Seth B2B dispatch/export |
| `/employees` | Seth staff management |

The application also includes PWA install metadata and service-worker generation through Vite PWA.

## 5. Backend API overview

All API routes are mounted under `/api`. Unless noted, application data endpoints require a valid Bearer access token.

### Health

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/healthz` | Reports MongoDB connection state |

### Authentication (`/api/auth`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/register/phone-otp` | Send Seth registration phone OTP |
| `POST` | `/register/email-otp` | Send Seth registration email OTP |
| `POST` | `/register` | Verify registration OTPs and create Seth account |
| `POST` | `/login` | Authenticate by phone, email, or employee ID |
| `POST` | `/first-login/pin-otp` | Send code to registered staff phone before initial PIN setup |
| `POST` | `/set-pin` | Set a first-time staff PIN using the verification code |
| `POST` | `/refresh-token` | Refresh access token using HttpOnly cookie |
| `POST` | `/forgot-password/phone` | Send phone recovery OTP |
| `POST` | `/forgot-password/email` | Send email recovery OTP |
| `POST` | `/forgot-password/verify-otp` | Verify a recovery OTP |
| `POST` | `/reset-password` | Reset password/PIN using OTP |
| `GET` | `/profile` | Read current account profile |
| `PATCH` | `/profile` | Update profile fields |
| `POST` | `/profile/image` | Upload a profile photo (multipart field `image`) |
| `POST` | `/change-pin` | Change the authenticated staff PIN |
| `POST` | `/logout` | End the current session |
| `POST` | `/logout-all` | End sessions for the current account |

Authentication payload details and examples are in [backend/AUTH_API_DOCUMENTATION.md](./backend/AUTH_API_DOCUMENTATION.md).

### Operations and reporting route groups

These are mounted under `/api`; consult the matching route and controller files for exact payloads and filtering options.

| Route group | Common operations |
|---|---|
| `/farmers` | List, create, read, update, delete; farmer summary and timeline |
| `/weight-entries` | List, create, read, update, approve, hold |
| `/transactions` | List and create transactions |
| `/settlements` | List, create, and read settlement details |
| `/rates` | Read/update rates and broadcast rate changes |
| `/godown` | Read stock, adjust stock, and record direct purchase |
| `/expenses` | List, create, and delete expenses |
| `/fund-transfers` | List and create transfers |
| `/b2b-dispatches` | List, create, update, and delete dispatches |
| `/dashboard/*` | Summary, passbook, analytics, profit/loss, interest, debtors, and godown analysis |
| `/settings` | Read mandi settings; Seth-only update |
| `/users` | Seth staff management |

## 6. Environment configuration

Create `backend/.env` locally and configure equivalent environment variables in the backend deployment. Never commit actual credentials.

### Backend

| Variable | Required | Notes |
|---|---:|---|
| `PORT` | No | API port; defaults to `8080` |
| `NODE_ENV` | Yes for production behavior | Set to `production` for deployed runtime |
| `MONGO_URI` | Yes | MongoDB connection URI |
| `JWT_SECRET` | Yes | Long, unique signing secret |
| `RESEND_API_KEY` | For email OTPs | Resend API key; sender domain is configured in email service code |
| `FAST2SMS_API_KEY` | For SMS OTPs | Fast2SMS authorization key |
| `FAST2SMS_SENDER_ID` | Production SMS | Approved DLT sender/header ID |
| `FAST2SMS_TEMPLATE_ID` | Production SMS | Approved 19-digit DLT template identifier |
| `CLOUDINARY_URL` | For profile photos | `cloudinary://key:secret@cloud_name` |
| `CLOUDINARY_CLOUD_NAME` | Alternative to URL | Separate Cloudinary configuration |
| `CLOUDINARY_API_KEY` | Alternative to URL | Separate Cloudinary configuration |
| `CLOUDINARY_API_SECRET` | Alternative to URL | Separate Cloudinary configuration |

The backend configuration also reads `FRONTEND_URL`, `JWT_EXPIRE`, and `JWT_COOKIE_EXPIRE`; verify code usage before relying on them for deployment behavior. The current CORS allowlist is explicitly defined in `backend/src/index.js` and must include the deployed frontend origin.

### Frontend

| Variable | Required | Notes |
|---|---:|---|
| `VITE_BACKEND_URL` | Recommended | API base URL, including `/api`, e.g. `http://localhost:8080/api` |

Only public configuration belongs in `VITE_*` variables. Vite embeds these values in the browser bundle; never place provider keys or secrets there.

## 7. Local setup and commands

Requirements: Node.js 20+, npm, and MongoDB.

Install dependencies:

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

Start MongoDB and configure `backend/.env`, then run the backend:

```powershell
cd backend
npm run dev
```

In another terminal, run the frontend:

```powershell
cd frontend
$env:VITE_BACKEND_URL="http://localhost:8080/api"
npm run dev
```

Build the frontend:

```powershell
cd frontend
npm run build
```

Preview a production frontend build locally:

```powershell
cd frontend
npm run preview
```

The backend exposes `npm run dev` and `npm start`. No test script is defined in either package manifest at the time of writing.

## 8. Authentication and session behavior

- Login issues a short-lived access JWT and an HttpOnly refresh-token cookie.
- The frontend stores the access token in local storage and sends it as a Bearer token.
- The backend validates the user and the active session associated with the access token.
- The frontend refreshes access tokens using the cookie-backed refresh endpoint.
- Staff accounts with no PIN must receive and submit a one-time code sent to their registered phone before setting a PIN.
- Initial PIN setup codes expire after five minutes, are single-use, allow up to five verification attempts, and are rate-limited to one request per minute per account.
- OTP values are returned by OTP endpoints only when `NODE_ENV` is not `production`; do not enable demo responses in production.
- Refresh cookies use Secure and SameSite=None settings, so production deployments require HTTPS.

## 9. SMS, email, and image uploads

### SMS

Phone OTP delivery is implemented in `backend/src/Service/sms.service.js`.

- Development uses the Fast2SMS Quick Route.
- Production uses the DLT route and requires the configured API key, approved sender ID, and template ID.
- The provider request has a 15-second timeout and provider rejection is surfaced to the calling route.
- Registration, phone recovery, and first-time staff PIN flows use this service.
- The DLT-approved template must match the text and OTP placeholder format sent by the application. Validate this with the SMS provider before production use.

No live SMS delivery is implied by a local build or mocked test; use a controlled test phone after configuring production credentials and completing any provider recharge/approval.

### Email

Email messages are sent using Resend. The sender address is set in `backend/src/Service/email.service.js`; verify that domain/address with Resend. Check provider responses and production domain configuration before relying on OTP delivery.

### Profile photos

The authenticated `/api/auth/profile/image` endpoint accepts JPG, PNG, and WebP files up to 5 MB and uploads them to Cloudinary using server-side credentials. Only profile photos use Cloudinary. App icons, character artwork, and other visual assets stay in the frontend.

## 10. Data model overview

MongoDB models include:

- **User / Session / OTP:** accounts, refresh sessions, one-time codes.
- **Settings:** Seth/mandi profile and default deductions.
- **Farmer / WeightEntry / Transaction / Settlement:** farmer records and trading/accounting operations.
- **CropRate / Expense / FundTransfer:** rate and financial records.
- **GodownStock / B2bDispatch / InterestAccrual:** inventory, dispatch, and interest features.

The application scopes many records by the owning Seth/mandi. Use backend controllers and model relationships as the source of truth for tenant boundaries.

## 11. Production deployment checklist

1. Install dependencies from the committed lockfiles (`npm ci` in each package directory).
2. Set `NODE_ENV=production`, `MONGO_URI`, a strong `JWT_SECRET`, and required provider credentials on the backend host.
3. Configure and verify the Resend sender domain.
4. Configure Fast2SMS API key, DLT sender ID, template ID, matching approved template, and account balance.
5. Configure Cloudinary credentials only if profile photo uploads are enabled.
6. Add the exact production frontend origin to the CORS allowlist in `backend/src/index.js`.
7. Deploy the frontend with its API base set to the backend API URL ending in `/api`.
8. Use HTTPS for frontend and API; confirm refresh cookies work across the deployed origins.
9. Verify `/api/healthz`, login, refresh, logout, role-specific API access, OTP delivery, and profile image upload in a staging environment.
10. Run `npm audit` from the backend and frontend package directories and resolve newly reported advisories.

## 12. Troubleshooting

| Symptom | Checks |
|---|---|
| Frontend cannot reach API | Confirm `VITE_BACKEND_URL` includes `/api`, backend port is reachable, and CORS allows the frontend origin |
| API reports MongoDB unavailable | Check `MONGO_URI`, network access rules, database credentials, and `/api/healthz` |
| SMS OTP is not received | Check API key, Fast2SMS account balance, response/error logs, sender/template approval, template text match, phone number, and production `NODE_ENV` |
| Email OTP is not received | Check Resend API key, verified sender/domain, delivery logs, recipient, and spam folder |
| Refresh/login behaves differently in production | Confirm HTTPS, cookie settings, allowed origin, credentialed CORS, and browser cookie policy |
| Profile photo upload fails | Check Cloudinary server variables, multipart field name `image`, accepted image format, 5 MB limit, and backend logs |
| Local dev process cannot send SMS | Configure a development Fast2SMS key; console OTP output is not enabled in the application |

## 13. Known implementation notes

- Backend CORS origins are currently hardcoded in `backend/src/index.js`; `FRONTEND_URL` is not currently used there.
- Vite development proxy configuration and the frontend API base both read `VITE_BACKEND_URL`; configure and verify the local API base as documented above.
- Offline synchronization is implemented for selected non-auth write requests. Authentication requests are intentionally not queued as successful offline operations.
- The application has no automated test command configured in its package scripts. Use builds, syntax checks, provider mocks, and staging integration tests as appropriate.
