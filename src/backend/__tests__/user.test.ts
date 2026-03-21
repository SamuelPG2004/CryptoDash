import request from 'supertest';
import app from '../../../server';

describe('User API', () => {
  it('should return 401 if not authenticated', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.statusCode).toBe(401);
  });
});
