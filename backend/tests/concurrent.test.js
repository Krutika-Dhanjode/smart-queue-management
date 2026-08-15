const request = require('supertest');
const { app } = require('../src/index');

describe('Concurrent Token Generation', () => {
  let adminToken;
  let publicCode;
  let queueTypeId;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register-admin')
      .send({
        name: 'Concurrent Admin',
        email: 'concurrent-admin@example.com',
        phone: '1234567890',
        password: 'password123',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'concurrent-admin@example.com',
        password: 'password123',
      });
    adminToken = loginRes.body.token;

    const queueRes = await request(app)
      .post('/api/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Concurrent Test Queue',
        date: '2024-01-15',
        capacity: 200,
        subQueues: [{ name: 'Test Sub-Queue' }],
      });
    publicCode = queueRes.body.queue.publicCode;
    queueTypeId = queueRes.body.queue.types[0].id;
  });

  it('should handle 100 simultaneous token requests without duplicates', async () => {
    const promises = [];
    const numRequests = 100;

    for (let i = 0; i < numRequests; i++) {
      promises.push(
        request(app)
          .post(`/api/queues/join/${publicCode}`)
          .send({
            queueTypeId,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            phone: `12345678${String(i).padStart(2, '0')}`,
          })
      );
    }

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 201);
    const tokens = successful.map(r => r.value.body.member.token_number);

    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(tokens.length);

    expect(tokens.length).toBeGreaterThan(0);

    const sortedTokens = [...tokens].sort((a, b) => a - b);
    for (let i = 1; i < sortedTokens.length; i++) {
      expect(sortedTokens[i]).toBeGreaterThan(sortedTokens[i - 1]);
    }

    console.log(`Successful requests: ${successful.length}/${numRequests}`);
    console.log(`Unique tokens: ${uniqueTokens.size}`);
    console.log(`Token range: ${Math.min(...tokens)} - ${Math.max(...tokens)}`);
  });

  it('should prevent duplicate active tokens for the same user', async () => {
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Test User',
        email: 'duplicate-test@example.com',
        phone: '9999999999',
        password: 'password123',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'duplicate-test@example.com',
        password: 'password123',
      });
    const userToken = loginRes.body.token;

    const res1 = await request(app)
      .post(`/api/queues/join/${publicCode}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        queueTypeId,
        name: 'Duplicate Test User',
        email: 'duplicate-test@example.com',
        phone: '9999999999',
      });
    expect(res1.statusCode).toBe(201);

    const res2 = await request(app)
      .post(`/api/queues/join/${publicCode}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        queueTypeId,
        name: 'Duplicate Test User',
        email: 'duplicate-test@example.com',
        phone: '9999999999',
      });
    expect(res2.statusCode).toBe(409);
  });
});
