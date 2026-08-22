import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';
import { detectProvider } from './ai-providers';

interface GenerateOptions {
  systemPrompt?: string;
  userPrompt: string;
  modelName?: string;
  temperature?: number;
  history?: Array<{ role: 'user' | 'model'; parts: string }>;
}

export async function getNextGeminiKey(): Promise<{
  id?: string;
  key: string;
  provider: string;
}> {
  try {
    const setting = await prisma.globalSetting.findUnique({
      where: { id: 'global' },
    });

    // 1. If Fixed mode is selected
    if (setting?.apiKeyMode === 'FIXED' && setting.activeApiKeyId) {
      const fixedKey = await prisma.geminiApiKey.findUnique({
        where: { id: setting.activeApiKeyId },
      });
      if (fixedKey && fixedKey.status === 'ACTIVE') {
        await prisma.geminiApiKey.update({
          where: { id: fixedKey.id },
          data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
        });
        return {
          id: fixedKey.id,
          key: fixedKey.key,
          provider: fixedKey.provider || detectProvider(fixedKey.key),
        };
      }
    }

    // 2. Auto-rotation mode (or fallback)
    const keys = await prisma.geminiApiKey.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        { isPrimary: 'desc' },
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
      return {
        id: selected.id,
        key: selected.key,
        provider: selected.provider || detectProvider(selected.key),
      };
    }
  } catch (err) {
    console.error('Error fetching API keys from DB:', err);
  }

  // Fallback to env variable
  const envKey = process.env.GEMINI_API_KEY || '';
  return { key: envKey, provider: detectProvider(envKey) };
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
  let {
    systemPrompt,
    userPrompt,
    modelName = 'gemini-3.6-flash',
    temperature = 0.7,
  } = options;

  // Always map all Gemini models to the rock-solid Gemini 3.6 Flash
  if (modelName.includes('gemini') || !modelName) {
    modelName = 'gemini-3.6-flash';
  }

  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    retries--;
    const { id: keyId, key, provider } = await getNextGeminiKey();

    if (!key || key.includes('AIzaSyDemoKey')) {
      // Demo response if no key configured
      return {
        text: `[Sherlock AI (${modelName})]: Запрос успешно обработан. Системный промпт применен.`,
        modelUsed: modelName,
        latencyMs: 140,
        tokensEstimate: Math.ceil((userPrompt.length + 80) / 3.8),
      };
    }

    const startTime = Date.now();

    try {
      // 1. Google Gemini Generation
      if (provider === 'gemini' || modelName.includes('gemini')) {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.6-flash',
          systemInstruction: systemPrompt || undefined,
          generationConfig: {
            temperature,
          },
        });

        let text = '';
        if (options.history && options.history.length > 0) {
          const formattedHistory = options.history.map((h) => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.parts }],
          }));
          const chat = model.startChat({
            history: formattedHistory,
          });
          const result = await chat.sendMessage(userPrompt);
          const response = await result.response;
          text = response.text();
        } else {
          const result = await model.generateContent(userPrompt);
          const response = await result.response;
          text = response.text();
        }

        const latencyMs = Date.now() - startTime;

        if (keyId) {
          await prisma.geminiApiKey.update({
            where: { id: keyId },
            data: { latencyMs },
          });
        }

        return {
          text,
          modelUsed: 'gemini-3.6-flash',
          latencyMs,
          tokensEstimate: Math.ceil((userPrompt.length + text.length) / 3.8),
        };
      }

      // 2. OpenAI / OpenRouter Generation
      if (provider === 'openai' || provider === 'openrouter' || modelName.startsWith('gpt-') || modelName.startsWith('o1') || modelName.startsWith('o3')) {
        const endpoint =
          provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

        const messages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

        if (options.history && options.history.length > 0) {
          for (const h of options.history) {
            messages.push({
              role: h.role === 'model' ? 'assistant' : 'user',
              content: h.parts,
            });
          }
        }

        messages.push({ role: 'user', content: userPrompt });

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `OpenAI API error (${res.status})`);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
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
          tokensEstimate: data.usage?.total_tokens || Math.ceil((userPrompt.length + text.length) / 3.8),
        };
      }

      // 3. Anthropic Generation
      if (provider === 'anthropic' || modelName.startsWith('claude-')) {
        const messages: Array<{ role: string; content: string }> = [];
        if (options.history && options.history.length > 0) {
          for (const h of options.history) {
            messages.push({
              role: h.role === 'model' ? 'assistant' : 'user',
              content: h.parts,
            });
          }
        }
        messages.push({ role: 'user', content: userPrompt });

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: 2048,
            system: systemPrompt || undefined,
            messages,
            temperature,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Anthropic API error (${res.status})`);
        }

        const data = await res.json();
        const text = data.content?.[0]?.text || '';
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
          tokensEstimate: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || Math.ceil((userPrompt.length + text.length) / 3.8),
        };
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`AI key error (${key.substring(0, 8)}...):`, error?.message);

      // If quota exceeded / 429
      if (
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('Resource has been exhausted')
      ) {
        if (keyId) {
          await markKeyExhausted(keyId);
        }
      }
    }
  }

  throw (
    lastError ||
    new Error('Не удалось выполнить генерацию после нескольких попыток с разными API ключами.')
  );
}
