import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  mongoUri: required('MONGODB_URI'),
  redisUrl: required('REDIS_URL'),
  groqApiKey: required('GROQ_API_KEY'),
  groqModel: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  wsPath: process.env.WS_PATH ?? '/ws',
};
