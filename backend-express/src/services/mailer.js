const nodemailer = require('nodemailer');

let cachedTransporter = null;

function normalizeSmtpConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT);
  const secure = String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true';
  const user = String(process.env.SMTP_USER || '').trim();
  const rawPass = String(process.env.SMTP_PASS || '').trim();
  const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
  const from = String(process.env.MAIL_FROM || '').trim();

  return { host, port, secure, user, pass, from };
}

function isMailConfigured() {
  const config = normalizeSmtpConfig();
  return Boolean(
    config.host && Number.isFinite(config.port) && config.user && config.pass && config.from
  );
}

function getTransporter() {
  if (!isMailConfigured()) {
    throw new Error('Thiếu cấu hình SMTP để gửi email.');
  }

  if (!cachedTransporter) {
    const config = normalizeSmtpConfig();
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  return cachedTransporter;
}

async function sendMail(options) {
  const transporter = getTransporter();
  return transporter.sendMail(options);
}

module.exports = {
  isMailConfigured,
  sendMail
};
