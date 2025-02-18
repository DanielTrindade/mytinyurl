import { test } from 'node:test';
import { buildApp } from '../src/infrastructure/http/app';
import assert from 'node:assert';

test('should respect provided expiration date', async (t) => {
  const app = await buildApp();
  t.after(async () => await app.close());

  const expirationDate = new Date(Date.now() + 300000); // 5 minutos
  console.log('Tentando criar URL com expiração em:', expirationDate.toISOString());

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
  console.log('URL criada com:', createBody);

  // Verifica se a data de expiração é a mesma que enviamos
  const createdExpiration = new Date(createBody.expiresAt);
  const originalExpiration = new Date(expirationDate);
  
  console.log('Data criada:', createdExpiration.toISOString());
  console.log('Data original:', originalExpiration.toISOString());
  console.log('Diferença em minutos:', (createdExpiration.getTime() - originalExpiration.getTime()) / 1000 / 60);

  // Permitindo uma diferença de 1 segundo devido a precisão
  const timeDiff = Math.abs(createdExpiration.getTime() - originalExpiration.getTime());
  assert.ok(timeDiff < 1000, 'A data de expiração deve ser a mesma que foi enviada');
});