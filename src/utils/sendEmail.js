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
const SENDER_NAME = 'D.WORLD';
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
    &copy; ${new Date().getFullYear()} <strong style="color:#6366f1;">D.WORLD</strong> &mdash; Campus Appointments &amp; Styling<br/>
    <a href="https://dworld.ink" style="color:#818cf8;text-decoration:none;font-weight:600;font-size:12px;display:inline-block;margin-top:6px;">🌐 dworld.ink</a><br/>
    <span style="font-size:11px;color:#475569;display:inline-block;margin-top:4px;">This is an automated message from the D.WORLD Campus Platform.</span>
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
    const senderName = 'D.WORLD';

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
    const topBar = `<div class="logo">D·WORLD</div><div class="logo-sub">Account Verification</div>`;
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

// ── 5. Welcome Email (Guide & Platform Tips) ──────────────────────────────────
const sendWelcomeEmail = async (email, name, role = 'user') => {
    const isExpert = (role === 'expert' || role === 'stylist');
    const firstName = name ? name.split(' ')[0] : (isExpert ? 'Expert' : 'Student');
    const topBar = `<div class="logo">D·WORLD</div><div class="logo-sub">${isExpert ? 'Expert Network' : 'Campus Marketplace'}</div>`;

    let stepsHtml = '';
    if (isExpert) {
        stepsHtml = `
          <div style="background:#0d1117;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:20px;">
            <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#f8fafc;">🚀 5 Steps to Grow Your Campus Business:</p>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#4f46e5;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">1</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Activate Your Profile</strong><br/><span style="color:#94a3b8;font-size:13px;">Pay the one-time ₦3,000 activation fee on your dashboard to appear in student searches.</span></div>
            </div>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#4f46e5;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">2</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Review Your Specialty Service</strong><br/><span style="color:#94a3b8;font-size:13px;">Adjust your price, duration, and styling description from your Expert Dashboard.</span></div>
            </div>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#4f46e5;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">3</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Set Availability Around Lectures</strong><br/><span style="color:#94a3b8;font-size:13px;">Define which days and lecture-free hours students can book you.</span></div>
            </div>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#4f46e5;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">4</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Receive Bookings & Direct Chat</strong><br/><span style="color:#94a3b8;font-size:13px;">Communicate with students right on D.WORLD for special styling requests.</span></div>
            </div>
            <div style="display:flex;">
              <span style="display:inline-block;width:24px;height:24px;background:#4f46e5;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">5</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Earn Securely into Your Wallet</strong><br/><span style="color:#94a3b8;font-size:13px;">Payments are held securely and released instantly upon appointment completion.</span></div>
            </div>
          </div>
        `;
    } else {
        stepsHtml = `
          <div style="background:#0d1117;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:20px;">
            <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#f8fafc;">💡 How to Use D.WORLD in 5 Easy Steps:</p>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#10b981;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">1</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Browse Campus Experts</strong><br/><span style="color:#94a3b8;font-size:13px;">Discover student barbers, hair braiders, lash techs, and nail artists right on campus.</span></div>
            </div>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#10b981;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">2</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Book in 30 Seconds</strong><br/><span style="color:#94a3b8;font-size:13px;">Select your service, choose a date & time between your classes, and tap Book.</span></div>
            </div>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#10b981;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">3</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Cashless Student Wallet</strong><br/><span style="color:#94a3b8;font-size:13px;">Top up securely with Paystack. No cash needed, no change issues, with auto-refund protection.</span></div>
            </div>
            <div style="display:flex;margin-bottom:14px;">
              <span style="display:inline-block;width:24px;height:24px;background:#10b981;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">4</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Live In-App Chat</strong><br/><span style="color:#94a3b8;font-size:13px;">Send inspiration pictures or get directions directly from your stylist.</span></div>
            </div>
            <div style="display:flex;">
              <span style="display:inline-block;width:24px;height:24px;background:#10b981;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:12px;flex-shrink:0;">5</span>
              <div><strong style="color:#e2e8f0;font-size:14px;">Rate & Review</strong><br/><span style="color:#94a3b8;font-size:13px;">Leave honest reviews to help your fellow students find top-tier talent.</span></div>
            </div>
          </div>
        `;
    }

    const body = `
      <div class="success-card">
        <div class="success-icon">🎉</div>
        <p style="margin:0;font-size:20px;font-weight:800;color:#34d399;">Welcome to D.WORLD!</p>
      </div>
      <p class="title">Hey ${firstName}! 👋</p>
      <p class="txt">Your D.WORLD account is officially verified and ready. D.WORLD connects you with verified campus specialists to make appointments fast, reliable, and 100% cashless.</p>
      
      ${stepsHtml}

      <div style="text-align:center;margin:28px 0 20px;">
        <a href="https://dworld.ink/${isExpert ? 'expert' : 'dashboard'}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:800;font-size:15px;box-shadow:0 8px 20px rgba(79,70,229,0.35);">
          Open My D.WORLD Workspace &rarr;
        </a>
      </div>

      <div class="notice">
        🔒 <strong>Safety Tip:</strong> Always keep appointments within D.WORLD for secure payments, auto-refunds, and campus support.
      </div>
      <p class="txt" style="margin:0;font-size:13px;text-align:center;">Need help? Reply to this email or visit your D.WORLD dashboard support anytime.</p>
    `;

    return sendEmail({
        to: email,
        subject: `🎉 Welcome to D.WORLD, ${firstName}! Here is how to get started`,
        html: htmlWrap(topBar, body)
    });
};

