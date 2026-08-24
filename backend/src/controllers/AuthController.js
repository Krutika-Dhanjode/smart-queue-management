const AuthService = require('../services/AuthService');
const config = require('../config');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;
      const result = await AuthService.register({ name, email, phone, password, role: 'USER' });
      res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        userId: result.userId,
        emailVerified: result.emailVerified,
        otpSent: result.otpSent,
      });
    } catch (error) {
      next(error);
    }
  }

  async registerAdmin(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;
      const result = await AuthService.register({ name, email, phone, password, role: 'ADMIN' });
      res.status(201).json({
        message: 'Admin registration successful. Please verify your email.',
        userId: result.userId,
        emailVerified: result.emailVerified,
        otpSent: result.otpSent,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req, res, next) {
    try {
      const { userId, otp } = req.body;
      const result = await AuthService.verifyOTP(userId, otp);

      const user = await require('../models/User').findById(userId);
      const token = AuthService.generateToken(user);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        message: 'Email verified successfully',
        token,
        user: AuthService.sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  }

  async resendOTP(req, res, next) {
    try {
      const { userId } = req.body;
      await AuthService.resendOTP(userId);
      res.json({ message: 'OTP resent successfully' });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        message: 'Login successful',
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res) {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  }

  async getMe(req, res, next) {
    try {
      const UserModel = require('../models/User');
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
