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

function normalizeBrevoConfig() {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  const from = String(process.env.MAIL_FROM || '').trim();
  const endpoint = String(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email').trim();

  return { apiKey, from, endpoint };
}

function maskSecret(value = '') {
  const text = String(value || '');
  if (!text) return null;
  if (text.length <= 4) return '****';
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function resolveMailProvider() {
  const preferred = String(process.env.MAIL_PROVIDER || '').trim().toLowerCase();
  const brevo = normalizeBrevoConfig();
  const smtp = normalizeSmtpConfig();

  if (preferred === 'brevo') return 'brevo';
  if (preferred === 'smtp') return 'smtp';
  if (brevo.apiKey) return 'brevo';
  if (smtp.host && Number.isFinite(smtp.port) && smtp.user && smtp.pass) return 'smtp';
  return '';
}

function isSmtpConfigured() {
  const config = normalizeSmtpConfig();
  return Boolean(config.host && Number.isFinite(config.port) && config.user && config.pass && config.from);
}

function isBrevoConfigured() {
  const config = normalizeBrevoConfig();
  return Boolean(config.apiKey && config.from);
}

function isMailConfigured() {
  const provider = resolveMailProvider();
  if (provider === 'brevo') return isBrevoConfigured();
  if (provider === 'smtp') return isSmtpConfigured();
  return false;
}

function getMailDebugInfo() {
  const provider = resolveMailProvider();
  const smtp = normalizeSmtpConfig();
  const brevo = normalizeBrevoConfig();

  return {
    configured: isMailConfigured(),
    provider: provider || null,
    smtp: {
      host: smtp.host || null,
      port: Number.isFinite(smtp.port) ? smtp.port : null,
      secure: smtp.secure,
      user: smtp.user || null,
      from: smtp.from || null,
      passMasked: maskSecret(smtp.pass)
    },
    brevo: {
      endpoint: brevo.endpoint || null,
      from: brevo.from || null,
      apiKeyMasked: maskSecret(brevo.apiKey)
    }
  };
}

function getTransporter() {
  if (!isSmtpConfigured()) {
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

async function sendViaSmtp(options) {
  const transporter = getTransporter();
  return transporter.sendMail(options);
}

async function sendViaBrevo(options) {
  const config = normalizeBrevoConfig();
  if (!isBrevoConfigured()) {
    throw new Error('Thiếu cấu hình Brevo để gửi email.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': config.apiKey
      },
      body: JSON.stringify({
        sender: parseMailbox(options.from || config.from),
        to: normalizeRecipients(options.to),
        subject: String(options.subject || '').trim(),
        htmlContent: String(options.html || '').trim() || undefined,
        textContent: String(options.text || '').trim() || undefined,
        replyTo: parseOptionalMailbox(options.replyTo)
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || payload?.code || `Brevo request failed (${response.status})`);
    }

    return {
      messageId: payload?.messageId || payload?.messageIds?.[0] || null,
      provider: 'brevo',
      raw: payload
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Brevo request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeRecipients(input) {
  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parseMailbox);
}

function parseOptionalMailbox(value) {
  const text = String(value || '').trim();
  return text ? parseMailbox(text) : undefined;
}

function parseMailbox(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return {
      email: text
    };
  }

  return {
    name: String(match[1] || '').replace(/^"|"$/g, '').trim() || undefined,
    email: String(match[2] || '').trim()
  };
}

async function sendMail(options) {
  const provider = resolveMailProvider();

  if (provider === 'brevo') {
    return sendViaBrevo(options);
  }

  if (provider === 'smtp') {
    return sendViaSmtp(options);
  }

  throw new Error('Thiếu cấu hình mail provider.');
}

module.exports = {
  isMailConfigured,
  sendMail,
  getMailDebugInfo
};
