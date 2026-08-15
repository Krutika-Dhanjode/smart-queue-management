const { query } = require('../config/database');

class QueueEventModel {
  static async create({ queueId, actorId, action, entity, entityId, metadata }) {
    const result = await query(
      `INSERT INTO queue_events (queue_id, actor_id, action, entity, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [queueId, actorId, action, entity, entityId, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0];
  }

  static async getByQueueId(queueId, limit = 100) {
    const result = await query(
      `SELECT qe.*, u.name as actor_name
       FROM queue_events qe
       LEFT JOIN users u ON qe.actor_id = u.id
       WHERE qe.queue_id = $1
       ORDER BY qe.created_at DESC
       LIMIT $2`,
      [queueId, limit]
    );
    return result.rows;
  }

  static async getByEntity(queueId, entity, entityId) {
    const result = await query(
      `SELECT qe.*, u.name as actor_name
       FROM queue_events qe
       LEFT JOIN users u ON qe.actor_id = u.id
       WHERE qe.queue_id = $1 AND qe.entity = $2 AND qe.entity_id = $3
       ORDER BY qe.created_at DESC`,
      [queueId, entity, entityId]
    );
    return result.rows;
  }
}

module.exports = QueueEventModel;
