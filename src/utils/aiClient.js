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
