const nodemailer = require('nodemailer');

let cachedTransporter = null;

function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM
  );
}

function getTransporter() {
  if (!isMailConfigured()) {
    throw new Error('Thiếu cấu hình SMTP để gửi email.');
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || '').trim() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
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
