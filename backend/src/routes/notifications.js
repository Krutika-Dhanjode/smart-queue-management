const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, NotificationController.getNotifications);
router.get('/unread-count', authenticate, NotificationController.getUnreadCount);
router.post('/read-all', authenticate, NotificationController.markAllRead);
router.post('/:notificationId/read', authenticate, NotificationController.markRead);

module.exports = router;
