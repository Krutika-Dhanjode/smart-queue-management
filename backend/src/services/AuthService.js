const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const UserModel = require('../models/User');
const OTPModel = require('../models/OTP');
const nodemailer = require('nodemailer');

class AuthService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async register({ name, email, phone, password, role = 'USER' }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ name, email, phone, passwordHash, role });

    const otp = this.generateOTP();
    await OTPModel.create(user.id, otp);
    console.log(`[OTP] ${email} => ${otp}`);

    if (config.nodeEnv !== 'test') {
      await this.sendOTPEmail(email, otp, name);
    }

    return { user, otpSent: true };
  }

  async verifyOTP(userId, otpCode) {
    const otpRecord = await OTPModel.findValidOTP(userId, otpCode);
    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      throw new Error('Too many attempts. Please request a new OTP.');
    }

    await OTPModel.markUsed(otpRecord.id);
    await UserModel.updateEmailVerified(userId);
    return { verified: true };
  }

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    if (!user.email_verified) {
      const otp = this.generateOTP();
      await OTPModel.invalidatePrevious(user.id);
      await OTPModel.create(user.id, otp);
      if (config.nodeEnv !== 'test') {
        await this.sendOTPEmail(user.email, otp, user.name);
      }
      return { user, emailVerified: false, otpSent: true };
    }

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token, emailVerified: true };
  }

  async resendOTP(userId) {
    const recentCount = await OTPModel.getRecentOTPCount(userId, 10);
    if (recentCount >= 3) {
      throw new Error('Too many OTP requests. Please wait before requesting again.');
    }

    await OTPModel.invalidatePrevious(userId);
    const user = await UserModel.findById(userId);
    const otp = this.generateOTP();
    await OTPModel.create(user.id, otp);

    if (config.nodeEnv !== 'test') {
      await this.sendOTPEmail(user.email, otp, user.name);
    }

    return { resent: true };
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  verifyToken(token) {
    return jwt.verify(token, config.jwt.secret);
  }

  sanitizeUser(user) {
    const { password_hash, ...safe } = user;
    return safe;
  }

  async sendOTPEmail(email, otp, name) {
    const mailOptions = {
      from: config.smtp.from,
      to: email,
      subject: 'Smart Queue - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Smart Queue Management</h2>
          <p>Hello ${name},</p>
          <p>Your verification OTP is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">${otp}</span>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send OTP email:', error.message);
    }
  }
}

module.exports = new AuthService();
