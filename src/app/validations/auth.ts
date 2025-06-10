import { Context, Next } from 'hono';
import joi from 'joi';

export default class AuthValidate {
  static async login(c: Context, next: Next) {
    const schema = joi.object().keys({
      email: joi.string().required().email(),
      password: joi.string().required(),
    });
    // Using c.req.json() as per instruction, assuming Content-Type: application/json
    // If x-www-form-urlencoded is also possible, c.req.parseBody() would be more robust.
    const body = await c.req.json();
    const { error } = schema.validate(body);
    if (error) {
      return c.json({
        message: error.details[0].message.replace(/"/g, ''),
      }, 400);
    }
    await next();
  }

  static async signup(c: Context, next: Next) {
    const schema = joi.object().keys({
      firstName: joi.string().required(),
      lastName: joi.string().allow('').optional(), // Made optional and allow empty string
      phoneNumber: joi.string().allow('').optional(), // Made optional and allow empty string
      email: joi.string().required().email(),
      password: joi.string().required(),
      referralCode: joi.string().min(6).max(6).optional(), // Made optional
    });
    const body = await c.req.json();
    const { error } = schema.validate(body);
    if (error) {
      return c.json({
        message: error.details[0].message.replace(/"/g, ''),
      }, 400);
    }
    await next();
  }

  static async update(c: Context, next: Next) {
    const schema = joi.object().keys({
      firstName: joi.string().optional(),
      lastName: joi.string().optional(),
      email: joi.string().email().optional(),
      password: joi.string().optional(),
      role: joi.valid('user', 'admin', 'manager').optional(),
      verified: joi.boolean().optional(),
      phoneNumber: joi.string().optional(),
    });
    const body = await c.req.json();
    const { error } = schema.validate(body);
    if (error) {
      return c.json({
        message: error.details[0].message.replace(/"/g, ''),
      }, 400);
    }
    await next();
  }

  static async resetPassword(c: Context, next: Next) {
    const schema = joi.object().keys({
      password: joi.string().min(8).required(),
      token: joi.string().required(),
    });
    const body = await c.req.json();
    const { error } = schema.validate(body);
    if (error) {
      return c.json({
        message: error.details[0].message.replace(/"/g, ''),
      }, 400);
    }
    await next();
  }

  static async forgetPassword(c: Context, next: Next) {
    const schema = joi.object().keys({
      // Assuming email is optional or can be empty as per .allow('')
      email: joi.string().email().allow('').optional(),
    });
    const body = await c.req.json();
    const { error } = schema.validate(body);
    if (error) {
      return c.json({
        message: error.details[0].message.replace(/"/g, ''),
      }, 400);
    }
    await next();
  }

  static async verify(c: Context, next: Next) {
    const schema = joi.object().keys({
      // Assuming token is optional or can be empty as per .allow('')
      token: joi.string().allow('').optional(),
    });
    const body = await c.req.json();
    const { error } = schema.validate(body);
    if (error) {
      return c.json({
        message: error.details[0].message.replace(/"/g, ''),
      }, 400);
    }
    await next();
  }
}
