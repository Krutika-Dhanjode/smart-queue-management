const QueueMemberModel = require('../models/QueueMember');
const QueueTypeModel = require('../models/QueueType');
const { query } = require('../config/database');

class AnalyticsService {
  async getQueueAnalytics(queueTypeId) {
    const stats = await QueueMemberModel.getAnalytics(queueTypeId);
    const queueType = await QueueTypeModel.findById(queueTypeId);

    return {
      queueType,
      totalJoined: parseInt(stats.total_joined) || 0,
      currentlyWaiting: parseInt(stats.currently_waiting) || 0,
      served: parseInt(stats.served) || 0,
      skipped: parseInt(stats.skipped) || 0,
      removed: parseInt(stats.removed) || 0,
      avgWaitingTime: parseFloat(stats.avg_waiting_time) || 0,
      avgServiceTime: parseFloat(stats.avg_service_time) || 0,
      maxWaitingTime: parseInt(stats.max_waiting_time) || 0,
    };
  }

  async getHourlyStats(queueTypeId) {
    const result = await query(
      `SELECT
         EXTRACT(HOUR FROM joined_at) as hour,
         COUNT(*) as count,
         AVG(waiting_duration) as avg_wait
       FROM queue_members
       WHERE queue_type_id = $1
       GROUP BY EXTRACT(HOUR FROM joined_at)
       ORDER BY hour`,
      [queueTypeId]
    );
    return result.rows;
  }

  async getStatusDistribution(queueTypeId) {
    const result = await query(
      `SELECT
         status,
         COUNT(*) as count
       FROM queue_members
       WHERE queue_type_id = $1
       GROUP BY status`,
      [queueTypeId]
    );
    return result.rows;
  }

  async getDailyStats(queueId) {
    const result = await query(
      `SELECT
         qm.joined_at::date as date,
         COUNT(*) as total_joined,
         COUNT(CASE WHEN qm.status = 'SERVED' THEN 1 END) as served,
         AVG(qm.waiting_duration) as avg_wait
       FROM queue_members qm
       JOIN queue_types qt ON qm.queue_type_id = qt.id
       WHERE qt.queue_id = $1
       GROUP BY qm.joined_at::date
       ORDER BY date DESC
       LIMIT 30`,
      [queueId]
    );
    return result.rows;
  }
}

module.exports = new AnalyticsService();
