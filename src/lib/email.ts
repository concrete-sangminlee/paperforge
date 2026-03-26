import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

/**
 * Send an email using the configured SMTP transport.
 * Errors are caught and logged — callers should not break on email failure
 * since email is a best-effort notification.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@paperforge.dev',
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`[email] Failed to send to ${to}:`, error instanceof Error ? error.message : error);
    return false;
  }
}
