import nodemailer from 'nodemailer';

let transporter = null;
let etherealAccount = null;

export async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (host && user && pass && pass !== 'your_password' && user !== 'your_email@gmail.com') {
    const transportConfig = host.includes('gmail')
      ? {
          service: 'gmail',
          auth: { user, pass }
        }
      : {
          host,
          port,
          secure: port === 465,
          auth: { user, pass }
        };

    transporter = nodemailer.createTransport(transportConfig);
    console.log(`[Mailer] Configured SMTP via ${host} (${user})`);
  } else {
    try {
      etherealAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        }
      });
      console.log(`[Mailer] Running with Ethereal test account (${etherealAccount.user}).`);
    } catch (err) {
      console.warn('[Mailer] Falling back to direct JSON transport:', err.message);
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  return transporter;
}

function wrapTemplate({ title, preheader, bodyHtml }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #0E0F12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F5F3EF; }
      .container { max-width: 520px; margin: 36px auto; background-color: #151619; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
      .header { padding: 32px 32px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: center; }
      .brand { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #F5F3EF; text-decoration: none; }
      .brand-dot { color: #F2BD91; }
      .tagline { font-size: 11px; color: #A5A5A5; margin-top: 4px; letter-spacing: 0.5px; }
      .content { padding: 32px; }
      .title { font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #F5F3EF; }
      .text { font-size: 14px; line-height: 1.6; color: #B5B3AE; margin: 0 0 20px; }
      .otp-box { background: rgba(242, 189, 145, 0.08); border: 1px solid rgba(242, 189, 145, 0.3); border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; }
      .otp-code { font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #F2BD91; margin: 0; }
      .otp-hint { font-size: 11px; color: #F2BD91; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
      .footer { padding: 24px 32px; background-color: #101113; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #7E7F85; text-align: center; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div style="display:none;max-height:0;overflow:hidden">${preheader || title}</div>
    <div class="container">
      <div class="header">
        <div class="brand">KEEPER<span class="brand-dot">.</span></div>
        <div class="tagline">Personal Purchase, Warranty &amp; Subscription Vault</div>
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Keeper Vault. If you did not request this security code, please ignore this email.
      </div>
    </div>
  </body>
  </html>
  `;
}

// Send Email Verification OTP
export async function sendVerificationOtp(email, name, otp) {
  const mailer = await getTransporter();
  const from = process.env.EMAIL_FROM || '"Keeper Vault" <notifications@keeper.app>';
  const replyTo = process.env.REPLY_TO || undefined;

  const html = wrapTemplate({
    title: 'Your Keeper Verification Code',
    preheader: `Your verification code is ${otp}. Valid for 15 minutes.`,
    bodyHtml: `
      <h2 class="title">Verify your email address</h2>
      <p class="text">Hi <strong>${name || 'there'}</strong>,</p>
      <p class="text">Welcome to Keeper! Enter the 6-digit verification code below to confirm your email and activate your personal vault:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-hint">Expires in 15 minutes</div>
      </div>
      <p class="text" style="font-size:12px;color:#7E7F85;margin-bottom:0">Do not share this code with anyone. Keeper staff will never ask for your code.</p>
    `
  });

  const info = await mailer.sendMail({
    from,
    to: email,
    replyTo,
    subject: `${otp} is your Keeper verification code`,
    html
  });

  let previewUrl = null;
  if (etherealAccount) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Mailer Preview] ${previewUrl}`);
  }

  return { success: true, messageId: info.messageId, previewUrl };
}

// Send Password Reset OTP
export async function sendPasswordResetOtp(email, name, otp) {
  const mailer = await getTransporter();
  const from = process.env.EMAIL_FROM || '"Keeper Security" <security@keeper.app>';
  const replyTo = process.env.REPLY_TO || undefined;

  const html = wrapTemplate({
    title: 'Reset your Keeper Vault Password',
    preheader: `Your password reset code is ${otp}.`,
    bodyHtml: `
      <h2 class="title">Password Reset Request</h2>
      <p class="text">Hi <strong>${name || 'there'}</strong>,</p>
      <p class="text">We received a request to reset your password. Use the code below to set a new password:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-hint">Valid for 15 minutes</div>
      </div>
      <p class="text" style="font-size:12px;color:#7E7F85;margin-bottom:0">If you didn't make this request, you can safely ignore this email; your vault remains protected.</p>
    `
  });

  const info = await mailer.sendMail({
    from,
    to: email,
    replyTo,
    subject: `${otp} is your Keeper password reset code`,
    html
  });

  return { success: true, messageId: info.messageId };
}

// Send Welcome Email
export async function sendWelcomeEmail(email, name) {
  try {
    const mailer = await getTransporter();
    const from = process.env.EMAIL_FROM || '"Keeper Vault" <welcome@keeper.app>';
    const html = wrapTemplate({
      title: 'Welcome to Keeper!',
      preheader: 'Your personal purchase & subscription vault is now ready.',
      bodyHtml: `
        <h2 class="title">Welcome to Keeper, ${name}!</h2>
        <p class="text">Your account is verified and your vault is ready. You can now:</p>
        <ul style="color:#B5B3AE;font-size:14px;line-height:1.8;padding-left:20px;margin-bottom:24px">
          <li>Track every product purchase, warranty expiry, and return deadline</li>
          <li>Manage telecom &amp; mobile recharge plans (Jio, Airtel, Vi) with auto-pay reminders</li>
          <li>Store and search digital invoices and receipts safely</li>
        </ul>
        <p class="text">Everything you own. One place.</p>
      `
    });

    await mailer.sendMail({
      from,
      to: email,
      subject: `Welcome to Keeper, ${name}!`,
      html
    });
  } catch (err) {
    console.warn('[Mailer] Welcome email notice:', err.message);
  }
}
