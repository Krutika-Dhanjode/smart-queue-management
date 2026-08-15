const NotificationModel = require('../models/Notification');

class NotificationService {
  async createNotification({ userId, queueId, type, title, message }) {
    return NotificationModel.create({ userId, queueId, type, title, message });
  }

  async getUserNotifications(userId, limit = 50) {
    return NotificationModel.getByUserId(userId, limit);
  }

  async markRead(notificationId) {
    return NotificationModel.markRead(notificationId);
  }

  async markAllRead(userId) {
    return NotificationModel.markAllRead(userId);
  }

  async getUnreadCount(userId) {
    return NotificationModel.getUnreadCount(userId);
  }

  async notifyTokenGenerated(userId, queueId, tokenNumber) {
    return this.createNotification({
      userId,
      queueId,
      type: 'TOKEN_GENERATED',
      title: 'Token Generated',
      message: `Your token #${tokenNumber} has been generated. Please wait for your turn.`,
    });
  }

  async notifyTurnApproaching(userId, queueId, tokenNumber, position) {
    return this.createNotification({
      userId,
      queueId,
      type: 'TURN_APPROACHING',
      title: 'Your Turn is Approaching',
      message: `Your token #${tokenNumber} is at position ${position}. Please be ready.`,
    });
  }

  async notifyBreakStarted(userId, queueId) {
    return this.createNotification({
      userId,
      queueId,
      type: 'BREAK_STARTED',
      title: 'Queue on Break',
      message: 'The queue is currently on break. Please wait.',
    });
  }

  async notifyBreakEnded(userId, queueId) {
    return this.createNotification({
      userId,
      queueId,
      type: 'BREAK_ENDED',
      title: 'Queue Resumed',
      message: 'The queue has resumed. Thank you for your patience.',
    });
  }

  async notifyQueueClosed(userId, queueId) {
    return this.createNotification({
      userId,
      queueId,
      type: 'QUEUE_CLOSED',
      title: 'Queue Closed',
      message: 'The queue has been closed. Thank you for visiting.',
    });
  }

  async notifyDocumentVerified(userId, queueId) {
    return this.createNotification({
      userId,
      queueId,
      type: 'DOCUMENT_VERIFIED',
      title: 'Document Verified',
      message: 'Your document has been verified successfully.',
    });
  }

  async notifyDocumentRejected(userId, queueId, reason) {
    return this.createNotification({
      userId,
      queueId,
      type: 'DOCUMENT_REJECTED',
      title: 'Document Rejected',
      message: `Your document was rejected: ${reason}`,
    });
  }
}

module.exports = new NotificationService();
