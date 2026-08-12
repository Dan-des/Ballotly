import { Resend } from 'resend';
import nodemailer from 'nodemailer';

let cachedNodemailerTransporter = null;

/**
 * Singleton factory for Nodemailer Gmail SMTP transporter.
 * pool: false prevents connection reuse drops (ECONNRESET).
 */
function getNodemailerTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  if (cachedNodemailerTransporter) {
    return cachedNodemailerTransporter;
  }

  cachedNodemailerTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    pool: false,
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000,
  });

  return cachedNodemailerTransporter;
}

/**
 * Startup diagnostic verification to log email provider status to console.
 */
export function verifyTransporter() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpUser = process.env.SMTP_USER;

  if (resendApiKey) {
    console.log('✅ [Ballotly Mailer] Resend API engine initialized.');
  }
  if (smtpUser) {
    console.log('✅ [Ballotly Mailer] Gmail SMTP fallback engine initialized.');
  }
  if (!resendApiKey && !smtpUser) {
    console.log('⚠️  [Ballotly Mailer] No email credentials found in server/.env.');
  }
}

/**
 * Smart Dual-Engine Mail Dispatcher.
 * Tries Resend API first (fast & inbox-guaranteed for owner email/verified domain).
 * Automatically falls back to Gmail SMTP (Nodemailer) for external user recipients
 * when Resend free-tier domain restriction (403) occurs.
 */
