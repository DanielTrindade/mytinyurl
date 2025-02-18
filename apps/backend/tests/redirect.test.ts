import { test } from 'node:test';
import { buildApp } from '../src/infrastructure/http/app';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';

test('URL Management Tests', async (t) => {
  let app: FastifyInstance;

  t.beforeEach(async () => {
    app = await buildApp();
  });

  t.afterEach(async () => {
    await app.close();
  });

  await t.test('should create a URL with default expiration', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/shorten',
      payload: {
        originalUrl: 'https://www.google.com'
      }
    });

    assert.equal(createResponse.statusCode, 201);
    const body = JSON.parse(createResponse.payload);
    assert.ok(body.shortCode);
    assert.ok(body.shortUrl);
    assert.ok(body.expiresAt);

    // Verifica se a data de expiração é aproximadamente 24h no futuro
    const expiresAt = new Date(body.expiresAt);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hoursDiff = diff / (1000 * 60 * 60);
    assert.ok(hoursDiff > 23 && hoursDiff < 25, 'Expiration should be ~24h in the future');
  });

  await t.test('should respect provided expiration date', async () => {
    const expirationDate = new Date(Date.now() + 300000); // 5 minutos

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/shorten',
      payload: {
        originalUrl: 'https://www.google.com',
        expiresAt: expirationDate.toISOString()
      }
    });

    assert.equal(createResponse.statusCode, 201);
    const createBody = JSON.parse(createResponse.payload);

    const createdExpiration = new Date(createBody.expiresAt);
    const originalExpiration = new Date(expirationDate);
    
    // Permitindo uma diferença de 1 segundo devido a precisão
    const timeDiff = Math.abs(createdExpiration.getTime() - originalExpiration.getTime());
    assert.ok(timeDiff < 1000, 'A data de expiração deve ser a mesma que foi enviada');
  });

  await t.test('should have correct headers for temporary redirect', async () => {
    // Primeiro criar uma URL
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/shorten',
      payload: {
        originalUrl: 'https://www.google.com'
      }
    });

    assert.equal(createResponse.statusCode, 201);
    const { shortCode } = JSON.parse(createResponse.payload);

    const response = await app.inject({
      method: 'GET',
      url: `/${shortCode}`,
      headers: {
        accept: 'text/html'
      }
    });

    assert.equal(response.statusCode, 302);
    
    // Verifica headers
    const cacheControl = response.headers['cache-control'];
    assert.ok(cacheControl, 'Cache-Control header should exist');
    assert.ok(cacheControl.includes('public'), 'Cache-Control should include public');
    
    const frameOptions = response.headers['x-frame-options'];
    assert.ok(frameOptions, 'X-Frame-Options header should exist');
    assert.equal(frameOptions, 'DENY');
    
    const contentTypeOptions = response.headers['x-content-type-options'];
    assert.ok(contentTypeOptions, 'X-Content-Type-Options header should exist');
    assert.equal(contentTypeOptions, 'nosniff');
    
    const referrerPolicy = response.headers['referrer-policy'];
    assert.ok(referrerPolicy, 'Referrer-Policy header should exist');
    assert.equal(referrerPolicy, 'strict-origin-when-cross-origin');
    
    const location = response.headers['location'];
    assert.ok(location, 'Location header should exist');
    assert.ok(location.startsWith('https://www.google.com'));
  });

  await t.test('should have no-cache headers for URLs near expiration', async () => {
    // Criar URL que expira em 30 minutos
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/shorten',
      payload: {
        originalUrl: 'https://www.google.com',
        expiresAt: new Date(Date.now() + 1800000).toISOString() // 30 minutes in the future
      }
    });

    assert.equal(createResponse.statusCode, 201);
    const { shortCode } = JSON.parse(createResponse.payload);

    const response = await app.inject({
      method: 'GET',
      url: `/${shortCode}`,
      headers: {
        accept: 'text/html'
      }
    });

    assert.equal(response.statusCode, 302);
    
    const cacheControl = response.headers['cache-control'];
    assert.ok(cacheControl, 'Cache-Control header should exist');
    assert.ok(cacheControl.includes('no-store'), 'Cache-Control should include no-store for near-expiration URLs');
    
    const pragma = response.headers['pragma'];
    assert.ok(pragma, 'Pragma header should exist');
    assert.equal(pragma, 'no-cache', 'Pragma should be no-cache for near-expiration URLs');
  });
});