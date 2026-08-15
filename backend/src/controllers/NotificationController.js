const NotificationService = require('../services/NotificationService');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const notifications = await NotificationService.getUserNotifications(req.user.id);
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req, res, next) {
    try {
      const { notificationId } = req.params;
      await NotificationService.markRead(notificationId);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req, res, next) {
    try {
      await NotificationService.markAllRead(req.user.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
