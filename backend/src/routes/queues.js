const express = require('express');
const router = express.Router();
const QueueController = require('../controllers/QueueController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, QueueController.createQueue);
router.post('/:queueId/sub-queues', authenticate, QueueController.addSubQueue);
router.get('/admin', authenticate, QueueController.getAdminQueues);
router.post('/admin-access', QueueController.joinByAdminCode);
router.post('/sub-admin-access', QueueController.joinBySubAdminCode);

router.get('/public/sub/:subCode', QueueController.getPublicSubQueueInfo);
router.get('/public/:publicCode', QueueController.getPublicQueueInfo);
router.get('/member/mine', authenticate, QueueController.getMyMemberships);
router.post('/member/:memberId/skip-self', authenticate, QueueController.skipSelf);
router.get('/member/:memberId/status', authenticate, QueueController.getMemberStatus);
router.get('/member/:memberId/position', authenticate, QueueController.getMemberPosition);

router.get('/sub/:subCode', QueueController.getSubQueueByCode);
router.post('/join-sub/:subCode', authenticate, QueueController.joinBySubCode);
router.post('/join/:publicCode', authenticate, QueueController.joinQueue);

router.get('/:queueId/types', QueueController.getQueueWithTypes);
router.get('/:queueTypeId/members', QueueController.getMembersByType);

router.post('/:queueTypeId/members/:memberId/serve', authenticate, QueueController.serveToken);
router.post('/:queueTypeId/members/:memberId/complete', authenticate, QueueController.completeToken);
router.post('/:queueTypeId/members/:memberId/undo-serve', authenticate, QueueController.undoServe);
router.post('/:queueTypeId/members/:memberId/skip', authenticate, QueueController.skipToken);
router.post('/:queueTypeId/members/:memberId/remove', authenticate, QueueController.removeToken);
router.post('/member/:memberId/leave', authenticate, QueueController.leaveQueue);

router.post('/:queueId/break', authenticate, QueueController.startBreak);
router.post('/:queueId/resume', authenticate, QueueController.endBreak);
router.post('/:queueId/end', authenticate, QueueController.endQueue);
router.delete('/:queueId', authenticate, QueueController.deleteQueue);

router.get('/:queueTypeId/analytics', authenticate, QueueController.getAnalytics);
router.get('/:queueId/analytics/all', authenticate, QueueController.getQueueAnalytics);
router.get('/:queueTypeId/completed', authenticate, QueueController.getCompletedMembers);
router.get('/:queueTypeId/rejected', authenticate, QueueController.getRejectedMembers);

router.get('/:publicCode', QueueController.getQueue);

module.exports = router;
