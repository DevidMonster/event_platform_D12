const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const GEMINI_TEXT_MODEL = String(process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash').trim();

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeForMatch(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function getLengthInstruction(messagePrompt) {
  const normalized = normalizeForMatch(messagePrompt);

  if (
    normalized.includes('that dai') ||
    normalized.includes('rat dai') ||
    normalized.includes('chi tiet') ||
    normalized.includes('day du')
  ) {
    return {
      sentenceGuide: 'MESSAGE dài 5 đến 7 câu, tối đa 650 ký tự.',
      minLength: 220
    };
  }

  if (normalized.includes('dai')) {
    return {
      sentenceGuide: 'MESSAGE dài 4 đến 6 câu, tối đa 520 ký tự.',
      minLength: 180
    };
  }

  return {
    sentenceGuide: 'MESSAGE dài 3 đến 4 câu, tối đa 320 ký tự.',
    minLength: 100
  };
}

function buildWriterPrompt({ messagePrompt, templateTitle, templateCategory }) {
  const templateHint = [normalizeText(templateCategory), normalizeText(templateTitle)].filter(Boolean).join(' - ');
  const lengthInstruction = getLengthInstruction(messagePrompt);

  return [
    'Bạn là trợ lý viết lời chúc cho thiệp nội bộ D12.',
    'Viết bằng tiếng Việt có dấu, tự nhiên và dễ đọc.',
    'Trả về đúng 2 dòng theo format:',
    'TONE: ngot_ngao|vui_tuoi|tri_an',
    'MESSAGE: ...',
    lengthInstruction.sentenceGuide,
    templateHint ? `Mẫu thiệp đã chọn: ${templateHint}.` : '',
    `Yêu cầu nội dung: ${normalizeText(messagePrompt)}`
  ]
    .filter(Boolean)
    .join('\n');
}

function sanitizeMessage(message) {
  return normalizeText(message)
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])([^\s])/g, '$1 $2')
    .trim();
}

function hasVietnameseDiacritics(text) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
    String(text || '')
  );
}

function parseLabeledText(rawText) {
  const text = String(rawText || '').trim();
  if (!text) {
    throw new Error('Gemini text generation returned empty content.');
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result = {
    tone: 'ngot_ngao',
    message: ''
  };
  let currentField = '';

  lines.forEach((line) => {
    const matched = line.match(/^([A-Z_]+)\s*:\s*(.*)$/);
    if (matched) {
      const [, field, value] = matched;
      currentField = field;

      if (field === 'TONE') {
        result.tone = value.trim();
      } else if (field === 'MESSAGE') {
        result.message = value.trim();
      }
      return;
    }

    if (currentField === 'MESSAGE') {
      result.message = [result.message, line].filter(Boolean).join(' ').trim();
    }
  });

  return result;
}

function buildFallbackMessage(messagePrompt) {
  const normalized = normalizeForMatch(messagePrompt);
  const lengthInstruction = getLengthInstruction(messagePrompt);

  if (normalized.includes('dong nghiep')) {
    return {
      tone: 'tri_an',
      message: [
        'Cảm ơn bạn vì đã luôn đồng hành thật chân thành và mang đến nhiều năng lượng tích cực trong công việc mỗi ngày.',
        'Mong bạn sẽ luôn gặp thật nhiều thuận lợi, giữ được niềm vui trong công việc và nhận lại thật nhiều sự trân trọng xứng đáng.',
        'Chúc cho những ngày sắp tới của bạn luôn nhẹ nhàng, suôn sẻ và ngập tràn những điều tốt đẹp.',
        ...(lengthInstruction.minLength > 180
          ? ['Hy vọng mỗi chặng đường bạn đi qua đều có thêm những trải nghiệm đẹp, những cộng sự tử tế và thật nhiều niềm vui để nhớ.']
          : [])
      ].join(' ')
    };
  }

  return {
    tone: 'ngot_ngao',
    message: [
      'Gửi bạn một lời chúc dịu dàng và ấm áp như một khoảng trời rất yên sau những ngày bận rộn.',
      'Mong bạn luôn được bao bọc bởi những điều chân thành, nhẹ nhàng và những niềm vui thật nhỏ nhưng bền lâu.',
      'Chúc cho mỗi ngày của bạn đều có thêm sự bình yên và thật nhiều điều đẹp đẽ để mỉm cười khi nhớ lại.',
      ...(lengthInstruction.minLength > 180
        ? ['Hy vọng những điều tốt lành sẽ luôn đến với bạn theo cách thật tự nhiên, để lòng mình lúc nào cũng thấy nhẹ nhõm và được yêu thương.']
        : [])
    ].join(' ')
  };
}

async function callGeminiText(prompt) {
  if (!GEMINI_API_KEY) {
    const error = new Error('Thiếu GEMINI_API_KEY hoặc GOOGLE_API_KEY trên backend.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.95
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error?.status ||
      `Gemini text request failed with status ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status || 502;
    throw error;
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const rawText = parts
    .filter((part) => typeof part?.text === 'string' && part.text.trim())
    .map((part) => part.text.trim())
    .join('\n');

  return {
    rawText,
    parsed: parseLabeledText(rawText)
  };
}

async function generateCardMessage({ messagePrompt, templateTitle, templateCategory }) {
  const prompt = buildWriterPrompt({ messagePrompt, templateTitle, templateCategory });
  const lengthInstruction = getLengthInstruction(messagePrompt);
  const { rawText, parsed } = await callGeminiText(prompt);
  const finalMessage = sanitizeMessage(parsed?.message);

  if (!finalMessage || finalMessage.length < lengthInstruction.minLength || !hasVietnameseDiacritics(finalMessage)) {
    const fallback = buildFallbackMessage(messagePrompt);
    return {
      tone: fallback.tone,
      message: fallback.message,
      debug: {
        provider: 'gemini',
        textModel: GEMINI_TEXT_MODEL,
        messageSource: 'fallback',
        rawResponse: rawText,
        prompt
      }
    };
  }

  return {
    tone: parsed?.tone || 'ngot_ngao',
    message: finalMessage,
    debug: {
      provider: 'gemini',
      textModel: GEMINI_TEXT_MODEL,
      messageSource: 'primary_ai',
      rawResponse: rawText,
      prompt
    }
  };
}

module.exports = {
  generateCardMessage
};
