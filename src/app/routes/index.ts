import { Hono } from 'hono';
import Keys from '../keys';
import { queryMiddleware } from '../middlewares/query.middleware'; // Renamed from settingsMiddleware
import { playGameMiddleware } from '../middlewares/playGame.middleware'; // Hono version

// Import Hono-converted routers
import authRouter from './auth'; // This is now a Hono instance

// Import other routers that will be converted later (currently Express or placeholder)
// For now, we will comment them out to avoid type errors if they are still Express Routers
// import gameRouter from './games';
// import userRouter from './users';
// import playRouter from './play';
// import walletRouter from './wallet';
// import subscriberRouter from './subscriber';
// import paymentRouter from './pay';
// import betRouter from './bets';
// import uploadsRouter from './uploads'; // Assuming this will be a Hono app or handled by static middleware
// import profileRouter from './profile';
// import playNowRouter from './playNow';
// import transactionRouter from './transaction';
// import contactRouter from './contacts';
// import settingRouter from './settings';
// import statisticsRouter from './statistics';
// import transferRouter from './transfer';
// import withdrawrequestsRouter from './withdrawrequests';
// import winnersRouter from './winners';

const routes = new Hono();

// Apply global middleware
routes.use('*', queryMiddleware); // Apply to all routes

// Swagger UI - to be re-added later if needed, with a Hono-compatible solution
// routes.use('/api-docs', swaggerUi.serve);
// routes.get('/api-docs', swaggerUi.setup(swaggerOptions));

const apiVersionPath = `/api/${Keys.API_VERSION}`;

// Mount Hono-converted routers
routes.route(`${apiVersionPath}/auth`, authRouter);

// Mount other routers (commented out for now, will be Hono instances eventually)
// routes.route('/uploads', uploadsRouter); // uploadsRouter needs to be a Hono app, or handled by static middleware directly in app/index.ts
// routes.route('/play/:gameId', playGameMiddleware, playRouter); // playRouter needs to be Hono. playGameMiddleware might be applied within playRouter or here if it's generic enough
// routes.route(`${apiVersionPath}/users`, userRouter);
// routes.route(`${apiVersionPath}/games`, gameRouter);
// routes.route(`${apiVersionPath}/wallets`, walletRouter);
// routes.route(`${apiVersionPath}/subscribers`, subscriberRouter);
// routes.route(`${apiVersionPath}/pay`, paymentRouter);
// routes.route(`${apiVersionPath}/bets`, betRouter);
// routes.route(`${apiVersionPath}/profile`, profileRouter);
// routes.route(`${apiVersionPath}/play-now`, playNowRouter);
// routes.route(`${apiVersionPath}/transactions`, transactionRouter);
// routes.route(`${apiVersionPath}/contacts`, contactRouter);
// routes.route(`${apiVersionPath}/settings`, settingRouter);
// routes.route(`${apiVersionPath}/statistics`, statisticsRouter);
// routes.route(`${apiVersionPath}/transfers`, transferRouter);
// routes.route(`${apiVersionPath}/withdrawrequests`, withdrawrequestsRouter);
// routes.route(`${apiVersionPath}/winners`, winnersRouter);

export default routes;
