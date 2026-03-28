'use client';

import { useEffect, useMemo, useState } from 'react';
import GreetingCardPreview from '../cards/GreetingCardPreview';
import { useGreetingApp } from '../../context/GreetingAppContext';

function getInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function CardSendModal({ open, onClose, onSent, draft }) {
  const { sendCard, recipientOptions, directoryLoading, directoryMessage, generateAiMessage, mailEnabled } =
    useGreetingApp();
  const [form, setForm] = useState({
    recipientName: '',
    recipientEmail: '',
    manualMessage: '',
    aiMessage: '',
    tone: 'ngot_ngao',
    aiPrompt: ''
  });
  const [recipientQuery, setRecipientQuery] = useState('');
  const [messageMode, setMessageMode] = useState('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    if (!open || !draft) return;
    setForm({
      recipientName: '',
      recipientEmail: '',
      manualMessage: draft.message || '',
      aiMessage: '',
      tone: draft.tone || 'ngot_ngao',
      aiPrompt: ''
    });
    setRecipientQuery('');
    setMessageMode('manual');
    setAiPrompt('');
    setStatusMessage('');
    setAiLoading(false);
    setSendLoading(false);
  }, [open, draft]);

  const filteredRecipients = useMemo(() => {
    const normalizedQuery = String(recipientQuery || '')
      .trim()
      .toLowerCase();

    if (!normalizedQuery) return recipientOptions;

    return recipientOptions
      .filter((person) => {
        const haystack = [person.authorName, person.userEmail].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      });
  }, [recipientOptions, recipientQuery]);

  if (!open || !draft?.template) return null;

  const activeMessage = messageMode === 'ai' ? form.aiMessage : form.manualMessage;

  const previewCard = {
    id: 'preview',
    recipientName: form.recipientName || 'Người nhận',
    recipientEmail: form.recipientEmail || '',
    message: activeMessage || 'Nội dung lời chúc sẽ hiển thị tại đây.',
    templateId: draft.template.id,
    imageUrl: draft.template.imageUrl,
    templateAccent: draft.template.accent,
    templateSurface: draft.template.surface,
    templateTitle: draft.template.title,
    templateCategory: draft.template.category,
    createdAt: new Date().toISOString()
  };

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyRecipient(person) {
    updateField('recipientName', person.authorName || '');
    updateField('recipientEmail', person.userEmail || '');
    setRecipientQuery(person.authorName || person.userEmail || '');
  }

  async function handleAiWrite() {
    if (!aiPrompt.trim()) {
      setStatusMessage('Nhập mô tả nội dung trước khi nhờ AI viết.');
      return;
    }

    setAiLoading(true);
    setStatusMessage('');

    try {
      const suggestion = await generateAiMessage({
        messagePrompt: aiPrompt,
        templateTitle: draft.template.title,
        templateCategory: draft.template.category
      });

      updateField('aiMessage', suggestion.message || '');
      updateField('tone', suggestion.tone || 'ngot_ngao');
      updateField('aiPrompt', aiPrompt);
      setMessageMode('ai');
      setStatusMessage('AI đã viết xong nội dung. Bạn có thể sửa lại trước khi gửi.');
    } catch (error) {
      setStatusMessage(error.message || 'AI chưa viết được nội dung lúc này.');
    } finally {
      setAiLoading(false);
    }
  }

  async function submitForm(event) {
    event.preventDefault();
    const finalMessage = String(activeMessage || '').trim();
    if (!finalMessage) return;

    setSendLoading(true);
    setStatusMessage('');

    try {
      const nextCard = await sendCard({
        recipientName: form.recipientName,
        recipientEmail: form.recipientEmail,
        message: finalMessage,
        tone: form.tone,
        aiPrompt: messageMode === 'ai' ? aiPrompt : '',
        templateId: draft.template.id
      });
      onSent?.(nextCard);
    } catch (error) {
      setStatusMessage(error.message || 'Chưa gửi được thiệp lúc này.');
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <div className="composer-backdrop" onClick={onClose}>
      <section className="composer-modal" onClick={(event) => event.stopPropagation()}>
        <div className="composer-head">
          <div>
            <p className="composer-kicker">Mẫu thiệp có sẵn</p>
            <h2>{draft.template.title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="composer-grid">
          <div className="composer-preview">
            <GreetingCardPreview card={previewCard} hideSender />
          </div>

          <form className="composer-form" onSubmit={submitForm}>
            <div className="draft-note">
              <p className="composer-note">
                Chọn cách nhập nội dung trong hai tab bên dưới. Khi gửi, hệ thống sẽ lấy đúng nội dung theo tab đang
                bật.
              </p>
            </div>

            <div className="composer-tabs" role="tablist" aria-label="Chọn cách nhập nội dung">
              <button
                type="button"
                className={messageMode === 'manual' ? 'composer-tab active' : 'composer-tab'}
                onClick={() => setMessageMode('manual')}
              >
                Viết tay
              </button>
              <button
                type="button"
                className={messageMode === 'ai' ? 'composer-tab active' : 'composer-tab'}
                onClick={() => setMessageMode('ai')}
              >
                AI viết hộ
              </button>
            </div>

            {messageMode === 'manual' ? (
              <div className="draft-note composer-mode-panel">
                <label>
                  Nội dung viết tay
                  <textarea
                    value={form.manualMessage}
                    onChange={(event) => updateField('manualMessage', event.target.value)}
                    placeholder="Nhập lời chúc của bạn..."
                    maxLength={420}
                    required={messageMode === 'manual'}
                  />
                </label>
              </div>
            ) : (
              <div className="draft-note composer-mode-panel">
                <label>
                  Mô tả để AI viết nội dung
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="Ví dụ: lời chúc tri ân dành cho đồng nghiệp, lịch sự, ấm áp, dài hơn bình thường"
                    maxLength={260}
                  />
                </label>
                <div className="composer-inline-actions">
                  <button type="button" className="btn btn-ghost" onClick={handleAiWrite} disabled={aiLoading}>
                    {aiLoading ? 'AI đang viết...' : 'AI viết hộ'}
                  </button>
                  <p className="composer-note">AI chỉ viết nội dung. Hình thiệp vẫn giữ theo mẫu bạn đã chọn.</p>
                </div>
                <label>
                  Nội dung AI đã tạo
                  <textarea
                    value={form.aiMessage}
                    onChange={(event) => updateField('aiMessage', event.target.value)}
                    placeholder="AI sẽ viết nội dung ở đây..."
                    maxLength={420}
                    required={messageMode === 'ai'}
                  />
                </label>
              </div>
            )}

            {statusMessage ? <p className="composer-ai-status">{statusMessage}</p> : null}

            <label>
              Tìm nhanh người nhận
              <input
                value={recipientQuery}
                onChange={(event) => setRecipientQuery(event.target.value)}
                placeholder="Gõ tên hoặc email để chọn nhanh"
              />
            </label>

            <div className="recipient-picker">
              <div className="recipient-picker-head">
                <span>Danh sách người đã đăng nhập</span>
                {directoryLoading ? <span>Đang tải...</span> : <span>{recipientOptions.length} người</span>}
              </div>

              {directoryMessage ? <p className="recipient-picker-message">{directoryMessage}</p> : null}

              <div className="recipient-list">
                {filteredRecipients.length ? (
                  filteredRecipients.map((person) => {
                    const isActive =
                      String(form.recipientEmail || '').trim().toLowerCase() ===
                      String(person.userEmail || '').trim().toLowerCase();

                    return (
                      <button
                        key={person.userEmail}
                        type="button"
                        className={isActive ? 'recipient-option active' : 'recipient-option'}
                        onClick={() => applyRecipient(person)}
                      >
                        {person.avatarUrl ? (
                          <img src={person.avatarUrl} alt={person.authorName} className="recipient-avatar" />
                        ) : (
                          <div className="recipient-avatar fallback">{getInitials(person.authorName || 'U')}</div>
                        )}
                        <span className="recipient-meta">
                          <strong>{person.authorName}</strong>
                          <small>{person.userEmail}</small>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="recipient-picker-message">Chưa có kết quả khớp với từ khóa bạn nhập.</p>
                )}
              </div>
            </div>

            <label>
              Người nhận
              <input
                value={form.recipientName}
                onChange={(event) => updateField('recipientName', event.target.value)}
                placeholder="Ví dụ: Chị Thu Hà"
                required
              />
            </label>

            <label>
              Email người nhận
              <input
                type="email"
                value={form.recipientEmail}
                onChange={(event) => updateField('recipientEmail', event.target.value)}
                placeholder="name@company.com"
                required
              />
            </label>

            <div className="composer-actions">
              <p className="composer-note">
                {mailEnabled
                  ? 'Thiệp sẽ được lưu và gửi qua email ngay sau khi bạn xác nhận.'
                  : 'Thiệp sẽ được lưu trước. Muốn gửi email thật, backend cần thêm cấu hình SMTP.'}
              </p>
              <button type="submit" className="btn" disabled={!activeMessage.trim() || sendLoading}>
                {sendLoading ? 'Đang gửi...' : 'Gửi thiệp'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
