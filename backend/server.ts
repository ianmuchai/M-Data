import cors from 'cors';
import express from 'express';
import { categories, ranges } from './analyticsData';
import { buildAnalyticsResponse, normalizeCategory, normalizeRange } from './analyticsService';
import { analyzeUpload } from './uploadAnalysisService';
import { isAllowedCorsOrigin, parseAllowedOrigins } from './corsPolicy';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  }),
);
app.use(express.json({ limit: '6mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/meta', (_request, response) => {
  response.set('Cache-Control', 'public, max-age=300');
  response.json({ categories, ranges });
});

app.get('/api/analytics', (request, response) => {
  const selectedCategory = normalizeCategory(request.query.category);
  const selectedRange = normalizeRange(request.query.range);

  response.set('Cache-Control', 'no-store');
  response.json(buildAnalyticsResponse(selectedCategory, selectedRange));
});

app.post('/api/analyze-upload', async (request, response) => {
  const fileName = typeof request.body?.fileName === 'string' ? request.body.fileName : 'uploaded-data.csv';
  const content = typeof request.body?.content === 'string' ? request.body.content : '';
  const encoding = request.body?.encoding === 'base64' ? 'base64' : 'text';

  if (!content.trim()) {
    response.status(400).json({ error: 'No file content provided' });
    return;
  }

  try {
    response.json(await analyzeUpload(fileName, content, encoding));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to analyse file' });
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Analytics API available at http://localhost:${port}`);
  });
}

export { app };
export default app;

