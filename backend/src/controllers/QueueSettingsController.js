const QueueSettings = require('../models/QueueSettings');
const QueueCustomField = require('../models/QueueCustomField');
const QueueModel = require('../models/Queue');
const QueueTypeModel = require('../models/QueueType');
const QueueMemberModel = require('../models/QueueMember');
const EligibilityModel = require('../models/Eligibility');
const DocumentModel = require('../models/Document');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

class QueueSettingsController {
  async getSettings(req, res, next) {
    try {
      const { queueId } = req.params;
      const settings = await QueueSettings.findByQueueId(queueId);
      const customFields = await QueueCustomField.findByQueueId(queueId);
      const docReqs = await DocumentModel.getRequirements(queueId);
      const eligibilityCount = await EligibilityModel.getRecordCount(queueId);

      res.json({
        settings: settings || {
          eligibility_enabled: false,
          documents_required: false,
          entry_limit_enabled: false,
          entry_limit: 100,
          schedule_enabled: false,
          custom_fields_enabled: false,
          skip_max_distance: 10,
        },
        customFields,
        documentRequirements: docReqs,
        eligibilityRecordCount: eligibilityCount,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const { queueId } = req.params;
      const settings = await QueueSettings.createOrUpdate(queueId, req.body);
      res.json({ message: 'Settings updated', settings });
    } catch (error) {
      next(error);
    }
  }

  async getCustomFields(req, res, next) {
    try {
      const { queueId } = req.params;
      const fields = await QueueCustomField.findByQueueId(queueId);
      res.json({ fields });
    } catch (error) {
      next(error);
    }
  }

  async addCustomField(req, res, next) {
    try {
      const { queueId } = req.params;
      const field = await QueueCustomField.create({ queueId, ...req.body });
      res.status(201).json({ message: 'Field added', field });
    } catch (error) {
      next(error);
    }
  }

  async updateCustomField(req, res, next) {
    try {
      const { fieldId } = req.params;
      const field = await QueueCustomField.update(fieldId, req.body);
      if (!field) return res.status(404).json({ error: 'Field not found' });
      res.json({ message: 'Field updated', field });
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomField(req, res, next) {
    try {
      const { fieldId } = req.params;
      await QueueCustomField.delete(fieldId);
      res.json({ message: 'Field deleted' });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateCustomFields(req, res, next) {
    try {
      const { queueId } = req.params;
      const { fields } = req.body;
      await QueueCustomField.deleteByQueueId(queueId);
      const created = await QueueCustomField.bulkCreate(queueId, fields);
      res.json({ message: 'Fields updated', fields: created });
    } catch (error) {
      next(error);
    }
  }

  async uploadEligibility(req, res, next) {
    try {
      const { queueId } = req.params;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      await EligibilityModel.deleteByQueueId(queueId);

      const records = rows.map(row => ({
        name: row.Name || row.name || row.NAME || '',
        email: row.Email || row.email || row.EMAIL || '',
        phone: row.Phone || row.phone || row.PHONE || row.Contact || row.contact || '',
        student_id: row['Student ID'] || row.student_id || row['Registration ID'] || row.registration_id || '',
        additional_data: row,
      }));

      await EligibilityModel.bulkCreate(queueId, records);

      fs.unlinkSync(req.file.path);

      res.json({
        message: 'Eligibility file uploaded',
        fileName: req.file.originalname,
        recordCount: records.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEligibilityInfo(req, res, next) {
    try {
      const { queueId } = req.params;
      const files = await query('SELECT * FROM eligibility_files WHERE queue_id = $1 ORDER BY created_at DESC', [queueId]);
      const count = await EligibilityModel.getRecordCount(queueId);
      res.json({ files: files.rows, recordCount: count });
    } catch (error) {
      next(error);
    }
  }

  async removeEligibility(req, res, next) {
    try {
      const { queueId } = req.params;
      await EligibilityModel.deleteByQueueId(queueId);
      await query('DELETE FROM eligibility_files WHERE queue_id = $1', [queueId]);
      res.json({ message: 'Eligibility data removed' });
    } catch (error) {
      next(error);
    }
  }

  async checkEligibility(req, res, next) {
    try {
      const { queueId } = req.params;
      const { name, email, phone, student_id } = req.body;
      const match = await QueueSettings.checkEligibility(queueId, { name, email, phone, student_id });
      res.json({ eligible: !!match, record: match || null });
    } catch (error) {
      next(error);
    }
  }

  async addDocumentRequirement(req, res, next) {
    try {
      const { queueId } = req.params;
      const { name, description, mandatory, accepted_types, max_file_size, verification_mode, match_fields, sort_order, queue_type_id } = req.body;

      let templatePath = null;
      let templateFileName = null;
      if (req.file) {
        templatePath = req.file.path;
        templateFileName = req.file.originalname;
      }

      const result = await query(
        `INSERT INTO document_requirements (queue_id, queue_type_id, name, description, mandatory, accepted_types, max_file_size, verification_mode, match_fields, sort_order, template_path, template_file_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [queueId, queue_type_id || null, name, description || '', mandatory !== false, accepted_types || 'JPG,PNG,PDF', max_file_size || 5242880, verification_mode || 'upload_only', match_fields ? JSON.stringify(match_fields) : null, sort_order || 0, templatePath, templateFileName]
      );

      res.status(201).json({ message: 'Document requirement added', requirement: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  async updateDocumentRequirement(req, res, next) {
    try {
      const { requirementId } = req.params;
      const { name, description, mandatory, accepted_types, max_file_size, verification_mode, match_fields, sort_order } = req.body;

      let templatePath = undefined;
      let templateFileName = undefined;
      if (req.file) {
        templatePath = req.file.path;
        templateFileName = req.file.originalname;
      }

      const result = await query(
        `UPDATE document_requirements SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          mandatory = COALESCE($4, mandatory),
          accepted_types = COALESCE($5, accepted_types),
          max_file_size = COALESCE($6, max_file_size),
          verification_mode = COALESCE($7, verification_mode),
          match_fields = COALESCE($8, match_fields),
          sort_order = COALESCE($9, sort_order),
          template_path = COALESCE($10, template_path),
          template_file_name = COALESCE($11, template_file_name)
         WHERE id = $1 RETURNING *`,
        [requirementId, name, description, mandatory, accepted_types, max_file_size, verification_mode, match_fields ? JSON.stringify(match_fields) : null, sort_order, templatePath, templateFileName]
      );

      if (!result.rows[0]) return res.status(404).json({ error: 'Requirement not found' });
      res.json({ message: 'Updated', requirement: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  async deleteDocumentRequirement(req, res, next) {
    try {
      const { requirementId } = req.params;
      await query('DELETE FROM document_requirements WHERE id = $1', [requirementId]);
      res.json({ message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  }

  async checkJoinRequirements(req, res, next) {
    try {
      const { queueId } = req.params;
      const { name, email, phone, student_id } = req.body;

      const settings = await QueueSettings.findByQueueId(queueId);
      const result = {
        eligible: true,
        requiresEligibility: false,
        requiresDocuments: false,
        documentRequirements: [],
        customFields: [],
        messages: [],
      };

      if (!settings) {
        const customFields = await QueueCustomField.findByQueueId(queueId);
        result.customFields = customFields;
        return res.json(result);
      }

      const scheduleCheck = await QueueSettings.checkSchedule(queueId);
      if (!scheduleCheck.open) {
        result.eligible = false;
        result.messages.push(scheduleCheck.message);
        return res.json(result);
      }

      const entryCheck = await QueueSettings.checkEntryLimit(queueId);
      if (!entryCheck) {
        result.eligible = false;
        result.messages.push('Queue capacity has been reached.');
        return res.json(result);
      }

      if (settings.eligibility_enabled) {
        result.requiresEligibility = true;
        const match = await QueueSettings.checkEligibility(queueId, { name, email, phone, student_id });
        if (!match) {
          result.eligible = false;
          result.messages.push('You are not eligible to join this queue.');
        }
      }

      if (settings.documents_required) {
        result.requiresDocuments = true;
        const { rows: docReqs } = await query(
          'SELECT * FROM document_requirements WHERE queue_id = $1 ORDER BY sort_order ASC',
          [queueId]
        );
        result.documentRequirements = docReqs.filter(d => d.mandatory).map(d => ({
          id: d.id,
          name: d.name,
          description: d.description,
          accepted_types: d.accepted_types,
          max_file_size: d.max_file_size,
          verification_mode: d.verification_mode,
        }));
      }

      if (settings.custom_fields_enabled) {
        result.customFields = await QueueCustomField.findByQueueId(queueId);
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QueueSettingsController();
