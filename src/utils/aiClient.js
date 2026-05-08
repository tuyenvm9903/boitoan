import OpenAI from 'openai';

const DEFAULT_MODEL = 'gpt-4o';

const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return undefined;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

export const getOpenAIClient = () => {
  const apiToken = import.meta.env.VITE_OPENAI_TOKEN;
  if (!apiToken) return null;

  return new OpenAI({
    apiKey: apiToken,
    baseURL: normalizeBaseUrl(import.meta.env.VITE_OPENAI_BASE_URL),
    dangerouslyAllowBrowser: true,
    fetch: (url, init) => fetch(url, { ...init, credentials: 'omit' })
  });
};

export const getChatModel = () => import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL;
export const getVisionModel = () => import.meta.env.VITE_OPENAI_VISION_MODEL || getChatModel();

export const createLongFormCompletion = async ({
  openai,
  model,
  messages,
  maxTokens = 1800,
  temperature,
  minCharacters = 1800,
  maxContinuations = 2
}) => {
  if (!openai) {
    throw new Error('OpenAI client is not initialized.');
  }

  let mergedContent = '';
  let conversation = [...messages];

  for (let i = 0; i <= maxContinuations; i += 1) {
    const response = await openai.chat.completions.create({
      model,
      messages: conversation,
      max_tokens: maxTokens,
      ...(typeof temperature === 'number' ? { temperature } : {})
    });

    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Phản hồi AI không có nội dung.');
    }

    mergedContent = mergedContent ? `${mergedContent}\n${content}` : content;
    const finishReason = response?.choices?.[0]?.finish_reason;
    const isComplete = finishReason !== 'length' && mergedContent.length >= minCharacters;
    if (isComplete) {
      return mergedContent.trim();
    }

    conversation = [
      ...conversation,
      { role: 'assistant', content },
      {
        role: 'user',
        content:
          'Hãy tiếp tục phần còn dang dở ngay từ đoạn trước, viết thêm cho đầy đủ và mạch lạc. Chỉ viết phần tiếp nối, không lặp lại nội dung đã có.'
      }
    ];
  }

  return mergedContent.trim();
};

export const getOpenAIErrorMessage = (error) => {
  const apiMessage =
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    error?.message;

  const normalized = (apiMessage || '').toLowerCase();
  if (normalized.includes('quota') || normalized.includes('insufficient')) {
    return 'API token đã hết quota hoặc chưa bật thanh toán trên OpenAI/Mimo.';
  }
  if (
    (normalized.includes('invalid') && normalized.includes('api')) ||
    (normalized.includes('incorrect') && normalized.includes('api'))
  ) {
    return 'API token không hợp lệ. Vui lòng kiểm tra lại VITE_OPENAI_TOKEN.';
  }
  if (normalized.includes('model') && normalized.includes('not')) {
    return 'Model chưa khả dụng. Hãy kiểm tra VITE_OPENAI_MODEL cho đúng với nhà cung cấp.';
  }
  if (normalized.includes('unauthorized') || normalized.includes('forbidden')) {
    return 'Không có quyền truy cập API. Kiểm tra lại token/project hoặc endpoint.';
  }
  return apiMessage || 'Lỗi gọi AI API không xác định.';
};
