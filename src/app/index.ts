import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
// import { bodyParser } from 'hono/body-parse'; // Corrected import name if used

import routes from './routes';
import Keys from './keys';
import ioSockets from './sockets';

const honoApp = new Hono();

// Core Middleware
honoApp.use('*', logger());
honoApp.use('*', cors()); // Consider more specific origins for production
honoApp.use('*', secureHeaders());

// Body parsing - Hono's c.req.json() and c.req.parseBody() are preferred for on-demand parsing.
// If global parsing is needed for all routes, uncomment and use:
// honoApp.use('*', bodyParser());

// Static file serving
// Serve files from the 'games' directory under the /games path
honoApp.get('/games/*', serveStatic({ root: './' }));
// Serve files from the 'uploads' directory under the /uploads path
honoApp.get('/uploads/*', serveStatic({ root: './' }));


// Application routes
honoApp.route('/', routes);


const initializeApp = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(Keys.MONGO_DB_URL);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// We will keep the socket.io server instance for now,
// but it needs to be integrated with Bun's server.
// This direct creation might not work as expected without an HTTP server instance.
// For now, let's assume we'll attach it to the Bun server instance later.
let io: Server;

const startApp = async () => {
  await initializeApp();

  // httpServer is no longer created with 'http' module.
  // We will create io instance after Bun.serve is called, or adapt it.
  // For now, let's defer io creation/attachment.

  console.log(`Server starting on port ${Keys.PORT || 3000}...`);

  const server = Bun.serve({
    fetch: honoApp.fetch,
    port: Keys.PORT || 3000,
    // Websocket handling will be added here later
  });

  // Initialize Socket.IO - this part needs careful review and adaptation
  // For Bun, Socket.IO needs to be integrated differently.
  // We might need to handle WebSocket upgrades in Bun.serve's websocket option
  // and then pass requests to Socket.IO.
  // For now, we are keeping the old io instance, but it won't be functional yet.
  // A placeholder for where io would be initialized with the new server:
  // io = new Server(server); // This is conceptual and needs correct implementation
  // ioSockets(io);
  console.log(`Bun server running on port ${server.port}`);
  return server; // Return the server instance from Bun.serve
};

// We need to export the Hono app instance for use in other parts of the application (e.g. tests or route definitions)
// And potentially the server instance returned by Bun.serve
// The old 'app' export structure will change.

export { honoApp };

// Call startApp to initialize and start the server.
// The returned server instance from Bun.serve could be exported or used internally.
const bunServer = await startApp();

// Placeholder for io, this needs to be correctly initialized with Bun
// This is a temporary setup for io, it will be properly integrated later.
io = new Server(bunServer, {
  cors: { origin: Keys.FRONT_END_URL },
});
ioSockets(io);


export default {
  server: bunServer, // Exporting the Bun server instance
  hono: honoApp, // Exporting the Hono app
  io // Exporting io, though it needs proper integration
};
