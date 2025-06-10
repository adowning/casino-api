import { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
// HttpException might need to be adapted or replaced if it relies on Express features.
// For now, we assume it's a generic error class or replace its usage.
// import { HttpException } from '../exceptions/HttpException';
// RequestWithUser is no longer needed in the same way with Hono's context (c.set/c.get)
// import { RequestWithUser } from '../interfaces/auth.interface';
import Keys from '../keys';
import User from '../models/User'; // Assuming User model is Mongoose or similar
import Wallet from '../models/Wallet';
import Setting from '../models/Setting';

// Define a type for the user data we'll set in the context
// This replaces the need for RequestWithUser by providing type safety for c.get('user')
interface UserContextData {
  _id: string; // or mongoose.Types.ObjectId if using Mongoose
  // include other user properties you need from findUser
  role: string;
  token: string;
  balanceInCoin?: number;
  // Add other fields from the original req.user if they are used downstream
}

const authMiddleware = async (c: Context, next: Next) => {
  try {
    const cookieToken = c.req.cookie('Authorization');
    const headerToken = c.req.header('Authorization');
    let authorizationToken: string | null = null;

    if (cookieToken) {
      authorizationToken = cookieToken;
    } else if (headerToken) {
      authorizationToken = headerToken.startsWith('Bearer ') ? headerToken.split('Bearer ')[1] : null;
    }

    if (authorizationToken) {
      const secretKey: string = Keys.SECRET_KEY;
      const verificationResponse: any = verify(authorizationToken, secretKey); // Consider typing verificationResponse
      const userId = verificationResponse.id;

      const findUser = await User.findById(userId);

      if (findUser) {
        // Prepare user data to be set in context
        const userData: UserContextData = {
          _id: findUser._id.toString(), // Or however you access the id
          role: findUser.role,
          token: authorizationToken,
          // other properties from findUser as needed
        };

        c.set('user', userData); // Set the user object in Hono's context

        // The following logic for adminWallet, myWallet, globalSetting needs to be adapted.
        // This data can also be set into the context if needed by subsequent handlers.
        // For example: c.set('adminWallet', adminWalletData);

        try {
          const adminWallet = await Wallet.findOne({ isMain: true }).populate({
            path: 'user',
            match: { role: 'admin' }, // Assuming 'role' is directly on User
          });
          if (adminWallet) {
            c.set('adminWallet', adminWallet.toJSON());
          }
        } catch (error) {
          // It seems original code sets a default globalSetting here, which might be incorrect.
          // Let's assume globalSetting is primarily for coinToRwf.
          // c.set('globalSetting', { coinToRwf: 1 }); // Default if adminWallet fetch fails?
          console.log('Error fetching admin wallet:', error.message);
        }

        try {
          let myWallet = await Wallet.findOne({ user: userId }).populate('user');
          if (!myWallet && userId) {
            myWallet = await Wallet.create({ user: userId });
          }
          if (myWallet) {
            c.set('myWallet', myWallet.toJSON());
          }
        } catch (error) {
          console.log('Error fetching/creating user wallet:', error.message);
        }

        try {
          const globalSetting = await Setting.findOne({ isGlobal: true });
          if (globalSetting) {
            c.set('globalSetting', globalSetting.toJSON());
            const myWalletData = c.get('myWallet') as any; // Type assertion or proper typing needed
            const { balance = 0 } = myWalletData || {};
            const { coinToRwf = 1 } = globalSetting.toJSON() as any;

            // Update userData in context if balanceInCoin calculation is successful
            const currentUserData = c.get('user') as UserContextData;
            if (currentUserData) {
              currentUserData.balanceInCoin = balance / coinToRwf;
              c.set('user', currentUserData);
            }
          } else {
            // Default if no global setting found
            const currentUserData = c.get('user') as UserContextData;
            if (currentUserData) {
              const myWalletData = c.get('myWallet') as any;
              currentUserData.balanceInCoin = (myWalletData?.balance || 0) / 1; // Default coinToRwf = 1
              c.set('user', currentUserData);
            }
          }
        } catch (error) {
          console.log('Error fetching global settings or calculating balanceInCoin:', error.message);
          // Fallback for balanceInCoin
           const currentUserData = c.get('user') as UserContextData;
           if (currentUserData) {
             const myWalletData = c.get('myWallet') as any;
             currentUserData.balanceInCoin = (myWalletData?.balance || 0) / 1; // Default coinToRwf = 1
             c.set('user', currentUserData);
           }
        }

        await next();
      } else {
        return c.json({ message: 'Wrong authentication token' }, 401);
      }
    } else {
      return c.json({ message: 'Authentication token missing' }, 401); // Changed status to 401 as 404 seems incorrect
    }
  } catch (error) {
    // Log the actual error for server-side debugging
    console.error("Authentication error:", error);
    return c.json({ message: 'Wrong authentication token' }, 401);
  }
};

export const allowedRoles = async (c: Context, next: Next) => {
  try {
    const user = c.get('user') as UserContextData | undefined; // Retrieve user from context

    if (!user) {
      // This case should ideally be caught by authMiddleware first
      return c.json({ message: 'You are not authenticated' }, 404);
    }

    const { role } = user;
    if (!['admin'].includes(role)) {
      return c.json({ message: 'You are not authorized' }, 403); // 403 Forbidden is more appropriate
    }
    await next();
  } catch (error) {
    // Log the actual error
    console.error("Authorization error:", error);
    // Using HttpException structure if it's defined and compatible, otherwise generic error
    // const status = error.status || 500;
    // const message = error.message || 'Something went wrong';
    // return c.json({ message }, status);
    return c.json({ message: 'An internal server error occurred' }, 500);
  }
};

export default authMiddleware;
