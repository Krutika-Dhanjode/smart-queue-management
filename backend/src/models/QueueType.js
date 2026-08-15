const { query } = require('../config/database');

class QueueTypeModel {
  static async create({ queueId, name, description, capacity }) {
    const result = await query(
      `INSERT INTO queue_types (queue_id, name, description, capacity, status)
       VALUES ($1, $2, $3, $4, 'OPEN')
       RETURNING *`,
      [queueId, name, description, capacity || 100]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT * FROM queue_types WHERE id = $1', [id]);
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
