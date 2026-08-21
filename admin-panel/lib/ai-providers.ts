export function detectProvider(
  key: string
): 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'custom' {
  if (!key) return 'gemini';
  if (key.startsWith('AIzaSy') || key.startsWith('AQ.') || key.length === 39) return 'gemini';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('sk-')) return 'openai';
  return 'gemini'; // default fallback for google keys
}

export async function fetchAvailableModels(apiKey: string): Promise<string[]> {
  const fallbackGemini = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-pro-latest',
  ];

  if (!apiKey || apiKey.includes('AIzaSyDemoKey') || apiKey.length < 15) {
    return fallbackGemini;
  }

  const provider = detectProvider(apiKey);

  if (provider === 'gemini') {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        return fallbackGemini;
      }

      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        const generationModels = data.models
          .filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: any) => m.name.replace('models/', ''));

        if (generationModels.length > 0) {
          return generationModels;
        }
      }
      return fallbackGemini;
    } catch {
      return fallbackGemini;
    }
  }

  if (provider === 'openai') {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1', 'gpt-3.5-turbo'];
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data
          .map((m: any) => m.id)
          .filter(
            (id: string) =>
              id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3')
          )
          .slice(0, 15);
      }
    } catch {
      return ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1', 'gpt-3.5-turbo'];
    }
  }

  if (provider === 'anthropic') {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ];
  }

  if (provider === 'openrouter') {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((m: any) => m.id).slice(0, 20);
        }
      }
    } catch {}
  }

  return fallbackGemini;
}
