const QueueModel = require('../models/Queue');
const QueueTypeModel = require('../models/QueueType');
const QueueMemberModel = require('../models/QueueMember');
const QueueEventModel = require('../models/QueueEvent');
const NotificationModel = require('../models/Notification');
const { getRedis } = require('../config/redis');
const { query } = require('../config/database');

class QueueService {
  async createQueue({ name, date, capacity, createdBy, subQueues }) {
    const adminCode = this.generateAdminCode();
    const queue = await QueueModel.create({
      name,
      date,
      capacity,
      createdBy,
      adminCode,
    });

    if (subQueues && subQueues.length > 0) {
      for (const subQueue of subQueues) {
        await QueueTypeModel.create({
          queueId: queue.id,
          name: subQueue.name,
          description: subQueue.description,
          capacity: subQueue.capacity || capacity,
        });
      }
    }

    const types = await QueueTypeModel.findByQueueId(queue.id);

    await QueueEventModel.create({
      queueId: queue.id,
      actorId: createdBy,
      action: 'QUEUE_CREATED',
      entity: 'queue',
      entityId: queue.id,
      metadata: { name, date, capacity },
    });

    return { ...queue, adminCode, types };
  }

  async getQueue(publicCode) {
    const queue = await QueueModel.findByPublicCode(publicCode);
    if (!queue) {
      throw new Error('Queue not found');
    }
    return queue;
  }

  async getQueueWithTypes(queueId) {
    return QueueModel.getQueueWithTypes(queueId);
  }

  async getAdminQueues(adminId) {
    return QueueModel.findByCreatedBy(adminId);
  }

  async joinQueue({ publicCode, queueTypeId, name, email, phone, userId, priority }) {
    const queue = await QueueModel.findByPublicCode(publicCode);
    if (!queue) {
      throw new Error('Queue not found');
    }

    if (queue.status === 'CLOSED') {
      throw new Error('Queue is closed');
    }

    if (queue.status === 'FULL') {
      throw new Error('Queue is full');
    }

    const queueType = await QueueTypeModel.findById(queueTypeId);
    if (!queueType || queueType.queue_id !== queue.id) {
      throw new Error('Invalid sub-queue');
    }

    if (queueType.status !== 'OPEN') {
      throw new Error('Sub-queue is not accepting members');
    }

    if (userId) {
      const existing = await QueueMemberModel.findActiveByUserAndQueueType(userId, queueTypeId);
      if (existing) {
        throw new Error('You are already in this queue');
      }
    }

    const activeCount = await QueueMemberModel.getActiveCount(queueTypeId);
    if (activeCount >= queueType.capacity) {
      throw new Error('Sub-queue is full');
    }

    const tokenNumber = await QueueTypeModel.getNextTokenNumber(queueTypeId);

    const member = await QueueMemberModel.create({
      queueTypeId,
      userId,
      tokenNumber,
      name,
      email,
      phone,
      priority,
    });

    await QueueEventModel.create({
      queueId: queue.id,
      actorId: userId,
      action: 'TOKEN_GENERATED',
      entity: 'queue_member',
      entityId: member.id,
      metadata: { tokenNumber, queueType: queueType.name },
    });

    await this.updateRedisQueueState(queue.id, queueTypeId);

    return { member, queue, queueType };
  }

  async getMemberPosition(memberId) {
    const member = await QueueMemberModel.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const position = await QueueMemberModel.getPosition(member.queue_type_id, memberId);
    const queueType = await QueueTypeModel.findById(member.queue_type_id);
    const activeMembers = await QueueMemberModel.findActiveByQueueType(member.queue_type_id);
    const currentServing = activeMembers.find(m => m.status === 'SERVING');
    const peopleAhead = position - 1;

    return {
      member,
      position,
      queueType,
      currentServing: currentServing?.token_number || null,
      peopleAhead,
    };
  }

  async serveToken(queueTypeId, memberId, adminId) {
    const member = await QueueMemberModel.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const updated = await QueueMemberModel.updateStatus(memberId, 'SERVING');

    const queueType = await QueueTypeModel.findById(queueTypeId);
    await QueueEventModel.create({
      queueId: queueType.queue_id,
      actorId: adminId,
      action: 'TOKEN_SERVED',
      entity: 'queue_member',
      entityId: memberId,
      metadata: { tokenNumber: member.token_number },
    });

    return updated;
  }

  async completeToken(queueTypeId, memberId, adminId) {
    const member = await QueueMemberModel.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const waitingDuration = member.serving_at
      ? Math.floor((Date.now() - new Date(member.serving_at).getTime()) / 1000)
      : 0;

    const serviceDuration = Math.floor(
      (Date.now() - new Date(member.serving_at || member.joined_at).getTime()) / 1000
    );

    const updated = await QueueMemberModel.updateStatus(memberId, 'SERVED', {
      waiting_duration: waitingDuration,
      service_duration: serviceDuration,
    });

    const queueType = await QueueTypeModel.findById(queueTypeId);
    await QueueEventModel.create({
      queueId: queueType.queue_id,
      actorId: adminId,
      action: 'TOKEN_COMPLETED',
      entity: 'queue_member',
      entityId: memberId,
      metadata: { tokenNumber: member.token_number, waitingDuration, serviceDuration },
    });

    await this.updateRedisQueueState(queueType.queue_id, queueTypeId);

    return updated;
  }

