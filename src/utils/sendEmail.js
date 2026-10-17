/**
 * D.WORLD Transactional Email Service
 * 
 * Provider: Gmail SMTP via Nodemailer
 * - Works for ALL recipient email addresses with no restrictions
 * - Sender display name is controlled by the Gmail account's profile name
 *   → Go to myaccount.google.com → Personal info → Name → set to "D.WORLD LCU"
 * 
 * Resend is kept for future use (needs a verified domain to send to all addresses)
 */

const nodemailer = require('nodemailer');

// ── Gmail Transporter ─────────────────────────────────────────────────────────
const getTransporter = () => {
    const user = (process.env.GMAIL_USER || 'ifeanyichukwubethel1@gmail.com').trim();
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (!pass) throw new Error('GMAIL_APP_PASSWORD is not set in environment variables.');

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    });
};

// ── Sender name (set your Gmail account display name to match this) ───────────
const SENDER_NAME = 'D.WORLD LCU';
const SENDER_EMAIL = process.env.GMAIL_USER || 'ifeanyichukwubethel1@gmail.com';
const FROM = `"${SENDER_NAME}" <${SENDER_EMAIL}>`;

// ── Shared styles ─────────────────────────────────────────────────────────────
const BASE_STYLES = `
  body { margin:0; padding:0; background:#0b0f1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#e2e8f0; }
  .wrap { max-width:520px; margin:32px auto; background:#111827; border-radius:20px; border:1px solid #1e293b; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.6); }
  .top-bar { background:linear-gradient(135deg,#4f46e5,#7c3aed); padding:28px 36px; text-align:center; }
  .logo { font-size:26px; font-weight:900; color:#fff; letter-spacing:0.12em; text-transform:uppercase; }
  .logo-sub { font-size:11px; color:rgba(255,255,255,0.6); letter-spacing:0.2em; text-transform:uppercase; margin-top:4px; }
  .body-pad { padding:36px 36px 28px; }
  .title { font-size:22px; font-weight:800; color:#f8fafc; margin:0 0 10px; line-height:1.3; }
  .txt { font-size:15px; color:#94a3b8; line-height:1.7; margin:0 0 24px; }
  .otp-card { background:linear-gradient(135deg,rgba(79,70,229,0.15),rgba(124,58,237,0.2)); border:2px dashed #4f46e5; border-radius:16px; padding:24px; text-align:center; margin:0 0 24px; }
  .otp { font-size:44px; font-weight:900; color:#a5b4fc; letter-spacing:10px; margin:0; font-family:'Courier New',Courier,monospace; }
  .otp-hint { font-size:13px; color:#64748b; margin:8px 0 0; }
  .notice { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:10px; padding:14px 18px; font-size:13px; color:#fbbf24; margin:0 0 24px; line-height:1.5; }
  .success-card { background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.18)); border:2px solid rgba(16,185,129,0.25); border-radius:16px; padding:24px; text-align:center; margin:0 0 24px; }
  .success-icon { font-size:40px; margin:0 0 12px; }
  .footer { background:#0d1117; padding:20px 36px; text-align:center; font-size:12px; color:#374151; border-top:1px solid #1e293b; }
`;

const footerHtml = () => `
  <div class="footer">
    &copy; ${new Date().getFullYear()} <strong style="color:#6366f1;">D.WORLD</strong> &mdash; Lead City University Campus Services<br/>
    <span style="font-size:11px;color:#1f2937;">This is an automated message. Do not reply directly.</span>
  </div>
`;

const htmlWrap = (topBar, body) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>${BASE_STYLES}</style></head>
<body><div class="wrap">
  <div class="top-bar">${topBar}</div>
  <div class="body-pad">${body}</div>
  ${footerHtml()}
</div></body></html>`;

// ── Core send: Brevo HTTPS REST API (Port 443) with Gmail SMTP fallback ────────
const sendEmail = async ({ to, subject, html }) => {
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || '1bethel312@gmail.com').trim();
    const senderName = 'D.WORLD LCU';

    // 1. If BREVO_API_KEY is configured, use Brevo REST API over HTTPS (Port 443)
    // Port 443 is NEVER blocked by Render or cloud firewalls
    if (brevoApiKey) {
        console.log(`[EMAIL ATTEMPT] Sending "${subject}" → ${to} via Brevo HTTP API (Port 443)...`);
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: senderName,
                    email: senderEmail
                },
                to: [{ email: to.trim() }],
                subject: subject,
                htmlContent: html
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[BREVO ERROR]:', data);
            throw new Error(data.message || 'Failed to send email via Brevo');
        }

        console.log(`[EMAIL SENT via Brevo] ✔ "${subject}" → ${to} | MsgId: ${data.messageId}`);
        return { success: true, provider: 'brevo', messageId: data.messageId };
    }

    // 2. Fall back to Gmail SMTP (ideal for local development)
    const transporter = getTransporter();
    console.log(`[EMAIL ATTEMPT] Sending "${subject}" → ${to} via Gmail SMTP (smtp.gmail.com:465)...`);
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[EMAIL SENT via Gmail] ✔ "${subject}" → ${to} | MsgId: ${info.messageId}`);
    return { success: true, provider: 'gmail', messageId: info.messageId };
};

