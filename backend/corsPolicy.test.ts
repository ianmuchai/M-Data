import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAllowedCorsOrigin } from './corsPolicy';

describe('isAllowedCorsOrigin', () => {
  it('allows localhost and 127.0.0.1 development ports when no explicit CORS_ORIGIN is configured', () => {
    assert.equal(isAllowedCorsOrigin('http://localhost:5173', []), true);
    assert.equal(isAllowedCorsOrigin('http://127.0.0.1:5174', []), true);
  });

  it('allows Vercel app origins when no explicit CORS_ORIGIN is configured', () => {
    assert.equal(isAllowedCorsOrigin('https://m-data.vercel.app', []), true);
    assert.equal(isAllowedCorsOrigin('https://m-data-git-main-muchaimachua0-9170s-projects.vercel.app', []), true);
  });

  it('uses explicit origins when CORS_ORIGIN is configured', () => {
    assert.equal(isAllowedCorsOrigin('https://analytics.example.com', ['https://analytics.example.com']), true);
    assert.equal(isAllowedCorsOrigin('http://127.0.0.1:5174', ['https://analytics.example.com']), false);
  });
});
