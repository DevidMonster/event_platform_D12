import { cardTemplates } from './card-templates';

export const AI_CARD_IMAGE_SPEC = {
  width: 1200,
  height: 1680,
  aspectRatio: '5:7',
  borderRadius: 28,
  topPadding: 88,
  sidePadding: 88,
  copyZoneHeight: 540,
  footerPaddingBottom: 88,
  overlayZone: '42% phia duoi',
  recipientMaxLength: 60,
  messageMaxLength: 420
};

export const AI_CARD_FORM_SPEC = [
  {
    key: 'recipientName',
    label: 'Nguoi nhan',
    required: true,
    note: 'Hien trong dong mo dau "Gui den ..."'
  },
  {
    key: 'recipientEmail',
    label: 'Email nguoi nhan',
    required: true,
    note: 'Dung de gui mail va doi chieu danh sach nguoi nhan'
  },
  {
    key: 'tone',
    label: 'Tong loi chuc',
    required: true,
    note: 'ngot_ngao | vui_tuoi | tri_an'
  },
  {
    key: 'aiPrompt',
    label: 'Mo ta cho AI',
    required: false,
    note: 'Mo ta y tuong hinh, boi canh, doi tuong, khong viet prompt qua dai'
  },
  {
    key: 'message',
    label: 'Noi dung tren thiep',
    required: true,
    note: 'Toi da 420 ky tu, uu tien 2-4 cau ngan'
  },
  {
    key: 'templateId',
    label: 'Mau thiep',
    required: true,
    note: 'Neu AI khong sinh anh moi thi phai map vao mot template co san'
  }
];

const toneCatalog = {
  ngot_ngao: {
    label: 'Ngot ngao',
    opener: 'Gui ban mot loi chuc that diu dang va am ap.',
    closer: 'Mong nhung ngay phia truoc luon nhe nhang va day niem vui.'
  },
  vui_tuoi: {
    label: 'Vui tuoi',
    opener: 'Chuc ban co mot ngay that rang ro va nhieu tieng cuoi.',
    closer: 'Hy vong moi dieu tot dep va nang luong tich cuc se luon o ben ban.'
  },
  tri_an: {
    label: 'Tri an',
    opener: 'Cam on ban vi nhung dieu tu te da mang den moi ngay.',
    closer: 'Chuc ban luon binh an, duoc tran trong va gap that nhieu niem vui.'
  }
};

const templateKeywords = {
  'bloom-frame': ['hoa', '8/3', 'nu', 'chi', 'co', 'me', 'diu dang', 'ngot ngao', 'pastel', 'hong'],
  'soft-sky': ['ban', 'bau troi', 'tuoi sang', 'thoai mai', 'vui', 'tre', 'xanh', 'nhe nhang'],
  'gold-ribbon': ['tri an', 'cam on', 'sang trong', 'lich su', 'vang', 'cao cap', 'tran trong'],
  'pastel-bouquet': ['hoa pastel', 'bo hoa', 'lang man', 'mem mai', 'nu tinh', 'hoa hong', 'hoa dep'],
  'sunset-hands': ['ket noi', 'ban be', 'dong doi', 'tay', 'hoang hon', 'gan gui', 'dong hanh'],
  'meadow-light': ['dong hoa', 'thien nhien', 'trong treo', 'de thuong', 'anh sang', 'mua xuan'],
  'dreamy-bouquet': ['mong mo', 'nhat ky', 'tinh te', '3/8', 'me man', 'hoa tulip', 'nhu mo'],
  'cloud-whisper': ['may', 'troi', 'xanh', 'thoang', 'yen tinh', 'heaven', 'airy'],
  'gladiolus-glow': ['gladiolus', 'hong', 'thanh lich', 'quy phai', 'elegant', 'fashion', 'floral']
};

export function normalizeAiPromptText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function detectAiTone({ tone, prompt }) {
  const normalizedPrompt = normalizeAiPromptText(prompt).toLowerCase();
  if (normalizedPrompt.includes('tri an') || normalizedPrompt.includes('cam on')) {
    return 'tri_an';
  }
  if (
    normalizedPrompt.includes('vui') ||
    normalizedPrompt.includes('nhon') ||
    normalizedPrompt.includes('tuoi')
  ) {
    return 'vui_tuoi';
  }
  if (
    normalizedPrompt.includes('ngot') ||
    normalizedPrompt.includes('diu') ||
    normalizedPrompt.includes('am ap')
  ) {
    return 'ngot_ngao';
  }
  return toneCatalog[tone] ? tone : 'ngot_ngao';
}

