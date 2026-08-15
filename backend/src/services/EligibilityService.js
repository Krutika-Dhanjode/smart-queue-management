const EligibilityModel = require('../models/Eligibility');
const xlsx = require('xlsx');

class EligibilityService {
  async uploadEligibilityFile(queueId, file) {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const records = data.map(row => ({
      name: row.Name || row.name || '',
      email: row.Email || row.email || '',
      phone: row.Phone || row.phone || row.Contact || row.contact || '',
      student_id: row['Student ID'] || row.student_id || row['StudentID'] || '',
      additional_data: row,
    }));

    await EligibilityModel.deleteByQueueId(queueId);
    await EligibilityModel.bulkCreate(queueId, records);

    return { recordCount: records.length };
  }

  async checkEligibility(queueId, { name, email, phone }) {
    const record = await EligibilityModel.checkEligibility(queueId, { name, email, phone });
    return {
      eligible: record ? record.eligible : false,
      record,
    };
  }

  async getEligibilityRecords(queueId) {
    return EligibilityModel.getByQueueId(queueId);
  }

  async deleteEligibilityRecords(queueId) {
    return EligibilityModel.deleteByQueueId(queueId);
  }
}

module.exports = new EligibilityService();
