const { query } = require('../config/database');

class BreakModel {
  static async create({ queueId, startedBy, durationMinutes = 15 }) {
    const result = await query(
      `INSERT INTO breaks (queue_id, started_by, duration_minutes, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING *`,
      [queueId, startedBy, durationMinutes]
    );
    return result.rows[0];
  }

  static async findActive(queueId) {
    const result = await query(
      `SELECT * FROM breaks
       WHERE queue_id = $1 AND status = 'ACTIVE'
       ORDER BY started_at DESC
       LIMIT 1`,
      [queueId]
    );
    return result.rows[0];
  }

  static async end(id) {
    const result = await query(
      `UPDATE breaks SET status = 'ENDED', ended_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async getByQueueId(queueId, limit = 20) {
    const result = await query(
      `SELECT b.*, u.name as started_by_name
       FROM breaks b
       JOIN users u ON b.started_by = u.id
       WHERE b.queue_id = $1
       ORDER BY b.started_at DESC
       LIMIT $2`,
      [queueId, limit]
    );
    return result.rows;
  }
}

module.exports = BreakModel;
