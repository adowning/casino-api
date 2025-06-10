import { Context } from 'hono';
import { compare, hash } from 'bcryptjs';
import { verify, sign, decode } from 'jsonwebtoken';
// import { HttpException } from '../exceptions/HttpException'; // Replaced with c.json responses
import User from '../models/User'; // Assuming Mongoose User model
import Keys from '../keys';
import emailMocks from '../utils/email';
import sendEmail from '../utils/nodemailer';
// Assuming UserContextData is defined in auth.middleware.ts and imported where routes are defined if needed
// For controller methods, c.get('user') will be used.

class AuthController {
  static signUp = async (c: Context) => {
    try {
      const userData = await c.req.json();
      const { referralCode } = userData;

      let referrer;
      if (referralCode) {
        referrer = await User.findOne({ referralCode });
        if (!referrer) {
          return c.json({ message: 'Invalid referral code' }, 400);
        }
      }

      const findUser = await User.findOne({ email: userData.email }).exec();
      if (findUser) {
        return c.json({ message: `This email ${userData.email} already exists` }, 409);
      }

      const hashedPassword = await hash(userData.password, 10);
      const createUserData = new User({
        ...userData,
        referralCode: AuthController.generateReferralCode(),
        referrer: referrer ? referrer._id : null,
        password: hashedPassword,
      });

      const signUpUserData = await createUserData.save();

      if (referrer) {
        referrer.invitedFriends.push(signUpUserData._id);
        await referrer.save();
      }

      const { token } = AuthController.createToken(
        signUpUserData._id.toString(),
        signUpUserData.email,
        signUpUserData.role,
        signUpUserData.firstName,
      );

      const message = emailMocks.verifyAccount(signUpUserData.firstName, token);
      const subject = 'Account Verification';
      sendEmail(signUpUserData.email, subject, message); // Assuming sendEmail is async or handles errors

      return c.json({ data: signUpUserData, message: 'signup' }, 201);
    } catch (error: any) {
      console.error('SignUp Error:', error);
      return c.json({ message: error?.message || 'something went wrong' }, error?.status || 500);
    }
  };

  static logIn = async (c: Context) => {
    try {
      const userData: any = await c.req.json();
      const findUser = await User.findOne({ email: userData.email });

      if (!findUser) {
        return c.json({ message: 'Invalid login credentials. Please check your email and password and try again.' }, 409);
      }

      const isPasswordMatching: boolean = await compare(userData.password, findUser.password);
      if (!isPasswordMatching) {
        return c.json({ message: 'Invalid login credentials. Please check your email and password and try again.' }, 409);
      }

      if (!findUser.verified) {
        return c.json({ message: `This email ${userData.email} was not verified, please check your email and follow instructions.` }, 400);
      }

      const tokenData = AuthController.createToken(
        findUser._id.toString(),
        findUser.email,
        findUser.role,
        findUser.firstName,
      );

      // Set cookie using Hono's context
      c.cookie('Authorization', tokenData.token, {
        httpOnly: true,
        maxAge: typeof tokenData.expiresIn === 'string' ? parseInt(tokenData.expiresIn, 10) : tokenData.expiresIn, // maxAge needs to be a number of seconds
        path: '/', // Important for cookie visibility
      });

      return c.json({ data: findUser, tokenData, message: 'login' }, 200);
    } catch (error: any) {
      console.error('LogIn Error:', error);
      return c.json({ message: error?.message || 'something went wrong' }, error?.status || 500);
    }
  };

