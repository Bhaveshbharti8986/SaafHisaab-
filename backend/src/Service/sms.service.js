import axios from "axios";
import config from "../Config/Congig.js"; 

// 💡 CONTROL SWITCH: Set this to true when you switch your project to production
const isProduction = false; 

/**
 * Sends an SMS text message. Uses Quick Route in dev, switches to DLT Route in production.
 * phone - Target phone number(s).
 * smsText - The exact text message body to send.
 */
export async function sendPhoneSms(phone, smsText) {
  try {
    // 1. DEV PAYLOAD
    let payload = {
      "route": "q",
      "message": smsText,
      "numbers": phone
    };

    // 2. PRODUCTION PAYLOAD (DLT Route - Will overwrite payload when isProduction is true)
    if (isProduction) {
      payload = {
        "route": "dlt",
        "sender_id": "YOUR_SENDER_ID",       // Replace with approved 6-character DLT Header
        "message": smsText,                 // Must match registered DLT template format exactly
        "template_id": "YOUR_TEMPLATE_ID", // Replace with  approved 19-digit DLT Template ID
        "numbers": phone
      };
    }

    // Send the request using the active payload profile
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      payload,
      {
        headers: {
          "authorization":config.FAST2SMS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Fast2SMS Error:", error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}
