const { query } = require('../config/database');
const crypto = require('crypto');

class QueueModel {
  static generatePublicCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'Q-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async create({ name, date, capacity, createdBy, adminCode }) {
    const publicCode = this.generatePublicCode();
    const adminCodeHash = crypto.createHash('sha256').update(adminCode).digest('hex');

    const result = await query(
      `INSERT INTO queues (name, public_code, admin_code_hash, date, capacity, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'OPEN', $6)
       RETURNING id, name, public_code, date, capacity, status, created_by, created_at`,
      [name, publicCode, adminCodeHash, date, capacity, createdBy]
    );
    return { ...result.rows[0], adminCode };
  }

  static async findByPublicCode(publicCode) {
    const result = await query(
      `SELECT q.*, u.name as admin_name
       FROM queues q
       JOIN users u ON q.created_by = u.id
       WHERE q.public_code = $1`,
      [publicCode]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT q.*, u.name as admin_name
       FROM queues q
       JOIN users u ON q.created_by = u.id
       WHERE q.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByAdminCode(publicCode, adminCode) {
    const adminCodeHash = crypto.createHash('sha256').update(adminCode).digest('hex');
    const result = await query(
      `SELECT q.*, u.name as admin_name
       FROM queues q
       JOIN users u ON q.created_by = u.id
       WHERE q.public_code = $1 AND q.admin_code_hash = $2`,
      [publicCode, adminCodeHash]
    );
    return result.rows[0];
  }

  static async findByCreatedBy(userId) {
    const result = await query(
      `SELECT q.*, u.name as admin_name
       FROM queues q
       JOIN users u ON q.created_by = u.id
       WHERE q.created_by = $1
       ORDER BY q.created_at DESC`,
      [userId]
    );
    const queues = result.rows;
    for (const queue of queues) {
      const typesResult = await query(
        'SELECT * FROM queue_types WHERE queue_id = $1 ORDER BY created_at',
        [queue.id]
      );
      queue.types = typesResult.rows;
    }
    return queues;
  }

  static async updateStatus(id, status) {
    const result = await query(
      'UPDATE queues SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  static async getQueueWithTypes(id) {
    const queue = await this.findById(id);
    if (!queue) return null;

    const typesResult = await query(
      'SELECT * FROM queue_types WHERE queue_id = $1 ORDER BY created_at',
      [id]
    );
    return { ...queue, types: typesResult.rows };
  }

  static async incrementCapacity(id) {
    const result = await query(
      'UPDATE queues SET capacity = capacity + 1, updated_at = NOW() WHERE id = $1 RETURNING capacity',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = QueueModel;
