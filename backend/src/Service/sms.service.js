import axios from "axios";
import config from "../Config/Congig.js";

/**
 * Sends an SMS through Fast2SMS. Production sends must use the configured DLT
 * sender and template; development may use the Fast2SMS quick route.
 */
export async function sendPhoneSms(phone, smsText) {
  if (!/^\d{10}$/.test(phone || "")) {
    return { success: false, error: "Phone number must contain 10 digits" };
  }
  if (typeof smsText !== "string" || !smsText.trim()) {
    return { success: false, error: "SMS message cannot be empty" };
  }
  if (!config.FAST2SMS_API_KEY) {
    return { success: false, error: "SMS provider is not configured" };
  }

  const isProduction = config.NODE_ENV === "production";
  const payload = {
    route: isProduction ? "dlt" : "q",
    message: smsText,
    numbers: phone,
  };

  if (isProduction) {
    if (!/^[A-Za-z0-9]{6}$/.test(config.FAST2SMS_SENDER_ID || "")) {
      return { success: false, error: "SMS DLT sender ID is not configured correctly" };
    }
    if (!/^\d{19}$/.test(config.FAST2SMS_TEMPLATE_ID || "")) {
      return { success: false, error: "SMS DLT template ID is not configured correctly" };
    }
    payload.sender_id = config.FAST2SMS_SENDER_ID;
    payload.template_id = config.FAST2SMS_TEMPLATE_ID;
  }

  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      payload,
      {
        headers: {
          authorization: config.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      },
    );

    if (response.data?.return !== true) {
      return {
        success: false,
        error: typeof response.data?.message === "string"
          ? response.data.message
          : "SMS provider rejected the request",
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Fast2SMS request failed:", error.response?.data || error.message);
    return {
      success: false, 
      error: error.response?.data?.message || "SMS provider request failed",
    };
  }
}
