const { query } = require('../config/database');

class EligibilityModel {
  static async bulkCreate(queueId, records) {
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    records.forEach((record) => {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      values.push(
        queueId,
        record.name,
        record.email || null,
        record.phone || null,
        record.student_id || null,
        record.additional_data ? JSON.stringify(record.additional_data) : null,
        record.eligible !== false
      );
    });

    const result = await query(
      `INSERT INTO eligibility_records (queue_id, name, email, phone, student_id, additional_data, eligible)
       VALUES ${placeholders.join(', ')}
       RETURNING id`,
      values
    );
    return result.rows;
  }

  static async checkEligibility(queueId, { name, email, phone }) {
    const result = await query(
      `SELECT * FROM eligibility_records
       WHERE queue_id = $1
       AND (
         LOWER(name) = LOWER($2)
         OR LOWER(email) = LOWER($3)
         OR phone = $4
       )`,
      [queueId, name, email, phone]
    );
    return result.rows[0];
  }

  static async getByQueueId(queueId) {
    const result = await query(
      'SELECT * FROM eligibility_records WHERE queue_id = $1 ORDER BY created_at',
      [queueId]
    );
    return result.rows;
  }

  static async deleteByQueueId(queueId) {
    await query('DELETE FROM eligibility_records WHERE queue_id = $1', [queueId]);
  }

  static async getRecordCount(queueId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM eligibility_records WHERE queue_id = $1',
      [queueId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = EligibilityModel;
