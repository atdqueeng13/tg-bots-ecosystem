import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';

interface GenerateOptions {
  systemPrompt?: string;
  userPrompt: string;
  modelName?: string;
  temperature?: number;
  history?: Array<{ role: 'user' | 'model'; parts: string }>;
}

export async function getNextGeminiKey(): Promise<{ id?: string; key: string }> {
  try {
    const keys = await prisma.geminiApiKey.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        { lastUsedAt: 'asc' },
        { requestCount: 'asc' },
      ],
    });

    if (keys.length > 0) {
      const selected = keys[0];
      await prisma.geminiApiKey.update({
        where: { id: selected.id },
        data: {
          lastUsedAt: new Date(),
          requestCount: { increment: 1 },
        },
      });
      return { id: selected.id, key: selected.key };
    }
  } catch (err) {
    console.error('Error fetching API keys from DB:', err);
  }

  // Fallback to env variable
  const envKey = process.env.GEMINI_API_KEY || '';
  return { key: envKey };
}

export async function markKeyExhausted(keyId: string) {
  try {
    await prisma.geminiApiKey.update({
      where: { id: keyId },
      data: { status: 'COOLDOWN' },
    });
  } catch (err) {
    console.error('Error updating key status:', err);
  }
}

export async function generateWithGemini(options: GenerateOptions) {
  const { systemPrompt, userPrompt, modelName = 'gemini-2.0-flash', temperature = 0.7 } = options;

  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    retries--;
    const { id: keyId, key } = await getNextGeminiKey();

    if (!key) {
      throw new Error('Нет доступных API ключей Gemini. Добавьте ключи в настройках панели управления.');
    }

    const startTime = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt || undefined,
        generationConfig: {
          temperature,
        },
      });

      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      const text = response.text();
      const latencyMs = Date.now() - startTime;

      if (keyId) {
        await prisma.geminiApiKey.update({
          where: { id: keyId },
          data: { latencyMs },
        });
      }

      return {
        text,
        modelUsed: modelName,
        latencyMs,
        tokensEstimate: Math.ceil((userPrompt.length + text.length) / 3.8),
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini key error (${key.substring(0, 8)}...):`, error?.message);

      // If quota exceeded / 429
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('Resource has been exhausted')) {
        if (keyId) {
          await markKeyExhausted(keyId);
        }
      }
    }
  }

  throw lastError || new Error('Не удалось выполнить генерацию после нескольких попыток с разными API ключами.');
}