const sendContactInquiryEmail = async ({ name, email, message }) => {
    const adminEmail = 'beatsnitro101@gmail.com';
    const topBar = `
      <div class="logo">D.WORLD</div>
      <div class="logo-sub">Campus Help Desk &bull; D.World Support</div>
    `;

    const body = `
      <div class="success-card" style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(124,58,237,0.2));border-color:#6366f1;">
        <div class="success-icon">📬</div>
        <p style="margin:0;font-size:20px;font-weight:800;color:#818cf8;">New User Inquiry Received</p>
      </div>
      <p class="title">Incoming Help Desk Inquiry</p>
      <p class="txt">A user has submitted an inquiry on the D.WORLD platform:</p>

      <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #334155;">
        <div style="margin-bottom:12px;">
          <strong style="color:#94a3b8;font-size:12px;text-transform:uppercase;display:block;letter-spacing:0.05em;">Sender Name:</strong>
          <span style="color:#f8fafc;font-size:15px;font-weight:700;">${name}</span>
        </div>
        <div style="margin-bottom:12px;">
          <strong style="color:#94a3b8;font-size:12px;text-transform:uppercase;display:block;letter-spacing:0.05em;">Sender Email:</strong>
          <a href="mailto:${email}" style="color:#818cf8;font-size:15px;text-decoration:none;font-weight:600;">${email}</a>
        </div>
        <div>
          <strong style="color:#94a3b8;font-size:12px;text-transform:uppercase;display:block;letter-spacing:0.05em;">Message:</strong>
          <div style="color:#e2e8f0;font-size:14px;line-height:1.6;margin-top:4px;white-space:pre-wrap;background:#0f172a;padding:12px 14px;border-radius:8px;border:1px solid #1e293b;">${message}</div>
        </div>
      </div>

      <div style="text-align:center;margin:28px 0 20px;">
        <a href="mailto:${email}?subject=RE: D.WORLD Inquiry from ${encodeURIComponent(name)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:800;font-size:15px;box-shadow:0 8px 20px rgba(79,70,229,0.35);">
          Reply Directly to ${name} &rarr;
        </a>
      </div>
    `;

    return sendEmail({
        to: adminEmail,
        subject: `📬 New User Inquiry from ${name} (${email}) - D.WORLD`,
        html: htmlWrap(topBar, body)
    });
};

const sendAppointmentReminderEmail = async ({ email, clientName, expertName, serviceName, date, time, location }) => {
    const topBar = `<div class="logo">D·WORLD</div><div class="logo-sub">Appointment Reminder</div>`;
    const body = `
      <div class="success-card" style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(124,58,237,0.2));border-color:#6366f1;">
        <div class="success-icon">⏰</div>
        <p style="margin:0;font-size:18px;font-weight:800;color:#818cf8;">Upcoming Appointment Soon!</p>
      </div>
      <p class="title">Hello ${clientName?.split(' ')[0] || 'there'}, your styling session is coming up!</p>
      <p class="txt">This is a quick reminder about your scheduled appointment on D.WORLD:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border-radius:10px;overflow:hidden;border:1px solid #1e293b;">
        <tr><td style="padding:10px 14px;background:#0d1117;font-size:13px;color:#64748b;font-weight:600;">SERVICE</td>
            <td style="padding:10px 14px;background:#0d1117;font-size:14px;color:#e2e8f0;font-weight:700;text-align:right;">${serviceName || 'Campus Service'}</td></tr>
        <tr><td style="padding:10px 14px;background:#111827;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #1e293b;">DATE & TIME</td>
            <td style="padding:10px 14px;background:#111827;font-size:14px;color:#a5b4fc;font-weight:700;text-align:right;border-top:1px solid #1e293b;">${date} at ${time}</td></tr>
        <tr><td style="padding:10px 14px;background:#0d1117;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #1e293b;">EXPERT</td>
            <td style="padding:10px 14px;background:#0d1117;font-size:14px;color:#34d399;font-weight:700;text-align:right;border-top:1px solid #1e293b;">${expertName || 'Specialist'}</td></tr>
        ${location ? `<tr><td style="padding:10px 14px;background:#111827;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #1e293b;">LOCATION</td>
            <td style="padding:10px 14px;background:#111827;font-size:13px;color:#e2e8f0;font-weight:600;text-align:right;border-top:1px solid #1e293b;">${location}</td></tr>` : ''}
      </table>
      <div class="notice">
        📍 Please ensure you are ready on campus at the scheduled time. Need to chat? Open Live Chat in your dashboard.
      </div>
    `;
    return sendEmail({
        to: email,
        subject: `⏰ Reminder: Your styling session for "${serviceName}" is soon (${time})`,
        html: htmlWrap(topBar, body)
    });
};

module.exports = {
    sendRegistrationOtpEmail,
    sendPasswordResetEmail,
    sendBookingConfirmationEmail,
    sendExpertActivationEmail,
    sendWelcomeEmail,
    sendContactInquiryEmail,
    sendAppointmentReminderEmail
};
