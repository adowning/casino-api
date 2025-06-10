import { Hono } from 'hono';
import AuthController from '../../controllers/AuthController';
import authMiddleware from '../../middlewares/auth.middleware'; // Hono version
import AuthValidate from '../../validations/auth'; // Hono version

const authRouter = new Hono();

authRouter.post('/signup', AuthValidate.signup, AuthController.signUp);
authRouter.post('/login', AuthValidate.login, AuthController.logIn);
// Assuming authMiddleware is the Hono-adapted version
authRouter.post('/logout', authMiddleware, AuthController.logOut);

authRouter.post('/forget-password', AuthValidate.forgetPassword, AuthController.forgettingPassword);

// HTTP method for reset-password should ideally be POST or PATCH if it modifies the resource.
// PUT usually implies replacing the entire resource. Sticking to PUT as per original for now.
authRouter.put('/reset-password', AuthValidate.resetPassword, AuthController.resetingPassword);

authRouter.post('/verify', AuthValidate.verify, AuthController.confirmAccount);

export default authRouter;
