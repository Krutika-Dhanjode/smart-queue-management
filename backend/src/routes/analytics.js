const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/queue/:queueId/daily', authenticate, authorize('ADMIN'), AnalyticsController.getDailyStats);
router.get('/:queueTypeId', authenticate, authorize('ADMIN'), AnalyticsController.getQueueAnalytics);
router.get('/:queueTypeId/hourly', authenticate, authorize('ADMIN'), AnalyticsController.getHourlyStats);
router.get('/:queueTypeId/distribution', authenticate, authorize('ADMIN'), AnalyticsController.getStatusDistribution);

module.exports = router;
