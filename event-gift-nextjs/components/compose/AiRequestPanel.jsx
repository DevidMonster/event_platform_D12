'use client';

import { useState } from 'react';
import { cardTemplates } from '../../lib/card-templates';
import { useGreetingApp } from '../../context/GreetingAppContext';

const initialAiForm = {
  visualPrompt: '',
  messagePrompt: ''
};

export default function AiRequestPanel({ onDraftReady }) {
  const { generateAiDraft } = useGreetingApp();
  const [form, setForm] = useState(initialAiForm);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitAiRequest(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');

    try {
      const draft = await generateAiDraft({
        visualPrompt: form.visualPrompt,
        messagePrompt: form.messagePrompt
      });

      setStatus('AI đã tạo xong ảnh và lời chúc. Kiểm tra trong popup rồi nhập người nhận để gửi.');
      onDraftReady?.({
        mode: 'ai',
        template: draft.template || cardTemplates[0],
        aiPrompt: draft.aiPrompt || [form.visualPrompt, form.messagePrompt].filter(Boolean).join('. '),
        message: draft.message || '',
        tone: draft.tone || 'ngot_ngao'
      });
    } catch (error) {
      setStatus(error.message || 'AI chưa tạo được thiệp.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section-block ai-request-block">
      <div className="section-head">
        <div>
          <h2>Tạo thiệp bằng AI từ mô tả của bạn</h2>
        </div>
      </div>

      <form className="ai-request-form" onSubmit={submitAiRequest}>
        <label>
          Mô tả hình ảnh thiệp
          <textarea
            value={form.visualPrompt}
            onChange={(event) => updateField('visualPrompt', event.target.value)}
            placeholder="Ví dụ: bó hoa tulip trắng hồng, ánh sáng nhẹ, nền thanh lịch, cảm giác ấm áp"
            maxLength={260}
            required
          />
        </label>

        <label>
          Mô tả lời chúc mong muốn
          <textarea
            value={form.messagePrompt}
            onChange={(event) => updateField('messagePrompt', event.target.value)}
            placeholder="Ví dụ: lời chúc ấm áp, dịu dàng, đáng yêu để gửi tặng em, có nhắc đến cảm giác bình yên"
            maxLength={260}
            required
          />
        </label>

        <div className="composer-inline-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'AI đang xử lý...' : 'Gửi AI xử lý'}
          </button>
          <p className="composer-note">
            Ảnh sẽ bám theo mô tả hình ảnh bạn nhập, còn lời chúc sẽ được AI viết lại tự nhiên hơn thay vì lặp
            nguyên câu lệnh.
          </p>
        </div>

        {status ? <p className="composer-ai-status">{status}</p> : null}
      </form>
    </section>
  );
}
