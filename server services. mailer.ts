// server/services/mailer.ts
import nodemailer from "nodemailer";

// Set up the secure transport layer using your system parameters
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SYSTEM_ADMIN_EMAIL || "nycpetalertwarningsystem@gmail.com",
    // Utilize an App Password generated in your Google Account Security settings
    pass: process.env.GMAIL_APP_PASSWORD, 
  },
});

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Dispatches automated transactional emails securely from the master account
 */
export async function sendSystemEmail({ to, subject, html }: EmailPayload) {
  try {
    const mailOptions = {
      from: `"P.A.W.S. Network Alerts" <${process.env.TRANSACTIONAL_FROM_EMAIL || "nycpetalertwarningsystem@gmail.com"}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Transactional email dispatched successfully: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error("[MAILER ERROR] Failed to deliver system notification message:", error);
    return { success: false, error };
  }
}
