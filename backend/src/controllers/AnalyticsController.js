const AnalyticsService = require('../services/AnalyticsService');

class AnalyticsController {
  async getQueueAnalytics(req, res, next) {
    try {
      const { queueTypeId } = req.params;
      const analytics = await AnalyticsService.getQueueAnalytics(queueTypeId);
      res.json({ analytics });
    } catch (error) {
      next(error);
    }
  }

  async getHourlyStats(req, res, next) {
    try {
      const { queueTypeId } = req.params;
      const stats = await AnalyticsService.getHourlyStats(queueTypeId);
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }

  async getStatusDistribution(req, res, next) {
    try {
      const { queueTypeId } = req.params;
      const distribution = await AnalyticsService.getStatusDistribution(queueTypeId);
      res.json({ distribution });
    } catch (error) {
      next(error);
    }
  }

  async getDailyStats(req, res, next) {
    try {
      const { queueId } = req.params;
      const stats = await AnalyticsService.getDailyStats(queueId);
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
