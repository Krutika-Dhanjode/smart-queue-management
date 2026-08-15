const EligibilityService = require('../services/EligibilityService');

class EligibilityController {
  async uploadFile(req, res, next) {
    try {
      const { queueId } = req.params;
      const result = await EligibilityService.uploadEligibilityFile(queueId, req.file);
      res.json({
        message: 'Eligibility file uploaded successfully',
        recordCount: result.recordCount,
      });
    } catch (error) {
      next(error);
    }
  }

  async checkEligibility(req, res, next) {
    try {
      const { queueId } = req.params;
      const { name, email, phone } = req.body;
      const result = await EligibilityService.checkEligibility(queueId, { name, email, phone });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getRecords(req, res, next) {
    try {
      const { queueId } = req.params;
      const records = await EligibilityService.getEligibilityRecords(queueId);
      res.json({ records });
    } catch (error) {
      next(error);
    }
  }

  async deleteRecords(req, res, next) {
    try {
      const { queueId } = req.params;
      await EligibilityService.deleteEligibilityRecords(queueId);
      res.json({ message: 'Eligibility records deleted' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EligibilityController();