// ── 1. Registration OTP ───────────────────────────────────────────────────────
const sendRegistrationOtpEmail = async (email, name, otp) => {
    const topBar = `<div class="logo">D·WORLD</div><div class="logo-sub">Lead City University</div>`;
    const body = `
      <p class="title">Verify your email address 📬</p>
      <p class="txt">Hi <strong style="color:#e2e8f0;">${name || 'there'}</strong>,<br/>
      Welcome to D.World! Enter the 6-digit code below to verify your email and complete your account setup.</p>
      <div class="otp-card">
        <p class="otp">${otp}</p>
        <p class="otp-hint">Expires in <strong style="color:#a5b4fc;">10 minutes</strong></p>
      </div>
      <div class="notice">⚠️ <strong>Never share this code.</strong> D.World staff will never ask for your verification code.</div>
      <p class="txt" style="margin:0;font-size:13px;">If you did not create a D.World account, you can safely ignore this email.</p>`;
    return sendEmail({ to: email, subject: `${otp} — Verify your D.WORLD account`, html: htmlWrap(topBar, body) });
};

// ── 2. Password Reset OTP ─────────────────────────────────────────────────────
const sendPasswordResetEmail = async (email, name, otp) => {
    const topBar = `<div class="logo">D·WORLD</div><div class="logo-sub">Password Reset</div>`;
    const body = `
      <p class="title">Reset your password 🔐</p>
      <p class="txt">Hi <strong style="color:#e2e8f0;">${name || 'there'}</strong>,<br/>
      We received a request to reset your D.World password. Use the code below. If you did not request this, ignore this email.</p>
      <div class="otp-card" style="border-color:#7c3aed;">
        <p class="otp" style="color:#c4b5fd;">${otp}</p>
        <p class="otp-hint">Expires in <strong style="color:#c4b5fd;">10 minutes</strong></p>
      </div>
      <div class="notice">🔒 <strong>Security tip:</strong> Never share this code with anyone.</div>`;
    return sendEmail({ to: email, subject: `${otp} — D.WORLD Password Reset Code`, html: htmlWrap(topBar, body) });
};

// ── 3. Booking Confirmation ───────────────────────────────────────────────────
const sendBookingConfirmationEmail = async (email, name, bookingDetails) => {
    const { service, date, time, expert } = bookingDetails || {};
    const topBar = `<div class="logo">D·WORLD</div><div class="logo-sub">Booking Confirmed</div>`;
    const body = `
      <div class="success-card">
        <div class="success-icon">🎉</div>
        <p style="margin:0;font-size:18px;font-weight:800;color:#34d399;">Booking Confirmed!</p>
      </div>
      <p class="title" style="font-size:18px;">Your appointment is set, ${name?.split(' ')[0] || 'Student'}!</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr><td style="padding:10px 14px;background:#0d1117;border-radius:8px 8px 0 0;font-size:13px;color:#64748b;font-weight:600;">SERVICE</td>
            <td style="padding:10px 14px;background:#0d1117;border-radius:8px 8px 0 0;font-size:14px;color:#e2e8f0;font-weight:700;text-align:right;">${service || 'Campus Service'}</td></tr>
        <tr><td style="padding:10px 14px;background:#111827;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #1e293b;">DATE</td>
            <td style="padding:10px 14px;background:#111827;font-size:14px;color:#a5b4fc;font-weight:700;text-align:right;border-top:1px solid #1e293b;">${date || '—'}</td></tr>
        <tr><td style="padding:10px 14px;background:#0d1117;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #1e293b;">TIME</td>
            <td style="padding:10px 14px;background:#0d1117;font-size:14px;color:#a5b4fc;font-weight:700;text-align:right;border-top:1px solid #1e293b;">${time || '—'}</td></tr>
        <tr><td style="padding:10px 14px;background:#111827;border-radius:0 0 8px 8px;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #1e293b;">EXPERT</td>
            <td style="padding:10px 14px;background:#111827;border-radius:0 0 8px 8px;font-size:14px;color:#34d399;font-weight:700;text-align:right;border-top:1px solid #1e293b;">${expert || 'Assigned Expert'}</td></tr>
      </table>
      <p class="txt" style="font-size:13px;margin:0;">Log in to your D.World dashboard to manage your appointment at any time.</p>`;
    return sendEmail({ to: email, subject: `✅ Booking Confirmed — ${service || 'Your Appointment'} on ${date || ''}`, html: htmlWrap(topBar, body) });
};

// ── 4. Expert Activation ──────────────────────────────────────────────────────
const sendExpertActivationEmail = async (email, name) => {
    const topBar = `<div class="logo">D·WORLD</div><div class="logo-sub">Expert Activated</div>`;
    const body = `
      <div class="success-card">
        <div class="success-icon">⭐</div>
        <p style="margin:0;font-size:18px;font-weight:800;color:#34d399;">You're now Active!</p>
      </div>
      <p class="title" style="font-size:18px;">Welcome to the Expert Team, ${name?.split(' ')[0] || 'Expert'}!</p>
      <p class="txt">Your D.World Expert account has been <strong style="color:#34d399;">successfully activated</strong>. Students can now discover your services and book with you.</p>
      <div class="notice" style="background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25);color:#34d399;">
        🚀 <strong>Next step:</strong> Log in to your Expert Dashboard to set your availability and manage bookings.
      </div>`;
    return sendEmail({ to: email, subject: `🌟 Your D.WORLD Expert account is now active!`, html: htmlWrap(topBar, body) });
};

module.exports = {
    sendRegistrationOtpEmail,
    sendPasswordResetEmail,
    sendBookingConfirmationEmail,
    sendExpertActivationEmail
};
