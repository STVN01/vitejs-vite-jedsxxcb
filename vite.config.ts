import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import { suggestScores } from './src/lib/suggest.ts';
import type { RubricKey } from './src/lib/score.ts';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const RUBRIC_KEYS = [
  'technical_skills',
  'experience_relevance',
  'education_fit',
  'evidence_quality',
] as const;

function clampScores(value: unknown): Record<RubricKey, number> | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const scores = {} as Record<RubricKey, number>;
  for (const key of RUBRIC_KEYS) {
    const mark = Number(record[key]);
    if (!Number.isFinite(mark)) return null;
    scores[key] = Math.min(10, Math.max(0, mark));
  }
  return scores;
}

async function askModel(cv: string, job: string, apiKey: string) {
  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Score the CV against the job. Return only JSON with integer fields technical_skills, experience_relevance, education_fit, and evidence_quality, each from 0 to 10. Do not return the match score out of 100.',
          },
          { role: 'user', content: `CV:\n${cv}\n\nJob:\n${job}` },
        ],
      }),
    }
  );
  if (!response.ok) throw new Error(`Groq replied ${response.status}`);
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  return clampScores(JSON.parse(text));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'suggest-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/api/suggest' || req.method !== 'POST') {
              next();
              return;
            }
            const body = JSON.parse(await readBody(req)) as {
              cv?: string;
              job?: string;
            };
            const cv = body.cv ?? '';
            const job = body.job ?? '';
            let scores = suggestScores(cv, job);
            let source = 'stand-in';
            let detail = 'No GROQ_API_KEY in .env.';
            if (env.GROQ_API_KEY) {
              try {
                const fromModel = await askModel(cv, job, env.GROQ_API_KEY);
                if (fromModel) {
                  scores = fromModel;
                  source = 'model';
                  detail = '';
                } else {
                  detail = 'The model reply was not four scores.';
                }
              } catch (error) {
                detail =
                  error instanceof Error
                    ? error.message
                    : 'The model request failed.';
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ scores, source, detail }));
          });
        },
      },
    ],
  };
});
