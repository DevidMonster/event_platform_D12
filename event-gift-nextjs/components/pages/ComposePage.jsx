'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import AppShell from '../layout/AppShell';
import AuthGate from '../layout/AuthGate';
import CardSendModal from '../modals/CardSendModal';
import { useGreetingApp } from '../../context/GreetingAppContext';

function SideCompose() {
  return (
    <section className="side-card accent">
      <p className="side-kicker">Gửi thiệp</p>
      <h3>1. Chọn mẫu thiệp</h3>
      <p>Chọn một mẫu phù hợp với người nhận và cảm xúc bạn muốn gửi gắm.</p>
      <h3>2. Viết tay hoặc nhờ AI</h3>
      <p>Sau khi chọn thiệp, bạn có thể tự nhập nội dung hoặc mô tả để AI viết lời chúc giúp bạn.</p>
    </section>
  );
}

export default function ComposePage() {
  const router = useRouter();
  const { templates, cardsLoading, cardsMessage, mailEnabled } = useGreetingApp();
  const [draft, setDraft] = useState(null);

  function openTemplateFlow(template) {
    setDraft({
      template,
      message: '',
      tone: 'ngot_ngao',
      aiPrompt: ''
    });
  }

  function handleSent(card) {
    setDraft(null);
    const recipientName = card.recipientName || 'người nhận';
    const mailMessage =
      card?.mailStatus === 'sent'
        ? ` Email đã được gửi tới ${card.recipientEmail}.`
        : mailEnabled
          ? ' Email đang chờ xử lý hoặc gặp lỗi cấu hình.'
          : ' Backend chưa cấu hình SMTP nên chưa gửi email thật.';
    message.success({
      content: `Đã gửi thiệp thành công đến ${recipientName}.${mailMessage}`,
      duration: 4
    });
    router.push('/');
  }

  return (
    <AppShell title="DGC - D12 Greeting Cards" subtitle="Gửi thiệp đến những người bạn" sidePanel={<SideCompose />}>
      <AuthGate>
        <section className="section-block">
          <div className="section-head">
            <div>
              <p className="section-kicker">Chọn mẫu trước</p>
              <h2>Kho thiệp có sẵn</h2>
            </div>
          </div>

          {cardsMessage ? <p className="composer-ai-status">{cardsMessage}</p> : null}

          <section className="template-rail">
            {templates.map((template) => (
              <article key={template.id} className="template-card">
                <div
                  className="template-cover"
                  style={{ backgroundImage: `url(${template.imageUrl})`, borderColor: template.accent }}
                />
                <div className="template-copy">
                  <p>{template.category}</p>
                  <h3>{template.title}</h3>
                  <button className="btn" onClick={() => openTemplateFlow(template)}>
                    Chọn mẫu này
                  </button>
                </div>
              </article>
            ))}
          </section>

          {!templates.length && !cardsLoading ? (
            <article className="empty-card">
              <h3>Chưa có mẫu thiệp</h3>
              <p>Backend chưa có template nào đang hoạt động.</p>
            </article>
          ) : null}
        </section>

        <CardSendModal open={Boolean(draft)} draft={draft} onClose={() => setDraft(null)} onSent={handleSent} />
      </AuthGate>
    </AppShell>
  );
}
