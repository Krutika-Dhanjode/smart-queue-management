const { query } = require('../config/database');

class OTPModel {
  static async create(userId, otpCode, expiresInMinutes = 10) {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const result = await query(
      `INSERT INTO otps (user_id, otp_code, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, expires_at`,
      [userId, otpCode, expiresAt]
    );
    return result.rows[0];
  }

  static async findValidOTP(userId, otpCode) {
    const result = await query(
      `SELECT * FROM otps
       WHERE user_id = $1 AND otp_code = $2
       AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, otpCode]
    );
    return result.rows[0];
  }

  static async markUsed(id) {
    await query('UPDATE otps SET used = TRUE WHERE id = $1', [id]);
  }

  static async incrementAttempts(id) {
    const result = await query(
      'UPDATE otps SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
      [id]
    );
    return result.rows[0]?.attempts;
  }

  static async invalidatePrevious(userId) {
    await query(
      'UPDATE otps SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [userId]
    );
  }

  static async getRecentOTPCount(userId, minutes = 10) {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM otps
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${minutes} minutes'`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = OTPModel;
