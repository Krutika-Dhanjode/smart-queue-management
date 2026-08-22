const { query } = require('../config/database');

class QueueSettings {
  static async findByQueueId(queueId) {
    const result = await query(
      'SELECT * FROM queue_settings WHERE queue_id = $1',
      [queueId]
    );
    return result.rows[0] || null;
  }

  static async createOrUpdate(queueId, settings) {
    const {
      eligibility_enabled, documents_required, entry_limit_enabled, entry_limit,
      schedule_enabled, opens_at, closes_at, custom_fields_enabled, skip_max_distance,
      welcome_message, error_message
    } = settings;

    const opensAt = opens_at && opens_at !== '' ? opens_at : null;
    const closesAt = closes_at && closes_at !== '' ? closes_at : null;

    const result = await query(
      `INSERT INTO queue_settings (queue_id, eligibility_enabled, documents_required, entry_limit_enabled, entry_limit, schedule_enabled, opens_at, closes_at, custom_fields_enabled, skip_max_distance, welcome_message, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (queue_id) DO UPDATE SET
         eligibility_enabled = COALESCE($2, queue_settings.eligibility_enabled),
         documents_required = COALESCE($3, queue_settings.documents_required),
         entry_limit_enabled = COALESCE($4, queue_settings.entry_limit_enabled),
         entry_limit = COALESCE($5, queue_settings.entry_limit),
         schedule_enabled = COALESCE($6, queue_settings.schedule_enabled),
         opens_at = $7, closes_at = $8,
         custom_fields_enabled = COALESCE($9, queue_settings.custom_fields_enabled),
         skip_max_distance = COALESCE($10, queue_settings.skip_max_distance),
         welcome_message = COALESCE($11, queue_settings.welcome_message),
         error_message = COALESCE($12, queue_settings.error_message),
         updated_at = NOW()
       RETURNING *`,
      [queueId, eligibility_enabled, documents_required, entry_limit_enabled, entry_limit || 100,
       schedule_enabled, opensAt, closesAt, custom_fields_enabled, skip_max_distance || 10,
       welcome_message || null, error_message || null]
    );
    return result.rows[0];
  }

  static async delete(queueId) {
    await query('DELETE FROM queue_settings WHERE queue_id = $1', [queueId]);
  }

  static async checkEligibility(queueId, { name, email, phone, student_id }) {
    const result = await query(
      `SELECT * FROM eligibility_records
       WHERE queue_id = $1 AND eligible = TRUE AND (
         (email IS NOT NULL AND email ILIKE $2)
         OR (phone IS NOT NULL AND phone = $3)
         OR (student_id IS NOT NULL AND student_id ILIKE $4)
         OR (name ILIKE $5)
       ) LIMIT 1`,
      [queueId, email || '', phone || '', student_id || '', name || '']
    );
    return result.rows[0] || null;
  }

  static async checkEntryLimit(queueId) {
    const settings = await this.findByQueueId(queueId);
    if (!settings || !settings.entry_limit_enabled) return true;

    const { rows } = await query(
      `SELECT COUNT(*) as count FROM queue_members qm
       JOIN queue_types qt ON qm.queue_type_id = qt.id
       WHERE qt.queue_id = $1 AND qm.status IN ('WAITING', 'SERVING')`,
      [queueId]
    );
    return parseInt(rows[0].count) < settings.entry_limit;
  }

  static async checkSchedule(queueId) {
    const settings = await this.findByQueueId(queueId);
    if (!settings || !settings.schedule_enabled) return { open: true };

    const now = new Date();
    if (settings.opens_at && now < new Date(settings.opens_at)) {
      return { open: false, message: 'Queue is not open yet.' };
    }
    if (settings.closes_at && now > new Date(settings.closes_at)) {
      return { open: false, message: 'This queue is closed.' };
    }
    return { open: true };
  }
}

module.exports = QueueSettings;
