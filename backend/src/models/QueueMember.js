const { query, getClient } = require('../config/database');

class QueueMemberModel {
  static async create({ queueTypeId, userId, tokenNumber, name, email, phone, priority = 'NORMAL' }) {
    const result = await query(
      `INSERT INTO queue_members (queue_type_id, user_id, token_number, name, email, phone, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'WAITING')
       RETURNING *`,
      [queueTypeId, userId, tokenNumber, name, email, phone, priority]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT * FROM queue_members WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByQueueTypeAndToken(queueTypeId, tokenNumber) {
    const result = await query(
      'SELECT * FROM queue_members WHERE queue_type_id = $1 AND token_number = $2',
      [queueTypeId, tokenNumber]
    );
    return result.rows[0];
  }

  static async findActiveByUserAndQueueType(userId, queueTypeId) {
    const result = await query(
      `SELECT * FROM queue_members
       WHERE user_id = $1 AND queue_type_id = $2
       AND status IN ('WAITING', 'SERVING')`,
      [userId, queueTypeId]
    );
    return result.rows[0];
  }

  static async findActiveByQueueType(queueTypeId) {
    const result = await query(
      `SELECT * FROM queue_members
       WHERE queue_type_id = $1
       AND status IN ('WAITING', 'SERVING')
       ORDER BY
         CASE priority
           WHEN 'EMERGENCY' THEN 0
           WHEN 'APPOINTMENT' THEN 1
           WHEN 'NORMAL' THEN 2
         END,
         token_number ASC`,
      [queueTypeId]
    );
    return result.rows;
  }

  static async getWaitingMembers(queueTypeId) {
    const result = await query(
      `SELECT * FROM queue_members
       WHERE queue_type_id = $1 AND status = 'WAITING'
       ORDER BY token_number ASC`,
      [queueTypeId]
    );
    return result.rows;
  }

  static async getActiveCount(queueTypeId) {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM queue_members
       WHERE queue_type_id = $1 AND status IN ('WAITING', 'SERVING')`,
      [queueTypeId]
    );
    return parseInt(result.rows[0].count);
  }

  static async updateStatus(id, status, additionalFields = {}) {
    const fields = ['status = $1', 'updated_at = NOW()'];
    const values = [status];
    let paramIndex = 2;

    if (status === 'SERVING') {
      fields.push(`serving_at = NOW()`);
    } else if (status === 'SERVED') {
      fields.push(`served_at = NOW()`);
    } else if (status === 'SKIPPED') {
      fields.push(`skipped_at = NOW()`);
    } else if (status === 'REMOVED') {
      fields.push(`removed_at = NOW()`);
    }

    if (additionalFields.waiting_duration !== undefined) {
      fields.push(`waiting_duration = $${paramIndex++}`);
      values.push(additionalFields.waiting_duration);
    }
    if (additionalFields.service_duration !== undefined) {
      fields.push(`service_duration = $${paramIndex++}`);
      values.push(additionalFields.service_duration);
    }

    values.push(id);
    const result = await query(
      `UPDATE queue_members SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async getServedCount(queueTypeId) {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM queue_members
       WHERE queue_type_id = $1 AND status = 'SERVED'`,
      [queueTypeId]
    );
    return parseInt(result.rows[0].count);
  }

  static async undoServe(id) {
    const result = await query(
      `UPDATE queue_members SET status = 'WAITING', served_at = NULL, serving_at = NULL, waiting_duration = NULL, service_duration = NULL, updated_at = NOW() WHERE id = $1 AND status = 'SERVED' RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async getSkippedCount(queueTypeId) {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM queue_members
       WHERE queue_type_id = $1 AND status = 'SKIPPED'`,
      [queueTypeId]
    );
    return parseInt(result.rows[0].count);
  }

  static async getRemovedCount(queueTypeId) {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM queue_members
       WHERE queue_type_id = $1 AND status = 'REMOVED'`,
      [queueTypeId]
    );
    return parseInt(result.rows[0].count);
  }

  static async getPosition(queueTypeId, memberId) {
    const member = await this.findById(memberId);
    if (!member) return null;

    const result = await query(
      `SELECT COUNT(*) as position
       FROM queue_members
       WHERE queue_type_id = $1
       AND status IN ('WAITING', 'SERVING')
       AND token_number < $2`,
      [queueTypeId, member.token_number]
    );
    return parseInt(result.rows[0].position) + 1;
  }

  static async getAllMembers(queueTypeId) {
    const result = await query(
      `SELECT * FROM queue_members
       WHERE queue_type_id = $1
       ORDER BY
         CASE status
           WHEN 'SERVING' THEN 0
           WHEN 'WAITING' THEN 1
           WHEN 'SKIPPED' THEN 2
           WHEN 'SERVED' THEN 3
           WHEN 'REMOVED' THEN 4
           WHEN 'LEFT' THEN 5
         END,
         token_number ASC`,
      [queueTypeId]
    );
    return result.rows;
  }

  static async getAnalytics(queueTypeId) {
    const result = await query(
      `SELECT
         COUNT(*) as total_joined,
         COUNT(CASE WHEN status IN ('WAITING', 'SERVING') THEN 1 END) as currently_waiting,
         COUNT(CASE WHEN status = 'SERVED' THEN 1 END) as served,
         COUNT(CASE WHEN status = 'SKIPPED' THEN 1 END) as skipped,
         COUNT(CASE WHEN status = 'REMOVED' THEN 1 END) as removed,
         AVG(CASE WHEN status = 'SERVED' THEN waiting_duration END) as avg_waiting_time,
         AVG(CASE WHEN status = 'SERVED' THEN service_duration END) as avg_service_time,
         MAX(CASE WHEN status = 'SERVED' THEN waiting_duration END) as max_waiting_time
       FROM queue_members
       WHERE queue_type_id = $1`,
      [queueTypeId]
    );
    return result.rows[0];
  }
}

module.exports = QueueMemberModel;