async function sendMailUnified({ to, subject, html, text, replyTo }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpUser = process.env.SMTP_USER;

  // 1. Primary: Attempt Resend API
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const resendFrom = process.env.RESEND_FROM_EMAIL || 'Josh from Ballotly <onboarding@resend.dev>';
      const payload = {
        from: resendFrom,
        to: [to],
        subject,
        html,
        text,
      };
      if (replyTo || process.env.RESEND_REPLY_TO || smtpUser) {
        payload.reply_to = replyTo || process.env.RESEND_REPLY_TO || smtpUser;
      }

      const { data, error } = await resend.emails.send(payload);

      if (!error && data?.id) {
        console.log(`✉️  [Ballotly Mailer] Dispatched via Resend to ${to} (ID: ${data.id})`);
        return { success: true, provider: 'resend', id: data.id };
      }

      console.warn(`⚠️  [Ballotly Mailer] Resend notice for ${to}: ${error?.message || 'Send rejected'}`);
    } catch (resendErr) {
      console.warn(`⚠️  [Ballotly Mailer] Resend exception for ${to}: ${resendErr.message}`);
    }
  }

  // 2. Fallback: Gmail SMTP via Nodemailer
  const nodemailerTransporter = getNodemailerTransporter();
  if (nodemailerTransporter) {
    try {
      console.log(`🔄 [Ballotly Mailer] Using Gmail SMTP fallback for ${to}...`);
      const fromHeader = process.env.FROM_EMAIL || `"Josh from Ballotly" <${smtpUser}>`;
      const mailOptions = {
        from: fromHeader,
        to,
        subject,
        html,
        text,
        replyTo: replyTo || smtpUser,
        headers: {
          'X-Mailer': 'Ballotly Platform v2.0',
          'Auto-Submitted': 'no',
        },
      };

      const info = await nodemailerTransporter.sendMail(mailOptions);
      console.log(`✉️  [Ballotly Mailer] Dispatched via Gmail SMTP to ${to} (Message ID: ${info.messageId})`);
      return { success: true, provider: 'nodemailer', id: info.messageId };
    } catch (smtpErr) {
      console.error(`❌ [Ballotly Mailer] Gmail SMTP delivery failed for ${to}:`, smtpErr.message);
      cachedNodemailerTransporter = null; // Clear cached transport on failure
      return { success: false, error: smtpErr.message };
    }
  }

  return { success: false, error: 'No email providers available.' };
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ email, name }) {
  const rawName = name ? name.trim() : 'there';
  const firstName = rawName.split(' ')[0];
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const loginLink = `${clientUrl}/login`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Ballotly</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f4ff; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f0f4ff; padding: 40px 16px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 44px 48px; border: 1px solid #e0e7ff; box-shadow: 0 12px 40px -8px rgba(79, 70, 229, 0.08); }
        .brand-row { display: flex; align-items: center; margin-bottom: 32px; gap: 10px; }
        .brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; }
        .brand-name { font-size: 18px; font-weight: 800; color: #4f46e5; letter-spacing: -0.02em; }
        .divider { height: 1px; background: linear-gradient(90deg, #e0e7ff 0%, #f0f4ff 100%); margin: 0 0 32px 0; }
        .greeting { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.03em; line-height: 1.2; }
        .subtext { font-size: 16px; color: #64748b; margin-bottom: 28px; line-height: 1.55; }
        .body-text { font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px; }
        .feature-card { background: linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 100%); border: 1px solid #e0e7ff; border-radius: 16px; padding: 24px 28px; margin: 0 0 32px 0; }
        .feature-title { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
        .feature-list { margin: 0; padding-left: 0; list-style: none; color: #475569; font-size: 14px; }
        .feature-list li { margin-bottom: 12px; line-height: 1.55; display: flex; align-items: flex-start; gap: 10px; }
        .feature-list li::before { content: "→"; color: #6366f1; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
        .cta-box { margin: 0 0 36px 0; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 16px 32px; border-radius: 12px; letter-spacing: 0.01em; }
        .signoff { margin-top: 36px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b; line-height: 1.7; }
        .signoff strong { color: #0f172a; font-weight: 700; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 28px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="brand-row">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="brand-name">Ballotly</span>
          </div>
          <div class="divider"></div>
          <h1 class="greeting">Hi ${firstName}, you're in! 🎉</h1>
          <p class="subtext">Your Ballotly account is now active and ready to go.</p>
          <div class="body-text">
            You've successfully created an administrator account on <strong>Ballotly</strong> — the smart platform for running professional elections, polls, and governance votes at any scale.
          </div>
          <div class="feature-card">
            <div class="feature-title">What you can do right now</div>
            <ul class="feature-list">
              <li><strong>Create &amp; launch elections</strong> with live countdown timers and custom ballot options</li>
              <li><strong>Enforce voter verification</strong> via Email, Phone, Student ID, or Voter ID</li>
              <li><strong>Control result visibility</strong> — keep results private or publish them live</li>
              <li><strong>Download audit reports</strong> with fully anonymized, print-ready vote records</li>
            </ul>
          </div>
          <div class="cta-box">
            <a href="${loginLink}" class="cta-btn">Go to my Dashboard →</a>
          </div>
          <div class="signoff">
            Cheers,<br>
            <strong>Josh &amp; the Ballotly Team</strong>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Ballotly. All rights reserved.</p>
          <p>You received this because you just created a Ballotly account.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMailUnified({
    to: email,
    subject: `Welcome to Ballotly, ${firstName}! Your account is ready`,
    html,
    text: `Hi ${firstName},\n\nWelcome to Ballotly! Your account has been created successfully.\n\nYou can now log in and start creating elections, polls, and governance votes at any scale.\n\nLog in here: ${loginLink}\n\nCheers,\nJosh & the Ballotly Team`,
  });
}

// ─── OTP Email ────────────────────────────────────────────────────────────────

export async function sendOtpEmail({ email, name, otp }) {
  const rawName = name ? name.trim() : 'there';
  const firstName = rawName.split(' ')[0];

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Ballotly verification code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f4ff; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f0f4ff; padding: 40px 16px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 44px 48px; border: 1px solid #e0e7ff; box-shadow: 0 12px 40px -8px rgba(79, 70, 229, 0.08); }
        .brand-row { display: flex; align-items: center; margin-bottom: 32px; gap: 10px; }
        .brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; }
        .brand-name { font-size: 18px; font-weight: 800; color: #4f46e5; letter-spacing: -0.02em; }
        .divider { height: 1px; background: linear-gradient(90deg, #e0e7ff 0%, #f0f4ff 100%); margin: 0 0 32px 0; }
        .heading { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.03em; }
        .subtext { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 32px; }
        .otp-wrapper { background: linear-gradient(135deg, #f8f7ff 0%, #eef2ff 100%); border: 1px solid #c7d2fe; border-radius: 18px; padding: 28px; text-align: center; margin-bottom: 28px; }
        .otp-label { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }
        .otp-code { font-size: 48px; font-weight: 900; letter-spacing: 10px; color: #3730a3; font-variant-numeric: tabular-nums; line-height: 1; }
        .otp-expiry { font-size: 12px; color: #94a3b8; margin-top: 14px; }
        .otp-expiry strong { color: #64748b; }
        .body-text { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px; }
        .warning-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #9a3412; margin-bottom: 28px; }
        .signoff { margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b; line-height: 1.7; }
        .signoff strong { color: #0f172a; font-weight: 700; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="brand-row">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="brand-name">Ballotly</span>
          </div>
          <div class="divider"></div>
          <h1 class="heading">Verify your email 🔐</h1>
          <p class="subtext">Hi ${firstName}, use the code below to complete your Ballotly account setup. Do not share this code with anyone.</p>
          <div class="otp-wrapper">
            <div class="otp-label">Your one-time verification code</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">Expires in <strong>10 minutes</strong> &nbsp;·&nbsp; Single use only</div>
          </div>
          <p class="body-text">
            Enter this code on the Ballotly signup page to activate your account. If you didn't request this, you can safely ignore this email — no account will be created.
          </p>
          <div class="warning-box">
            ⚠️ <strong>Never share this code.</strong> Ballotly staff will never ask for your OTP.
          </div>
          <div class="signoff">
            Cheers,<br>
            <strong>Josh &amp; the Ballotly Team</strong>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Ballotly. All rights reserved.</p>
          <p>You received this because someone used your email to create a Ballotly account.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMailUnified({
    to: email,
    subject: `${otp} is your Ballotly verification code`,
    html,
    text: `Hi ${firstName},\n\nYour Ballotly verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you did not request this, ignore this email — no account will be created.\n\nCheers,\nJosh & the Ballotly Team`,
  });
}

// ─── Goodbye Email ────────────────────────────────────────────────────────────

export async function sendGoodbyeEmail({ email, name }) {
  const rawName = name ? name.trim() : 'there';
  const firstName = rawName.split(' ')[0];
  const supportEmail = process.env.RESEND_REPLY_TO || process.env.SMTP_USER || 'support@ballotly.com';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We'll miss you — Ballotly</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 16px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 44px 48px; border: 1px solid #e2e8f0; box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.06); }
        .brand-row { display: flex; align-items: center; margin-bottom: 32px; gap: 10px; }
        .brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; }
        .brand-name { font-size: 18px; font-weight: 800; color: #4f46e5; letter-spacing: -0.02em; }
        .divider { height: 1px; background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 100%); margin: 0 0 32px 0; }
        .emoji-row { font-size: 40px; margin-bottom: 16px; }
        .heading { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.03em; }
        .subtext { font-size: 15px; color: #64748b; line-height: 1.65; margin-bottom: 24px; }
        .body-text { font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 20px; }
        .info-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px 24px; margin-bottom: 28px; }
        .info-card p { font-size: 14px; color: #166534; margin: 0; line-height: 1.6; }
        .reply-card { background: linear-gradient(135deg, #f8f7ff 0%, #eef2ff 100%); border: 1px solid #c7d2fe; border-radius: 16px; padding: 24px 28px; margin-bottom: 28px; }
        .reply-label { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
        .reply-body { font-size: 14px; color: #475569; line-height: 1.65; }
        .reply-body a { color: #4f46e5; font-weight: 600; text-decoration: none; }
        .signoff { margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b; line-height: 1.7; }
        .signoff strong { color: #0f172a; font-weight: 700; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="brand-row">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="brand-name">Ballotly</span>
          </div>
          <div class="divider"></div>
          <div class="emoji-row">👋</div>
          <h1 class="heading">We're sad to see you go, ${firstName}</h1>
          <p class="subtext">Your Ballotly account has been permanently deleted. Everything — your polls, votes, and personal data — has been erased from our systems.</p>
          <div class="info-card">
            <p>✅ <strong>Account deletion confirmed.</strong> Your data has been fully removed and cannot be recovered. If you ever wish to return, you're always welcome to create a new account.</p>
          </div>
          <p class="body-text">
            We truly hope your experience with Ballotly was valuable. If there's something we could have done better, we'd genuinely love to hear it — your feedback helps us build something great for everyone.
          </p>
          <div class="reply-card">
            <div class="reply-label">Had a problem? Tell us.</div>
            <p class="reply-body">
              Simply <strong>reply directly to this email</strong> and your message will land in our inbox. Whether it was a bug, a missing feature, or anything else that led to this — we read every reply and take it seriously.<br><br>
              Alternatively, reach us at <a href="mailto:${supportEmail}">${supportEmail}</a>.
            </p>
          </div>
          <p class="body-text">Until then — take care, and we hope our paths cross again someday. 🙏</p>
          <div class="signoff">
            Warm regards,<br>
            <strong>Josh &amp; the Ballotly Team</strong>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Ballotly. All rights reserved.</p>
          <p>You received this because your account was just deleted from Ballotly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMailUnified({
    to: email,
    replyTo: supportEmail,
    subject: `Goodbye from Ballotly, ${firstName} — Account deleted`,
    html,
    text: `Hi ${firstName},\n\nYour Ballotly account has been permanently deleted. All your data has been removed.\n\nWe're sad to see you go. If you ran into a problem or have feedback, simply reply to this email — we read every message.\n\nYou can also reach us at: ${supportEmail}\n\nWarm regards,\nJosh & the Ballotly Team`,
  });
}
