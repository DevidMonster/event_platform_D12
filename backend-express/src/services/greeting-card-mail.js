function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMessage(message) {
  return escapeHtml(message).replace(/\n/g, '<br />');
}

function buildGreetingCardEmail(card = {}) {
  const recipientName = escapeHtml(card.recipientName || 'bạn');
  const message = formatMessage(card.message || '');
  const imageUrl = escapeHtml(card.imageUrl || '');
  const templateTitle = escapeHtml(card.templateTitle || 'Thiệp mời');
  const templateCategory = escapeHtml(card.templateCategory || 'D12 Greeting Cards');
  const accent = escapeHtml(card.templateAccent || '#d95f8d');
  const createdDate = new Date(card.createdAt || Date.now()).toLocaleDateString('vi-VN');
  const senderBrand = escapeHtml(process.env.MAIL_BRAND_NAME || 'D12 Greeting Cards');

  const subject = `Bạn vừa nhận được một tấm thiệp từ ${senderBrand}`;
  const text = [
    `Bạn vừa nhận được một tấm thiệp từ ${senderBrand}.`,
    `Người nhận: ${card.recipientName || 'Bạn'}`,
    `Ngày gửi: ${createdDate}`,
    '',
    String(card.message || '').trim()
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff7f8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#341b25;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(183,79,120,0.16);">
            <tr>
              <td style="padding:24px 28px 12px;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${accent};font-weight:700;">${templateCategory}</div>
                <h1 style="margin:10px 0 8px;font-size:30px;line-height:1.2;color:#2e1822;">Bạn có một tấm thiệp mới</h1>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#7f6170;">
                  ${senderBrand} vừa gửi đến bạn một lời chúc ẩn danh. Mở email này ra là đã xem được nội dung ngay.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0;">
                <div style="border-radius:24px;overflow:hidden;background:#f6eef1;">
                  <img src="${imageUrl}" alt="${templateTitle}" width="584" style="display:block;width:100%;height:auto;border:0;" />
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 10px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;">
                  <tr>
                    <td style="background:rgba(255,243,247,0.95);border:1px solid rgba(217,95,141,0.18);border-radius:24px;padding:22px 24px;">
                      <div style="font-size:14px;color:${accent};font-weight:700;margin-bottom:10px;">Gửi đến ${recipientName}</div>
                      <div style="font-size:17px;line-height:1.9;color:#351d27;">${message}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:13px;color:#8b6b78;">Ngày gửi: ${createdDate}</td>
                    <td align="right" style="font-size:13px;color:#8b6b78;">${templateTitle}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

module.exports = { buildGreetingCardEmail };