  async skipToken(queueTypeId, memberId, adminId) {
    const member = await QueueMemberModel.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const updated = await QueueMemberModel.updateStatus(memberId, 'SKIPPED');

    const queueType = await QueueTypeModel.findById(queueTypeId);
    await QueueEventModel.create({
      queueId: queueType.queue_id,
      actorId: adminId,
      action: 'TOKEN_SKIPPED',
      entity: 'queue_member',
      entityId: memberId,
      metadata: { tokenNumber: member.token_number },
    });

    if (member.user_id) {
      await NotificationModel.create({
        userId: member.user_id,
        queueId: queueType.queue_id,
        type: 'TOKEN_SKIPPED',
        title: 'Token Skipped',
        message: `Your token #${member.token_number} has been skipped.`,
      });
    }

    await this.updateRedisQueueState(queueType.queue_id, queueTypeId);

    return updated;
  }

  async removeToken(queueTypeId, memberId, adminId) {
    const member = await QueueMemberModel.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const updated = await QueueMemberModel.updateStatus(memberId, 'REMOVED');

    const queueType = await QueueTypeModel.findById(queueTypeId);
    await QueueEventModel.create({
      queueId: queueType.queue_id,
      actorId: adminId,
      action: 'TOKEN_REMOVED',
      entity: 'queue_member',
      entityId: memberId,
      metadata: { tokenNumber: member.token_number },
    });

    if (member.user_id) {
      await NotificationModel.create({
        userId: member.user_id,
        queueId: queueType.queue_id,
        type: 'TOKEN_REMOVED',
        title: 'Token Removed',
        message: `Your token #${member.token_number} has been removed from the queue.`,
      });
    }

    await this.updateRedisQueueState(queueType.queue_id, queueTypeId);

    return updated;
  }

  async leaveQueue(memberId, userId) {
    const member = await QueueMemberModel.findById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    if (member.user_id && userId && member.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await QueueMemberModel.updateStatus(memberId, 'LEFT');

    const queueType = await QueueTypeModel.findById(member.queue_type_id);
    await QueueEventModel.create({
      queueId: queueType.queue_id,
      actorId: userId,
      action: 'TOKEN_LEFT',
      entity: 'queue_member',
      entityId: memberId,
      metadata: { tokenNumber: member.token_number },
    });

    await this.updateRedisQueueState(queueType.queue_id, member.queue_type_id);

    return updated;
  }

  async startBreak(queueId, adminId, durationMinutes = 15) {
    const queue = await QueueModel.findById(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    const BreakModel = require('../models/Break');
    const breakRecord = await BreakModel.create({
      queueId,
      startedBy: adminId,
      durationMinutes,
    });

    await QueueModel.updateStatus(queueId, 'BREAK');

    await QueueEventModel.create({
      queueId,
      actorId: adminId,
      action: 'BREAK_STARTED',
      entity: 'break',
      entityId: breakRecord.id,
      metadata: { durationMinutes },
    });

    return breakRecord;
  }

  async endBreak(queueId, adminId) {
    const BreakModel = require('../models/Break');
    const activeBreak = await BreakModel.findActive(queueId);
    if (!activeBreak) {
      throw new Error('No active break');
    }

    await BreakModel.end(activeBreak.id);
    await QueueModel.updateStatus(queueId, 'OPEN');

    await QueueEventModel.create({
      queueId,
      actorId: adminId,
      action: 'BREAK_ENDED',
      entity: 'break',
      entityId: activeBreak.id,
    });

    return { ended: true };
  }

  async endQueue(queueId, adminId) {
    const queue = await QueueModel.findById(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    await QueueModel.updateStatus(queueId, 'CLOSED');

    await QueueEventModel.create({
      queueId,
      actorId: adminId,
      action: 'QUEUE_CLOSED',
      entity: 'queue',
      entityId: queueId,
    });

    return { closed: true };
  }

  async getAnalytics(queueTypeId) {
    return QueueMemberModel.getAnalytics(queueTypeId);
  }

  async getQueueAnalytics(queueId) {
    const types = await QueueTypeModel.findByQueueId(queueId);
    const analytics = [];

    for (const type of types) {
      const stats = await QueueMemberModel.getAnalytics(type.id);
      analytics.push({
        queueType: type,
        stats,
      });
    }

    return analytics;
  }

  async getCompletedMembers(queueTypeId) {
    const result = await query(
      `SELECT * FROM queue_members
       WHERE queue_type_id = $1 AND status = 'SERVED'
       ORDER BY served_at DESC`,
      [queueTypeId]
    );
    return result.rows;
  }

  async getRejectedMembers(queueTypeId) {
    const result = await query(
      `SELECT * FROM queue_members
       WHERE queue_type_id = $1 AND status IN ('SKIPPED', 'REMOVED')
       ORDER BY updated_at DESC`,
      [queueTypeId]
    );
    return result.rows;
  }

  async updateRedisQueueState(queueId, queueTypeId) {
    try {
      const redis = getRedis();
      const activeMembers = await QueueMemberModel.findActiveByQueueType(queueTypeId);

      const queueKey = `queue:${queueId}:active`;
      const typeKey = `queue:${queueId}:${queueTypeId}:active`;

      await redis.del(queueKey);
      await redis.del(typeKey);

      if (activeMembers.length > 0) {
        const members = activeMembers.map(m => JSON.stringify({
          id: m.id,
          token: m.token_number,
          name: m.name,
          status: m.status,
          priority: m.priority,
        }));
        await redis.rpush(typeKey, ...members);
        await redis.rpush(queueKey, ...members);
      }

      const currentServing = activeMembers.find(m => m.status === 'SERVING');
      if (currentServing) {
        await redis.set(`queue:${queueId}:${queueTypeId}:current`, currentServing.token_number);
      }

      await redis.set(`queue:${queueId}:${queueTypeId}:length`, activeMembers.length);
    } catch (error) {
      console.error('Redis update failed:', error);
    }
  }

  generateAdminCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = new QueueService();
