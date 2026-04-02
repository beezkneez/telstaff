import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = "BetterStaff <noreply@betterstaff.app>";

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] No RESEND_API_KEY, skipping welcome email");
    return;
  }

  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to BetterStaff",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0b0e14; color: #e2e4e9;">
          <h1 style="color: #ff4a1c; font-size: 24px; margin-bottom: 8px;">Welcome to BetterStaff</h1>
          <p>Hey ${name},</p>
          <p>Your account is ready. Here's what you can do:</p>
          <ul style="color: #9ca3af;">
            <li>View real-time staffing across all 31 stations</li>
            <li>See which truck you're on — auto-detects your assignment</li>
            <li>Track overtime predictions and call-in estimates</li>
            <li>Check shift paybacks and who owes who</li>
            <li>View the shift calendar with platoon rotations</li>
          </ul>
          <p style="color: #9ca3af; margin-top: 16px;">
            <strong style="color: #ff4a1c;">About Overtime Predictions:</strong> The overtime predictor learns from real data and gets smarter over time. The more it scrapes, the more accurate the call-in estimates become. Give it a few cycles and you'll see it dial in.
          </p>
          <p style="color: #9ca3af; margin-top: 16px;">
            <strong>Tip:</strong> Add it to your home screen for the best experience — it works like a native app.
          </p>
          <p style="color: #6b7394; font-size: 12px; margin-top: 24px;">
            BetterStaff — betterstaff.app
          </p>
        </div>
      `,
    });
    console.log("[email] Welcome email sent to", to);
  } catch (err) {
    console.error("[email] Failed to send welcome email:", err);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] No RESEND_API_KEY, skipping reset email");
    return;
  }

  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "BetterStaff — Reset Your Password",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0b0e14; color: #e2e4e9;">
          <h1 style="color: #ff4a1c; font-size: 24px; margin-bottom: 8px;">Password Reset</h1>
          <p>Someone requested a password reset for your BetterStaff account. Click below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #ff4a1c; color: white; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Reset Password
          </a>
          <p style="color: #9ca3af; font-size: 12px;">
            If you didn't request this, just ignore this email — your password won't change.
          </p>
          <p style="color: #6b7394; font-size: 12px; margin-top: 24px;">
            BetterStaff — betterstaff.app
          </p>
        </div>
      `,
    });
    console.log("[email] Reset email sent to", to);
  } catch (err) {
    console.error("[email] Failed to send reset email:", err);
  }
}
