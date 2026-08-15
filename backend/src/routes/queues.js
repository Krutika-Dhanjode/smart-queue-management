const express = require('express');
const router = express.Router();
const QueueController = require('../controllers/QueueController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('ADMIN'), QueueController.createQueue);
router.get('/admin', authenticate, authorize('ADMIN'), QueueController.getAdminQueues);
router.get('/member/:memberId/position', QueueController.getMemberPosition);
router.post('/join/:publicCode', QueueController.joinQueue);
router.post('/admin-access', QueueController.joinByAdminCode);
router.get('/:publicCode', QueueController.getQueue);
router.get('/:queueId/types', QueueController.getQueueWithTypes);
router.get('/:queueTypeId/members', QueueController.getMembersByType);

router.post('/:queueTypeId/members/:memberId/serve', authenticate, authorize('ADMIN'), QueueController.serveToken);
router.post('/:queueTypeId/members/:memberId/complete', authenticate, authorize('ADMIN'), QueueController.completeToken);
router.post('/:queueTypeId/members/:memberId/skip', authenticate, authorize('ADMIN'), QueueController.skipToken);
router.post('/:queueTypeId/members/:memberId/remove', authenticate, authorize('ADMIN'), QueueController.removeToken);
router.post('/member/:memberId/leave', QueueController.leaveQueue);

router.post('/:queueId/break', authenticate, authorize('ADMIN'), QueueController.startBreak);
router.post('/:queueId/resume', authenticate, authorize('ADMIN'), QueueController.endBreak);
router.post('/:queueId/end', authenticate, authorize('ADMIN'), QueueController.endQueue);

router.get('/:queueTypeId/analytics', authenticate, authorize('ADMIN'), QueueController.getAnalytics);
router.get('/:queueId/analytics/all', authenticate, authorize('ADMIN'), QueueController.getQueueAnalytics);
router.get('/:queueTypeId/completed', authenticate, authorize('ADMIN'), QueueController.getCompletedMembers);
router.get('/:queueTypeId/rejected', authenticate, authorize('ADMIN'), QueueController.getRejectedMembers);

module.exports = router;
