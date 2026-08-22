const { query } = require('../config/database');

class QueueCustomField {
  static async findByQueueId(queueId) {
    const result = await query(
      'SELECT * FROM queue_custom_fields WHERE queue_id = $1 ORDER BY sort_order ASC',
      [queueId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM queue_custom_fields WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create({ queueId, fieldName, fieldType, fieldOptions, required, sortOrder }) {
    const result = await query(
      `INSERT INTO queue_custom_fields (queue_id, field_name, field_type, field_options, required, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [queueId, fieldName, fieldType || 'text', fieldOptions ? JSON.stringify(fieldOptions) : null, required || false, sortOrder || 0]
    );
    return result.rows[0];
  }

  static async update(id, { fieldName, fieldType, fieldOptions, required, sortOrder }) {
    const result = await query(
      `UPDATE queue_custom_fields SET
        field_name = COALESCE($2, field_name),
        field_type = COALESCE($3, field_type),
        field_options = COALESCE($4, field_options),
        required = COALESCE($5, required),
        sort_order = COALESCE($6, sort_order)
       WHERE id = $1 RETURNING *`,
      [id, fieldName, fieldType, fieldOptions ? JSON.stringify(fieldOptions) : null, required, sortOrder]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await query('DELETE FROM queue_custom_fields WHERE id = $1', [id]);
  }

  static async deleteByQueueId(queueId) {
    await query('DELETE FROM queue_custom_fields WHERE queue_id = $1', [queueId]);
  }

  static async bulkCreate(queueId, fields) {
    const created = [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const field = await this.create({
        queueId,
        fieldName: f.field_name || f.fieldName,
        fieldType: f.field_type || f.fieldType || 'text',
        fieldOptions: f.field_options || f.fieldOptions,
        required: f.required || false,
        sortOrder: i,
      });
      created.push(field);
    }
    return created;
  }
}

module.exports = QueueCustomField;
