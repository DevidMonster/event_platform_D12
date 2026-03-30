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

function maskSecret(value = '') {
  const text = String(value || '');
  if (!text) return null;
  if (text.length <= 4) return '****';
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function getMailDebugInfo() {
  const config = normalizeSmtpConfig();
  return {
    configured: isMailConfigured(),
    host: config.host || null,
    port: Number.isFinite(config.port) ? config.port : null,
    secure: config.secure,
    user: config.user || null,
    from: config.from || null,
    passRaw: config.pass || null,
    passMasked: maskSecret(config.pass)
  };
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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
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
  sendMail,
  getMailDebugInfo
};
