const { query } = require('../config/database');

class UserModel {
  static async create({ name, email, phone, passwordHash, role = 'USER' }) {
    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, role, email_verified, created_at`,
      [name, email, phone, passwordHash, role]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT id, name, email, phone, role, photo_url, email_verified, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async updateEmailVerified(id, verified = true) {
    const result = await query(
      'UPDATE users SET email_verified = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email_verified',
      [verified, id]
    );
    return result.rows[0];
  }

  static async updatePassword(id, passwordHash) {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );
  }

  static async updatePhoto(id, photoUrl) {
    const result = await query(
      'UPDATE users SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, photo_url',
      [photoUrl, id]
    );
    return result.rows[0];
  }
}

module.exports = UserModel;