  static logOut = async (c: Context) => {
    try {
      // User data should be available from authMiddleware if this route is protected
      const userAuthData = c.get('user') as any; // Cast to any or UserContextData
      if (!userAuthData) {
        // This case might indicate an issue if logout is always for authenticated users
        return c.json({ message: "User not authenticated or session expired" }, 401);
      }

      // The original logic for findUser in logout seems redundant if authMiddleware already verified the user.
      // However, if it's a strict check against the DB based on full user object (including potentially hashed password):
      // const findUser = await User.findOne({ email: userAuthData.email /*, password: userAuthData.password */ }).exec();
      // if (!findUser) {
      //   return c.json({ message: "User doesn't exist" }, 409);
      // }
      // For simplicity, if authMiddleware ran, we assume user is valid.

      c.cookie('Authorization', '', {
        maxAge: 0,
        httpOnly: true,
        path: '/',
      });
      // Returning some data, though often logout might just return a success message.
      return c.json({ message: 'logout successful' }, 200);
    } catch (error: any) {
      console.error('LogOut Error:', error);
      return c.json({ message: error?.message || 'something went wrong' }, error?.status || 500);
    }
  };

  static createToken(id: string, email: string, role: string, firstName: string) {
    const dataStoredInToken = { id, email, role, firstName };
    const secretKey: string = Keys.SECRET_KEY;
    const expiresIn: number | string = Keys.TOKEN_EXPIRES_IN; // e.g., '1h' or 3600 (seconds)

    return {
      expiresIn: expiresIn, // Return the original value for maxAge calculation
      token: sign(dataStoredInToken, secretKey, { expiresIn }),
    };
  }

  // createCookie method is no longer needed as c.cookie() is used directly.

  static decode = (token: string) => {
    try {
      const payload = verify(token, Keys.SECRET_KEY);
      return payload;
    } catch (error) {
      // Handle invalid token, expired token etc.
      console.error("Token decode error:", error);
      return null; // Or throw an error
    }
  };

  static async forgettingPassword(c: Context) {
    try {
      let { email } = await c.req.json() as { email: string };
      email = email.toLowerCase().trim();
      const user = await User.findOne({ email });
      if (!user) {
        return c.json({ message: 'user not found, signup' }, 409);
      }

      const { token } = AuthController.createToken(
        user._id.toString(),
        user.email,
        user.role,
        user.firstName,
      );
      const messageContent = emailMocks.forgetPassword(token); // Renamed variable to avoid conflict
      const subject = 'Reset Password';
      sendEmail(user.email, subject, messageContent);
      return c.json({ message: 'check your email' }, 200);
    } catch (error: any) {
      console.error('ForgettingPassword Error:', error);
      return c.json({ message: error?.message || 'something went wrong' }, error?.status || 500);
    }
  }

  static async resetingPassword(c: Context) {
    try {
      const { password, token } = await c.req.json();
      const decoded: any = AuthController.decode(token);
      if (!decoded || !decoded.id) {
        return c.json({ message: 'Invalid or expired token' }, 400);
      }
      const { id } = decoded;
      let user = await User.findById(id);
      if (!user) {
        return c.json({ message: 'user not found, signup' }, 409);
      }
      const hashPassword = await hash(password, 10); // bcryptjs hash takes salt rounds, not 12. Default is 10.

      user.set({ password: hashPassword });
      user = await user.save();
      return c.json({ message: 'password updated' }, 200); // Changed to 200 OK
    } catch (error: any) {
      console.error('ResetingPassword Error:', error);
      return c.json({ message: error?.message || 'something went wrong' }, error?.status || 500);
    }
  }

  static async confirmAccount(c: Context) {
    try {
      const { token } = await c.req.json();
      const decodedToken: any = decode(token); // Using decode from jsonwebtoken, not custom one.
                                            // verify might be better if signature check is needed here too.
      if (!decodedToken || !decodedToken.id) {
        return c.json({ message: 'Your verification link may have expired or is invalid.' }, 400);
      }
      let user = await User.findById(decodedToken.id);
      if (!user) {
        return c.json({ message: 'user not found, signup first' }, 401);
      }

      if (user.verified) {
        return c.json({ message: 'user already verified, login', data: user }, 200);
      } else {
        user.verified = true;
        user = await user.save();
        return c.json({ message: 'verified successfully', data: user }, 200);
      }
    } catch (err: any) {
      console.error('ConfirmAccount Error:', err);
      // Check if err has status and message, otherwise provide generic response
      const message = err.message || 'something went wrong';
      const status = err.status || 500;
      return c.json({ message }, status);
    }
  }

  static generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export default AuthController;
