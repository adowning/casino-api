import { Context, Next } from 'hono';
import Game from '../models/Game'; // Assuming Game model is Mongoose or similar

export const playGameMiddleware = async (c: Context, next: Next) => {
  const gameId = c.req.param('gameId');

  try {
    const game = await Game.findById(gameId);
    if (!game) {
      // In Hono, redirect is a Response object
      return c.redirect('/404');
    } else {
      await next();
    }
  } catch (error) {
    // Log the error for debugging
    console.error("Error in playGameMiddleware:", error);
    return c.redirect('/400');
  }
};
