const { query } = require('../config/database');

class DocumentModel {
  static async createRequirement({ queueId, name, description, mandatory }) {
    const result = await query(
      `INSERT INTO document_requirements (queue_id, name, description, mandatory)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [queueId, name, description, mandatory !== false]
    );
    return result.rows[0];
  }

  static async getRequirements(queueId) {
    const result = await query(
      'SELECT * FROM document_requirements WHERE queue_id = $1 ORDER BY created_at',
      [queueId]
    );
    return result.rows;
  }

  static async deleteRequirement(id) {
    await query('DELETE FROM document_requirements WHERE id = $1', [id]);
  }

  static async updateRequirement(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.mandatory !== undefined) {
      fields.push(`mandatory = $${paramIndex++}`);
      values.push(updates.mandatory);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE document_requirements SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async createDocument({ queueMemberId, documentRequirementId, userId, storagePath, fileName, fileType, fileSize }) {
    const result = await query(
      `INSERT INTO documents (queue_member_id, document_requirement_id, user_id, storage_path, file_name, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [queueMemberId, documentRequirementId, userId, storagePath, fileName, fileType, fileSize]
    );
    return result.rows[0];
  }

  static async updateVerification(id, { status, extractedName, confidence, rejectionReason, verifiedBy }) {
    const result = await query(
      `UPDATE documents
       SET verification_status = $1,
           extracted_name = $2,
           confidence = $3,
           rejection_reason = $4,
           verified_by = $5,
           verified_at = CASE WHEN $1 IN ('VERIFIED', 'REJECTED') THEN NOW() ELSE verified_at END,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [status, extractedName, confidence, rejectionReason, verifiedBy, id]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async getByQueueMember(queueMemberId) {
    const result = await query(
      `SELECT d.*, dr.name as requirement_name, dr.mandatory
       FROM documents d
       JOIN document_requirements dr ON d.document_requirement_id = dr.id
       WHERE d.queue_member_id = $1`,
      [queueMemberId]
    );
    return result.rows;
  }

  static async getAllDocuments(queueId) {
    const result = await query(
      `SELECT d.*, dr.name as requirement_name, qm.name as member_name, qm.token_number
       FROM documents d
       JOIN document_requirements dr ON d.document_requirement_id = dr.id
       JOIN queue_members qm ON d.queue_member_id = qm.id
       JOIN queue_types qt ON qm.queue_type_id = qt.id
       WHERE qt.queue_id = $1`,
      [queueId]
    );
    return result.rows;
  }
}

module.exports = DocumentModel;
