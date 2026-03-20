import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((value) => value.trim()),
  fyers: {
    appId: (process.env.FYERS_APP_ID || '').trim(),
    secret: (process.env.FYERS_SECRET || '').trim(),
    appIdHash: (process.env.FYERS_APP_ID_HASH || '').trim(),
    redirectUri: (process.env.FYERS_REDIRECT_URI || '').trim(),
    loginBaseUrl: (process.env.FYERS_LOGIN_BASE_URL || 'https://api-t1.fyers.in/api/v3').trim(),
    authBaseUrl: (process.env.FYERS_AUTH_BASE_URL || 'https://api-t1.fyers.in/api/v3').trim(),
    dataBaseUrl: (process.env.FYERS_DATA_BASE_URL || 'https://api-t1.fyers.in/data').trim(),
    accessToken: (process.env.FYERS_ACCESS_TOKEN || '').trim(),
    refreshToken: (process.env.FYERS_REFRESH_TOKEN || '').trim()
  },
  fetchIntervalMs: Number(process.env.FETCH_INTERVAL_MS || 6000),
  symbol: process.env.SYMBOL || 'NSE:NIFTY50-INDEX',
  futuresSymbol: process.env.FUTURES_SYMBOL || 'NSE:NIFTY26MARFUT',
  candlesResolution: process.env.CANDLES_RESOLUTION || '1'
};
