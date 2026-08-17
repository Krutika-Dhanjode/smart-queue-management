const { query } = require('../config/database');
const crypto = require('crypto');

class QueueTypeModel {
  static generatePublicCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SQ-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static generateAdminCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async create({ queueId, name, description, capacity }) {
    const publicCode = this.generatePublicCode();
    const adminCode = this.generateAdminCode();
    const adminCodeHash = crypto.createHash('sha256').update(adminCode).digest('hex');

    const result = await query(
      `INSERT INTO queue_types (queue_id, name, description, capacity, status, public_code, admin_code_hash)
       VALUES ($1, $2, $3, $4, 'OPEN', $5, $6)
       RETURNING *`,
      [queueId, name, description, capacity || 100, publicCode, adminCodeHash]
    );
    return { ...result.rows[0], adminCode };
  }

  static async findById(id) {
    const result = await query('SELECT * FROM queue_types WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByPublicCode(publicCode) {
    const result = await query('SELECT * FROM queue_types WHERE public_code = $1', [publicCode]);
    return result.rows[0];
  }

  static async findByPublicCodeAndAdminCode(publicCode, adminCode) {
    const adminCodeHash = crypto.createHash('sha256').update(adminCode).digest('hex');
    const result = await query(
      'SELECT * FROM queue_types WHERE public_code = $1 AND admin_code_hash = $2',
      [publicCode, adminCodeHash]
    );
    return result.rows[0];
  }

  static async findByQueueId(queueId) {
    const result = await query(
      'SELECT * FROM queue_types WHERE queue_id = $1 ORDER BY created_at',
      [queueId]
    );
    return result.rows;
  }

  static async updateName(id, name) {
    const result = await query(
      'UPDATE queue_types SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, id]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const result = await query(
      'UPDATE queue_types SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await query('DELETE FROM queue_types WHERE id = $1', [id]);
  }

  static async getNextTokenNumber(queueTypeId, client) {
    const executor = client || query;
    const result = await executor(
      `UPDATE queue_types
       SET last_token_number = last_token_number + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING last_token_number`,
      [queueTypeId]
    );
    return result.rows[0]?.last_token_number;
  }

  static async getCurrentCount(queueTypeId) {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM queue_members
       WHERE queue_type_id = $1 AND status IN ('WAITING', 'SERVING')`,
      [queueTypeId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = QueueTypeModel;
