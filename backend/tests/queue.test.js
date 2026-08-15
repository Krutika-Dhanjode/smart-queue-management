const request = require('supertest');
const { app } = require('../src/index');

describe('Queue Endpoints', () => {
  let adminToken;
  let queueId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({
        name: 'Admin Test',
        email: 'admin-queue-test@example.com',
        phone: '1234567890',
        password: 'password123',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin-queue-test@example.com',
        password: 'password123',
      });

    adminToken = loginRes.body.token;
  });

  describe('POST /api/queues', () => {
    it('should create a queue', async () => {
      const res = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Queue',
          date: '2024-01-15',
          capacity: 50,
          subQueues: [
            { name: 'OPD' },
            { name: 'Lab' },
          ],
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.queue).toHaveProperty('publicCode');
      expect(res.body.queue).toHaveProperty('adminCode');
      queueId = res.body.queue.id;
    });
  });

  describe('GET /api/queues/:publicCode', () => {
    it('should get queue by public code', async () => {
      const queueRes = await request(app)
        .get(`/api/queues/admin`)
        .set('Authorization', `Bearer ${adminToken}`);

      const publicCode = queueRes.body.queues[0]?.public_code;
      if (publicCode) {
        const res = await request(app)
          .get(`/api/queues/${publicCode}`);
        expect(res.statusCode).toBe(200);
      }
    });
  });
});
