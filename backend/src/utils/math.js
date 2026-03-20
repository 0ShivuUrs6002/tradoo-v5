export const round = (value, places = 4) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const stdDev = (values) => {
  if (!values?.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export const normalize = (value, scale = 1) => {
  if (!Number.isFinite(value) || !Number.isFinite(scale) || scale === 0) return 0;
  return value / scale;
};

export const clamp = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));
