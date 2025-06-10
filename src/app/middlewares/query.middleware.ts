import { Context, Next } from 'hono';

export const queryMiddleware = async (c: Context, next: Next) => {
  const pageParam = c.req.query('page');
  const limitParam = c.req.query('limit');

  const page = Number(pageParam || 1);
  const limit = Number(limitParam || 10);
  const offset = (page - 1) * limit;

  c.set('pagination', {
    page,
    limit,
    offset,
  });

  await next();
};
