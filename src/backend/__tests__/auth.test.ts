import request from 'supertest';
import app from '../../../server';

describe('Auth API', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'Test1234',
        fullName: 'Test User',
        age: 25,
        country: 'México',
        phoneNumber: '5555555555',
        birthDate: '2000-01-01',
        securityPin: '1234'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
  });
});
