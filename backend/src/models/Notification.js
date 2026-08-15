const { query } = require('../config/database');

class NotificationModel {
  static async create({ userId, queueId, type, title, message }) {
    const result = await query(
      `INSERT INTO notifications (user_id, queue_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, queueId, type, title, message]
    );
    return result.rows[0];
  }

  static async getByUserId(userId, limit = 50) {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async markRead(id) {
    await query('UPDATE notifications SET read = TRUE WHERE id = $1', [id]);
  }

  static async markAllRead(userId) {
    await query('UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE', [userId]);
  }

  static async getUnreadCount(userId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = NotificationModel;
