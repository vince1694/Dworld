/**
 * Brevo (Sendinblue) Transactional Email Utility
 * Uses native Node fetch to call Brevo's v3 REST API.
 * 
 * Required Environment Variables in .env:
 * - BREVO_API_KEY: Your Brevo API key (from Brevo Dashboard > SMTP & API > API Keys)
 * - BREVO_SENDER_EMAIL: A verified sender email in your Brevo account
 * - BREVO_SENDER_NAME: (Optional) Sender display name (defaults to "D.WORLD Scheduling")
 */

const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent }) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || 'noreply@dworld.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'D.WORLD Premium Scheduling';

    if (!apiKey) {
        console.warn(`[BREVO NOTICE] BREVO_API_KEY is not configured in .env. Mock email for ${toEmail}:`);
        console.log(`[Subject]: ${subject}`);
        console.log(`[Preview]: Content sent successfully (Mock mode)`);
        return { success: true, mocked: true };
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: senderName,
                    email: senderEmail
                },
                to: [
                    {
                        email: toEmail,
                        name: toName || toEmail.split('@')[0]
                    }
                ],
                subject: subject,
                htmlContent: htmlContent
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[BREVO ERROR]:', data);
            throw new Error(data.message || 'Failed to send email via Brevo');
        }

        console.log(`[BREVO SUCCESS] Email sent to ${toEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };
    } catch (error) {
        console.error('[BREVO EXCEPTION]:', error.message);
        throw error;
    }
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
            .brand { color: #f59e0b; font-size: 20px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
            .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-align: center; }
            .text { font-size: 15px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; text-align: center; }
            .otp-box { background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.2) 100%); border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 800; color: #fbbf24; letter-spacing: 8px; margin: 0; }
            .warning { font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px; }
            .footer { border-top: 1px solid #1f2937; margin-top: 32px; padding-top: 16px; font-size: 12px; color: #4b5563; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand">D.WORLD SCHEDULING</div>
            <div class="title">Password Reset Verification</div>
            <p class="text">Hello ${name || 'Valued User'},<br>We received a request to reset your password. Use the verification code below to complete your reset request.</p>
            <div class="otp-box">
                <p class="otp-code">${otp}</p>
            </div>
            <p class="text">This code will expire in <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
            <p class="warning">⚠️ Never share this code with anyone. Our staff will never ask for your verification code.</p>
            <div class="footer">
                &copy; ${new Date().getFullYear()} D.WORLD Campus Scheduling Platform. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        return await sendBrevoEmail({
            toEmail: email,
            toName: name,
            subject: `${otp} is your D.WORLD Password Reset Code`,
            htmlContent
        });
    } catch (err) {
        console.warn(`[DEV/FALLBACK OTP] If Brevo is pending account activation, use this OTP code for ${email}: ${otp}`);
        throw err;
    }
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
            .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-align: center; }
            .text { font-size: 15px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; text-align: center; }
            .otp-box { background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.2) 100%); border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 40px; font-weight: 900; color: #34d399; letter-spacing: 10px; margin: 0; font-variant-numeric: tabular-nums; }
            .warning { font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px; }
            .footer { border-top: 1px solid #1f2937; margin-top: 32px; padding-top: 16px; font-size: 12px; color: #4b5563; text-align: center; }
            .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #10b981; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; margin-bottom: 16px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand">D.WORLD SCHEDULING</div>
            <div class="badge">Email Verification</div>
            <div class="title">Verify Your Account</div>
            <p class="text">Hi ${name || 'there'} 👋<br>Welcome to D.World! Enter the code below to verify your email address and activate your account.</p>
            <div class="otp-box">
                <p class="otp-code">${otp}</p>
            </div>
            <p class="text">This code expires in <strong>10 minutes</strong>. If you didn't create a D.World account, simply ignore this email.</p>
            <p class="warning">⚠️ Never share this code with anyone. Our staff will never ask for your verification code.</p>
            <div class="footer">
                &copy; ${new Date().getFullYear()} D.WORLD Campus Scheduling Platform. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        return await sendBrevoEmail({
            toEmail: email,
            toName: name,
            subject: `${otp} — Verify your D.WORLD account`,
            htmlContent
        });
    } catch (err) {
        console.warn(`[DEV/FALLBACK OTP] Registration OTP for ${email}: ${otp}`);
        throw err;
    }
};

module.exports = {
    sendBrevoEmail,
    sendPasswordResetEmail,
    sendRegistrationOtpEmail
};
