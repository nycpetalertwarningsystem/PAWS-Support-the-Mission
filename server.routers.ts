// Add this import to the top of your server/routers.ts file
import { sendSystemEmail } from "./services/mailer";

// Inside your initializeHouseholdProfile mutation in server/routers.ts, 
// append the email notification block right before the return statement:

if (statusMarker === "promotional_free_10k" && ctx.user.email) {
  await sendSystemEmail({
    to: ctx.user.email,
    subject: "Welcome to P.A.W.S. – Founding Member Status Confirmed",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 8px;">
        <h2 style="color: #FF6B35;">Your Family & Pets are Protected</h2>
        <p>Thank you for joining the Pet Alert Warning System network at <strong>https://petalertwarningsys.com</strong>.</p>
        <p>Because you are one of our first 10,000 users, your account has been automatically upgraded to our <strong>Family Plus Tier completely free for life</strong>.</p>
        <ul>
          <li>Unlimited Pet Profile Registrations</li>
          <li>First-Responder CAD Dynamic Mapping Integrations</li>
          <li>Special-Needs & Vulnerable Family Registry Access</li>
        </ul>
        <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
          For platform support or administrative questions, reach out directly to our operations team at: nycpetalertwarningsystem@gmail.com
        </p>
      </div>
    `
  });
}
