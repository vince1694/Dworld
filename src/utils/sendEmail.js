/**
 * Production Transactional Email Service (Gmail SMTP via Nodemailer)
 * 
 * Configured with Google App Password for instant, reliable email delivery.
 * Brevo has been completely removed in accordance with configuration requirements.
 */

const nodemailer = require('nodemailer');

const withTimeout = (promise, ms = 8000) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Email operation timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

/**
 * Creates and returns configured Nodemailer Gmail transporter
 */
const getGmailTransporter = () => {
    const user = process.env.GMAIL_USER || 'ifeanyichukwubethel1@gmail.com';
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (!user || !pass) {
        throw new Error('Gmail SMTP credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing).');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user.trim(),
            pass: pass.trim()
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000
    });
};

/**
 * Send transactional email via Gmail SMTP
 */
const sendTransactionalEmail = async ({ toEmail, toName, subject, htmlContent }) => {
    return await withTimeout((async () => {
        const user = process.env.GMAIL_USER || 'ifeanyichukwubethel1@gmail.com';
        const senderName = process.env.EMAIL_SENDER_NAME || 'D.WORLD Lead City University';
        const transporter = getGmailTransporter();

        const info = await transporter.sendMail({
            from: `"${senderName}" <${user.trim()}>`,
            to: toName ? `"${toName}" <${toEmail.trim()}>` : toEmail.trim(),
            subject,
            html: htmlContent
        });

        console.log(`[EMAIL DISPATCHED] Successfully delivered to ${toEmail}. MessageId: ${info.messageId}`);
        return { success: true, provider: 'gmail', messageId: info.messageId };
    })(), 8000);
};

/**
 * Send 6-Digit Password Reset OTP Email
 */
const sendPasswordResetEmail = async (email, name, otp) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
            .container { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .brand { color: #4f46e5; font-size: 20px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
            .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-align: center; }
            .text { font-size: 15px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; text-align: center; }
            .otp-box { background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.2) 100%); border: 2px dashed #4f46e5; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 38px; font-weight: 800; color: #818cf8; letter-spacing: 8px; margin: 0; font-family: monospace; }
            .warning { font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px; }
            .footer { border-top: 1px solid #1f2937; margin-top: 32px; padding-top: 16px; font-size: 12px; color: #4b5563; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand">D.WORLD CAMPUS SCHEDULING</div>
            <div class="title">Password Reset Verification</div>
            <p class="text">Hello ${name || 'Student/Specialist'},<br>We received a request to reset your D.World password. Enter the 6-digit verification code below to proceed.</p>
            <div class="otp-box">
                <p class="otp-code">${otp}</p>
            </div>
            <p class="text">This code expires in <strong>10 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
            <p class="warning">⚠️ Never share this code with anyone. D.World staff will never ask for your verification code.</p>
            <div class="footer">
                &copy; ${new Date().getFullYear()} D.WORLD Lead City University. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendTransactionalEmail({
        toEmail: email,
        toName: name,
        subject: `${otp} is your D.WORLD Password Reset Code`,
        htmlContent
    });
};

/**
 * Send 6-Digit Registration / Email Verification OTP
 */
const sendRegistrationOtpEmail = async (email, name, otp) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
            .container { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .brand { color: #10b981; font-size: 20px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
            .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #10b981; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; margin-bottom: 16px; }
            .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-align: center; }
            .text { font-size: 15px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; text-align: center; }
            .otp-box { background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.2) 100%); border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 40px; font-weight: 900; color: #34d399; letter-spacing: 10px; margin: 0; font-family: monospace; }
            .warning { font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px; }
            .footer { border-top: 1px solid #1f2937; margin-top: 32px; padding-top: 16px; font-size: 12px; color: #4b5563; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div style="text-align: center;">
                <div class="brand">D.WORLD LEAD CITY UNIVERSITY</div>
                <div class="badge">Account Verification</div>
            </div>
            <div class="title">Verify Your Email Address</div>
            <p class="text">Hi ${name || 'there'} 👋<br>Welcome to D.World! Enter the 6-digit confirmation code below to verify your email and complete your account setup.</p>
            <div class="otp-box">
                <p class="otp-code">${otp}</p>
            </div>
            <p class="text">This code will expire in <strong>10 minutes</strong>. If you did not create a D.World account, please disregard this email.</p>
            <p class="warning">⚠️ Never share your verification code with anyone. D.World staff will never request it.</p>
            <div class="footer">
                &copy; ${new Date().getFullYear()} D.WORLD Lead City University. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendTransactionalEmail({
        toEmail: email,
        toName: name,
        subject: `${otp} — Verify your D.WORLD account`,
        htmlContent
    });
};

module.exports = {
    sendTransactionalEmail,
    sendPasswordResetEmail,
    sendRegistrationOtpEmail
};