export function pickAiTemplateId(prompt, currentTemplateId) {
  const normalizedPrompt = normalizeAiPromptText(prompt).toLowerCase();
  if (!normalizedPrompt) {
    return currentTemplateId || cardTemplates[0]?.id;
  }

  let bestTemplateId = currentTemplateId || cardTemplates[0]?.id;
  let bestScore = -1;

  cardTemplates.forEach((template) => {
    const keywordList = templateKeywords[template.id] || [];
    const score = keywordList.reduce(
      (total, keyword) => (normalizedPrompt.includes(keyword) ? total + 1 : total),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestTemplateId = template.id;
    }
  });

  return bestTemplateId;
}

export function buildAiPromptSummary(prompt) {
  const normalizedPrompt = normalizeAiPromptText(prompt);
  if (!normalizedPrompt) return '';

  const cleanPrompt = normalizedPrompt.replace(/[.!]+$/g, '');
  if (cleanPrompt.length <= 92) return cleanPrompt;
  return `${cleanPrompt.slice(0, 89)}...`;
}

export function buildAiCardScript({
  recipientName,
  tone,
  prompt,
  templateId
} = {}) {
  const resolvedTone = detectAiTone({ tone, prompt });
  const resolvedTemplateId = pickAiTemplateId(prompt, templateId);
  const resolvedTemplate = cardTemplates.find((item) => item.id === resolvedTemplateId) || cardTemplates[0];
  const safeRecipient = String(recipientName || '').trim() || 'ban';
  const safePrompt = normalizeAiPromptText(prompt) || 'Khong co mo ta bo sung.';
  const availableTemplates = cardTemplates
    .map((item) => `- ${item.id}: ${item.title} (${item.category})`)
    .join('\n');

  return [
    'Ban dang tao mot greeting card cho D12.',
    `Canvas bat buoc: ${AI_CARD_IMAGE_SPEC.width}x${AI_CARD_IMAGE_SPEC.height}px, ty le ${AI_CARD_IMAGE_SPEC.aspectRatio}.`,
    `Safe area cho text: cach mep trai/phai ${AI_CARD_IMAGE_SPEC.sidePadding}px, top ${AI_CARD_IMAGE_SPEC.topPadding}px, noi dung chinh nam trong ${AI_CARD_IMAGE_SPEC.overlayZone}.`,
    `Khong dat text vao vung qua sang hoac qua roi, uu tien background co do tuong phan voi chu.`,
    `Ten nguoi nhan toi da ${AI_CARD_IMAGE_SPEC.recipientMaxLength} ky tu. Loi chuc toi da ${AI_CARD_IMAGE_SPEC.messageMaxLength} ky tu.`,
    `Tong cam xuc: ${toneCatalog[resolvedTone]?.label || 'Ngot ngao'}.`,
    `Nguoi nhan: ${safeRecipient}.`,
    `Template uu tien: ${resolvedTemplate.id} - ${resolvedTemplate.title}.`,
    `Mo ta nguoi dung: ${safePrompt}`,
    'Neu AI thiet ke hinh anh moi, van phai giu bo cuc sau:',
    '- Dong category nho o goc tren trai.',
    '- Tieu de mau o goc tren phai.',
    '- Khoi text chinh o nua duoi, uu tien 2-4 cau ngan, de doc tren mobile.',
    '- Ngay thang nho o chan thiep.',
    'Neu AI khong sinh anh moi thi chi duoc chon 1 template co san duoi day:',
    availableTemplates,
    'Output mong muon o dang JSON:',
    '{',
    '  "templateId": "string",',
    '  "tone": "ngot_ngao|vui_tuoi|tri_an",',
    '  "artDirection": "mo ta ngan cho hinh nen",',
    '  "message": "noi dung hien tren thiep",',
    '  "layoutNotes": "ghi chu bo cuc de render dung format"',
    '}'
  ].join('\n');
}

export function buildAiSuggestionPackage({ recipientName, tone, prompt, templateId }) {
  const resolvedTone = detectAiTone({ tone, prompt });
  const tonePreset = toneCatalog[resolvedTone] || toneCatalog.ngot_ngao;
  const safeRecipient = String(recipientName || '').trim() || 'ban';
  const promptSummary = buildAiPromptSummary(prompt);

  const lines = [`Gui ${safeRecipient},`, tonePreset.opener];
  if (promptSummary) {
    lines.push(`${promptSummary.charAt(0).toUpperCase()}${promptSummary.slice(1)}.`);
  }
  lines.push(tonePreset.closer);

  return {
    tone: resolvedTone,
    templateId: pickAiTemplateId(prompt, templateId),
    message: lines.join(' '),
    summary: promptSummary,
    script: buildAiCardScript({ recipientName, tone: resolvedTone, prompt, templateId })
  };
}
