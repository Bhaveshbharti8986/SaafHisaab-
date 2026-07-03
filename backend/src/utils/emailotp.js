export function getOtpHtml(otp) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6; /* light neutral background */
      margin: 0;
      padding: 0;
      color: #1f2937; /* dark gray text */
    }
    .container {
      max-width: 480px;
      margin: 50px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.08);
      padding: 40px 30px;
      text-align: center;
    }
    h2 {
      font-size: 22px;
      margin-bottom: 16px;
      color: #2563eb; /* modern blue accent */
    }
    .otp {
      font-size: 36px;
      font-weight: bold;
      color: #dc2626; /* strong red highlight */
      letter-spacing: 6px;
      margin: 24px 0;
    }
    .info {
      font-size: 14px;
      color: #4b5563; /* medium gray for readability */
      margin-top: 12px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #9ca3af; /* muted gray for footer */
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>🔐 Email Verification</h2>
    <p>Use the following One-Time Password (OTP) to complete your verification:</p>
    <p class="otp">${otp}</p>
    <p class="info">This code will expire in <strong>5 minutes</strong>. Please do not share it with anyone.</p>
    <div class="footer">
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} YourApp Inc.</p>
    </div>
  </div>
</body>
</html>`;
}