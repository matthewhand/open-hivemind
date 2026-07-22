/* eslint-disable @typescript-eslint/no-explicit-any */
export type LlmModelType = 'chat' | 'embedding' | 'both';

export const normalizeModelType = (value: unknown): LlmModelType => {
  if (value === 'embedding' || value === 'both') {
    return value;
  }
  return 'chat';
};

export const isChatCapable = (profile: any): boolean => {
  const modelType = normalizeModelType(profile?.modelType);
  return modelType === 'chat' || modelType === 'both';
};

export const isEmbeddingCapable = (profile: any): boolean => {
  const modelType = normalizeModelType(profile?.modelType);
  return modelType === 'embedding' || modelType === 'both';
};
