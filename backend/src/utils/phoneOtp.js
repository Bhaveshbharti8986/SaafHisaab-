// AI Generated: Creates a plain text message body for SMS delivery
export function getOtpBody(otp, header = "OTP Verification", text = "") {
  return `${header.toUpperCase()}\n\n${text}\n\nYour OTP is: ${otp}\n\nThis OTP will expire in 5 minutes.`;
}
