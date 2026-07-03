# Rular Ledger Authentication API Documentation

Complete authentication system with phone/email OTP verification, forgot password, and secure session management.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Postman Setup](#postman-setup)
- [Test Cases](#test-cases)
- [Security Features](#security-features)
- [Error Handling](#error-handling)

## 🎯 Overview

This authentication system provides:
- **Dual OTP verification** (Phone + Email) for registration
- **Flexible login** (Phone/Email/Employee ID)
- **Forgot password** with Phone/Email OTP support
- **Secure session management** with refresh tokens
- **Profile management** for all user types
- **Multi-device logout** support

## ✨ Features

### Registration
- Phone OTP verification
- Email OTP verification
- Seth (Admin) account creation
- Automatic settings and godown stock initialization

### Login
- Multiple login methods (Phone/Email/Employee ID)
- JWT-based authentication
- Refresh token mechanism
- Session management

### Forgot Password
- Phone OTP reset
- Email OTP reset
- OTP verification (optional step)
- Automatic session revocation after reset

### Profile Management
- Get profile information
- Update profile details
- Change password
- Session security

### Logout
- Single device logout
- All devices logout
- Session cleanup

## 🔗 API Endpoints

### Registration Endpoints

#### 1. Send Phone OTP for Registration
```http
POST /api/auth/register/phone-otp
Content-Type: application/json

{
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "message": "OTP sent to your phone for registration",
  "demoOtp": "654321"
}
```

#### 2. Send Email OTP for Registration
```http
POST /api/auth/register/email-otp
Content-Type: application/json

{
  "email": "seth@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email for registration",
  "demoOtp": "123456"
}
```

#### 3. Register Seth (Complete Registration)
```http
POST /api/auth/register
Content-Type: application/json

{
  "ownerName": "Rajesh Kumar",
  "phone": "9876543210",
  "phoneotp": "654321",
  "email": "seth@example.com",
  "emailotp": "123456",
  "businessName": "Rajesh Traders",
  "gstNumber": "29ABCDE1234F1Z5",
  "address": "123 Main Market, Mandi",
  "village": "Rampur",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Mandi registered successfully!",
  "user": {
    "id": "user_id_here",
    "name": "Rajesh Kumar",
    "role": "seth"
  },
  "accessToken": "jwt_access_token_here"
}
```

### Login Endpoints

#### 4. Login
```http
POST /api/auth/login
Content-Type: application/json

// Login with Phone
{
  "employeeId": "9876543210",
  "pin": "SecurePass123"
}

// Login with Email
{
  "employeeId": "seth@example.com",
  "pin": "SecurePass123"
}

// Login with Employee ID
{
  "employeeId": "EMP-S-2026-ABC123",
  "pin": "1234"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id_here",
    "role": "seth",
    "name": "Rajesh Kumar"
  },
  "accessToken": "jwt_access_token_here"
}
```

### Token Management

#### 5. Refresh Access Token
```http
POST /api/auth/refresh-token
Cookie: refreshToken=your_refresh_token_here
```

**Response:**
```json
{
  "message": "Access token refreshed successfully",
  "accessToken": "new_jwt_access_token_here"
}
```

### Forgot Password Endpoints

#### 6. Send OTP to Phone for Password Reset
```http
POST /api/auth/forgot-password/phone
Content-Type: application/json

{
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "message": "OTP sent to your phone for password reset",
  "demoOtp": "654321"
}
```

#### 7. Send OTP to Email for Password Reset
```http
POST /api/auth/forgot-password/email
Content-Type: application/json

{
  "email": "seth@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email for password reset",
  "demoOtp": "123456"
}
```

#### 8. Verify OTP for Password Reset (Optional)
```http
POST /api/auth/forgot-password/verify-otp
Content-Type: application/json

{
  "method": "phone",
  "identifier": "9876543210",
  "otp": "654321"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully",
  "verified": true
}
```

#### 9. Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

// Reset with Phone OTP
{
  "method": "phone",
  "identifier": "9876543210",
  "otp": "654321",
  "newPassword": "NewSecurePass456"
}

// Reset with Email OTP
{
  "method": "email",
  "identifier": "seth@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass456"
}
```

**Response:**
```json
{
  "message": "Password reset successfully. Please login with your new password.",
  "note": "You have been logged out from all devices for security"
}
```

### Profile Management Endpoints (Protected)

#### 10. Get Profile
```http
GET /api/auth/profile
Authorization: Bearer your_access_token_here
```

**Response:**
```json
{
  "ownerName": "Rajesh Kumar",
  "email": "seth@example.com",
  "phone": "9876543210",
  "businessName": "Rajesh Traders",
  "gstNumber": "29ABCDE1234F1Z5",
  "address": "123 Main Market, Mandi",
  "village": "Rampur",
  "kardaPerBagKg": 0.5,
  "labourPerBagCash": 5,
  "shrinkagePercent": 2,
  "role": "seth",
  "employeeId": "SETH"
}
```

#### 11. Update Profile
```http
PATCH /api/auth/profile
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "ownerName": "Rajesh Kumar Updated",
  "email": "seth.updated@example.com",
  "phone": "9876543210",
  "businessName": "Rajesh Traders Updated",
  "address": "456 New Market, Mandi"
}
```

**Response:**
```json
{
  "ownerName": "Rajesh Kumar Updated",
  "email": "seth.updated@example.com",
  "phone": "9876543210",
  "businessName": "Rajesh Traders Updated",
  "gstNumber": "29ABCDE1234F1Z5",
  "address": "456 New Market, Mandi",
  "village": "Rampur",
  "kardaPerBagKg": 0.5,
  "labourPerBagCash": 5,
  "shrinkagePercent": 2
}
```

#### 12. Change Password
```http
POST /api/auth/change-password
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "oldPassword": "SecurePass123",
  "newPassword": "AnotherSecurePass789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully!"
}
```

### Logout Endpoints (Protected)

#### 13. Logout from Current Device
```http
POST /api/auth/logout
Authorization: Bearer your_access_token_here
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### 14. Logout from All Devices
```http
POST /api/auth/logout-all
Authorization: Bearer your_access_token_here
```

**Response:**
```json
{
  "message": "Logged out from all devices successfully"
}
```

## 🧪 Postman Setup

### 1. Import Collection
1. Open Postman
2. Click "Import" in the top left
3. Select the `Postman_Auth_API_Tests.json` file
4. The collection will be imported with all test cases

### 2. Set Environment Variables
Create a new environment in Postman with these variables:

```
base_url: http://localhost:8080
access_token: (will be set automatically during login)
```

### 3. Configure Tests
- Set `base_url` to your backend URL
- Run registration tests first
- Copy the `accessToken` from login response
- Set it as environment variable for protected endpoints

## 📝 Test Cases

### Test Case 1: Complete Registration Flow
1. **Send Phone OTP**: `POST /api/auth/register/phone-otp`
2. **Send Email OTP**: `POST /api/auth/register/email-otp`
3. **Register Seth**: `POST /api/auth/register` with OTPs

### Test Case 2: Login Flow
1. **Login with Phone**: `POST /api/auth/login` with phone number
2. **Login with Email**: `POST /api/auth/login` with email
3. **Login with Employee ID**: `POST /api/auth/login` with employee ID

### Test Case 3: Forgot Password Flow (Phone)
1. **Send Phone OTP**: `POST /api/auth/forgot-password/phone`
2. **Verify OTP** (Optional): `POST /api/auth/forgot-password/verify-otp`
3. **Reset Password**: `POST /api/auth/reset-password`

### Test Case 4: Forgot Password Flow (Email)
1. **Send Email OTP**: `POST /api/auth/forgot-password/email`
2. **Verify OTP** (Optional): `POST /api/auth/forgot-password/verify-otp`
3. **Reset Password**: `POST /api/auth/reset-password`

### Test Case 5: Profile Management
1. **Login**: Get access token
2. **Get Profile**: `GET /api/auth/profile`
3. **Update Profile**: `PATCH /api/auth/profile`
4. **Change Password**: `POST /api/auth/change-password`

### Test Case 6: Token Refresh
1. **Login**: Get refresh token in cookie
2. **Wait 15 minutes** (access token expiry)
3. **Refresh Token**: `POST /api/auth/refresh-token`

### Test Case 7: Logout
1. **Login**: Create session
2. **Logout Current**: `POST /api/auth/logout`
3. **Login Again**: Create multiple sessions
4. **Logout All**: `POST /api/auth/logout-all`

## 🔒 Security Features

### 1. OTP Security
- **SHA-256 Hashing**: OTPs are hashed before storage
- **10-Minute Expiry**: OTPs expire automatically
- **One-time Use**: OTPs are deleted after use
- **Rate Limiting**: Existing OTPs are deleted before generating new ones

### 2. Password Security
- **Bcrypt Hashing**: Passwords are hashed with salt rounds
- **Minimum Length**: 6 characters required
- **Session Revocation**: All sessions revoked on password change

### 3. Token Security
- **JWT Access Tokens**: 15-minute expiry
- **Refresh Tokens**: 7-day expiry
- **HttpOnly Cookies**: Refresh tokens stored in httpOnly cookies
- **Secure Flag**: Cookies only sent over HTTPS in production
- **SameSite Strict**: CSRF protection

### 4. Session Management
- **Token Rotation**: Refresh tokens rotate on each refresh
- **Session Tracking**: All sessions tracked in database
- **Device Management**: Support for multi-device logout

### 5. Input Validation
- **Phone Format**: 10-digit validation
- **Email Format**: Standard email validation
- **Required Fields**: Comprehensive field validation
- **SQL Injection Prevention**: MongoDB parameterized queries

## ⚠️ Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Phone number is required"
}
```

#### 401 Unauthorized
```json
{
  "error": "Incorrect password"
}
```

#### 404 Not Found
```json
{
  "error": "User not found"
}
```

#### 409 Conflict
```json
{
  "error": "Phone number is already registered"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to process request"
}
```

### Error Codes
- `400`: Invalid input, validation errors
- `401`: Authentication failed, invalid credentials
- `403`: Token expired or revoked
- `404`: Resource not found
- `409`: Duplicate entry, conflict
- `500`: Server error

## 🚀 Production Setup

### 1. Environment Variables
```env
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
```

### 2. Remove Demo OTPs
In production, replace demo OTPs with actual SMS/Email services:

```javascript
// Remove these lines in production:
demoOtp: otp // from response

// Add actual SMS sending:
await sendSMS(phone, `Your OTP is: ${otp}`);

// Add actual Email sending:
await sendEmail(email, "OTP", `Your OTP is: ${otp}`);
```

### 3. Configure CORS
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### 4. Enable HTTPS
Ensure your server is running on HTTPS with valid SSL certificates.

## 📞 Support

For issues or questions, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-01  
**Status**: Production Ready