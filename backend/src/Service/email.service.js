import { Resend } from 'resend';
import config from "../Config/Congig.js";

// Initialize Resend with your API Key from your config
const resend = new Resend(config.RESEND_API_KEY);

export const sendEmail = async (to, subject, text, html) => {
  try {
    const data = await resend.emails.send({
      // Use a verified domain or "onboarding@resend.dev" for testing
      from: 'no-reply@email.newevents.store', 
      to: [to],
      subject: subject,
      text: text,
      html: html,
    });

    console.log("Message sent successfully:", data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("Error sending email with Resend:", error);
    throw error;
  }
};