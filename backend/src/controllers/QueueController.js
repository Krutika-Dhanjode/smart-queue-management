const QueueService = require('../services/QueueService');
const QueueMemberModel = require('../models/QueueMember');
const QueueTypeModel = require('../models/QueueType');
const QueueModel = require('../models/Queue');
const QRCode = require('qrcode');
const config = require('../config');
const { query } = require('../config/database');

class QueueController {
  async createQueue(req, res, next) {
    try {
      const { name, date, capacity, subQueues, settings, customFields } = req.body;
      const result = await QueueService.createQueue({
        name,
        date,
        capacity,
        createdBy: req.user.id,
        subQueues,
        settings,
        customFields,
      });

      const joinUrl = `${config.frontend.url}/join/${result.public_code}`;
      const qrCodeDataUrl = await QRCode.toDataURL(joinUrl);

      res.status(201).json({
        message: 'Queue created successfully',
        queue: {
          id: result.id,
          name: result.name,
          publicCode: result.public_code,
          adminCode: result.adminCode,
          date: result.date,
          capacity: result.capacity,
          status: result.status,
          joinUrl,
          qrCode: qrCodeDataUrl,
          types: result.types || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async addSubQueue(req, res, next) {
    try {
      const { queueId } = req.params;
      const { name, description, capacity } = req.body;
      const QueueTypeModel = require('../models/QueueType');
      const queue = await QueueModel.findById(queueId);
      if (!queue) {
        return res.status(404).json({ error: 'Organisation not found' });
      }
      if (queue.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const queueType = await QueueTypeModel.create({
        queueId: queue.id,
        name,
        description,
        capacity: capacity || queue.capacity,
      });
      res.status(201).json({
        message: 'Sub-queue added successfully',
        queueType,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueue(req, res, next) {
    try {
      const { publicCode } = req.params;
      const queue = await QueueService.getQueue(publicCode);
      res.json({ queue });
    } catch (error) {
      next(error);
    }
  }

  async getQueueWithTypes(req, res, next) {
    try {
      const { queueId } = req.params;
      const queue = await QueueService.getQueueWithTypes(queueId);
      if (!queue) {
        return res.status(404).json({ error: 'Queue not found' });
      }
      res.json({ queue });
    } catch (error) {
      next(error);
    }
  }

  async getAdminQueues(req, res, next) {
    try {
      const queues = await QueueService.getAdminQueues(req.user.id);
      res.json({ queues });
    } catch (error) {
      next(error);
    }
  }

  async joinQueue(req, res, next) {
    try {
      const { publicCode } = req.params;
      const { queueTypeId, name, email, phone, priority } = req.body;

      const result = await QueueService.joinQueue({
        publicCode,
        queueTypeId,
        name,
        email,
        phone,
        userId: req.user?.id,
        priority,
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`queue:${result.queue.id}`).emit('token:generated', {
          member: result.member,
          queueType: result.queueType,
        });
      }

      res.status(201).json({
        message: 'Successfully joined queue',
        member: result.member,
        queueType: result.queueType,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMemberPosition(req, res, next) {
    try {
      const { memberId } = req.params;
      const member = await QueueMemberModel.findById(memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      const queueType = await QueueTypeModel.findById(member.queue_type_id);
      const activeMembers = await QueueMemberModel.findActiveByQueueType(member.queue_type_id);
      const position = await QueueMemberModel.getPosition(member.queue_type_id, memberId);
      const currentServing = activeMembers.find(m => m.status === 'SERVING');
      res.json({
        member,
        members: activeMembers,
        position,
        queueType,
        queueId: queueType?.queue_id,
        currentServing: currentServing?.token_number || null,
        peopleAhead: position - 1,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembersByType(req, res, next) {
    try {
      const { queueTypeId } = req.params;
      const queueType = await QueueTypeModel.findById(queueTypeId);
      if (!queueType) {
        return res.status(404).json({ error: 'Queue type not found' });
      }
      const members = await QueueMemberModel.findActiveByQueueType(queueTypeId);
      res.json({ members, queueType });
    } catch (error) {
      next(error);
    }
  }

  async serveToken(req, res, next) {
    try {
      const { queueTypeId, memberId } = req.params;
      const member = await QueueService.serveToken(queueTypeId, memberId, req.user.id);

      const io = req.app.get('io');
      const queue = await QueueTypeModel.findById(queueTypeId);
      if (io && queue) {
        io.to(`queue:${queue.queue_id}`).emit('token:called', { member });
      }

      res.json({ message: 'Token being served', member });
    } catch (error) {
      next(error);
    }
  }

  async completeToken(req, res, next) {
    try {
      const { queueTypeId, memberId } = req.params;
      const member = await QueueService.completeToken(queueTypeId, memberId, req.user.id);

      const io = req.app.get('io');
      const queueType = await QueueTypeModel.findById(queueTypeId);
      if (io && queueType) {
        io.to(`queue:${queueType.queue_id}`).emit('token:completed', { member });
      }

      res.json({ message: 'Token completed', member });
    } catch (error) {
      next(error);
    }
  }

  async skipToken(req, res, next) {
    try {
      const { queueTypeId, memberId } = req.params;
      const member = await QueueService.skipToken(queueTypeId, memberId, req.user.id);

      const io = req.app.get('io');
      const queueType = await QueueTypeModel.findById(queueTypeId);
      if (io && queueType) {
        io.to(`queue:${queueType.queue_id}`).emit('token:skipped', { member });
      }

      res.json({ message: 'Token skipped', member });
    } catch (error) {
      next(error);
    }
  }

  async removeToken(req, res, next) {
    try {
      const { queueTypeId, memberId } = req.params;
      const member = await QueueService.removeToken(queueTypeId, memberId, req.user.id);

      const io = req.app.get('io');
      const queueType = await QueueTypeModel.findById(queueTypeId);
      if (io && queueType) {
        io.to(`queue:${queueType.queue_id}`).emit('token:removed', { member });
      }

      res.json({ message: 'Token removed', member });
    } catch (error) {
      next(error);
    }
  }

  async leaveQueue(req, res, next) {
    try {
      const { memberId } = req.params;
      const member = await QueueService.leaveQueue(memberId, req.user?.id);

      const io = req.app.get('io');
      const queueType = await QueueTypeModel.findById(member.queue_type_id);
      if (io && queueType) {
        io.to(`queue:${queueType.queue_id}`).emit('token:left', { member });
      }

      res.json({ message: 'Left queue successfully', member });
    } catch (error) {
      next(error);
    }
  }

  async startBreak(req, res, next) {
    try {
      const { queueId } = req.params;
      const { durationMinutes } = req.body;
      const breakRecord = await QueueService.startBreak(queueId, req.user.id, durationMinutes);

      const io = req.app.get('io');
      if (io) {
        io.to(`queue:${queueId}`).emit('queue:breakStarted', { break: breakRecord });
      }

      res.json({ message: 'Break started', break: breakRecord });
    } catch (error) {
      next(error);
    }
  }

  async endBreak(req, res, next) {
    try {
      const { queueId } = req.params;
      await QueueService.endBreak(queueId, req.user.id);

      const io = req.app.get('io');
      if (io) {
        io.to(`queue:${queueId}`).emit('queue:breakEnded');
      }

      res.json({ message: 'Break ended' });
    } catch (error) {
      next(error);
    }
  }

  async endQueue(req, res, next) {
    try {
      const { queueId } = req.params;
      await QueueService.endQueue(queueId, req.user.id);

      const io = req.app.get('io');
      if (io) {
        io.to(`queue:${queueId}`).emit('queue:closed');
      }

      res.json({ message: 'Queue closed' });
    } catch (error) {
      next(error);
    }
  }

  async deleteQueue(req, res, next) {
    try {
      const { queueId } = req.params;
      const queue = await QueueModel.findById(queueId);
      if (!queue) {
        return res.status(404).json({ error: 'Queue not found' });
      }
      if (queue.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      await QueueModel.delete(queueId);
      res.json({ message: 'Queue deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const { queueTypeId } = req.params;
      const analytics = await QueueService.getAnalytics(queueTypeId);
      res.json({ analytics });
    } catch (error) {
      next(error);
    }
  }

  async getQueueAnalytics(req, res, next) {
    try {
      const { queueId } = req.params;
      const analytics = await QueueService.getQueueAnalytics(queueId);
      res.json({ analytics });
    } catch (error) {
      next(error);
    }
  }

  async getCompletedMembers(req, res, next) {
    try {
      const { queueTypeId } = req.params;
      const members = await QueueService.getCompletedMembers(queueTypeId);
      res.json({ members });
    } catch (error) {
      next(error);
    }
  }

  async getRejectedMembers(req, res, next) {
    try {
      const { queueTypeId } = req.params;
      const members = await QueueService.getRejectedMembers(queueTypeId);
      res.json({ members });
    } catch (error) {
      next(error);
    }
  }

  async joinByAdminCode(req, res, next) {
    try {
      const { publicCode, adminCode } = req.body;
      const queue = await QueueModel.findByAdminCode(publicCode, adminCode);
      if (!queue) {
        return res.status(404).json({ error: 'Invalid admin code' });
      }
      const queueWithTypes = await QueueModel.getQueueWithTypes(queue.id);
      res.json({ queue: queueWithTypes });
    } catch (error) {
      next(error);
    }
  }

  async getSubQueueByCode(req, res, next) {
    try {
      const { subCode } = req.params;
      const QueueTypeModel = require('../models/QueueType');
      const subQueue = await QueueTypeModel.findByPublicCode(subCode);
      if (!subQueue) {
        return res.status(404).json({ error: 'Sub-queue not found' });
      }
      const queue = await QueueModel.findById(subQueue.queue_id);
      res.json({ queue, subQueue });
    } catch (error) {
      next(error);
    }
  }

  async joinBySubCode(req, res, next) {
    try {
      const { subCode } = req.params;
      const { name, email, phone, customData, student_id } = req.body;
      const QueueTypeModel = require('../models/QueueType');
      const subQueue = await QueueTypeModel.findByPublicCode(subCode);
      if (!subQueue) {
        return res.status(404).json({ error: 'Sub-queue not found' });
      }
      const queue = await QueueModel.findById(subQueue.queue_id);
      if (!queue) {
        return res.status(404).json({ error: 'Queue not found' });
      }

      const result = await QueueService.joinQueue({
        publicCode: queue.public_code,
        queueTypeId: subQueue.id,
        name, email, phone,
        userId: req.user?.id,
        customData: customData || (student_id ? { student_id } : undefined),
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`queue:${queue.id}`).emit('token:generated', { member: result.member, queueType: result.queueType });
      }

      res.status(201).json({
        message: 'Successfully joined queue',
        member: result.member,
        queueType: result.queueType,
        queue: result.queue,
      });
    } catch (error) {
      if (error.message === 'Queue is closed' || error.message === 'Queue capacity has been reached.' || error.message === 'You are not eligible to join this queue.' || error.message === 'Queue is not open yet.' || error.message === 'This queue is closed.') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async joinBySubAdminCode(req, res, next) {
    try {
      const { subCode, adminCode } = req.body;
      const QueueTypeModel = require('../models/QueueType');
      const subQueue = await QueueTypeModel.findByPublicCodeAndAdminCode(subCode, adminCode);
      if (!subQueue) {
        return res.status(404).json({ error: 'Invalid sub-queue code or admin code' });
      }
      const queue = await QueueModel.findById(subQueue.queue_id);
      const queueWithTypes = await QueueModel.getQueueWithTypes(queue.id);
      res.json({ queue: queueWithTypes, subQueue });
    } catch (error) {
      next(error);
    }
  }

  async getPublicSubQueueInfo(req, res, next) {
    try {
      const { subCode } = req.params;
      const QueueTypeModel = require('../models/QueueType');
      const QueueMemberModel = require('../models/QueueMember');
      const subQueue = await QueueTypeModel.findByPublicCode(subCode);
      if (!subQueue) {
        return res.status(404).json({ error: 'Sub-queue not found' });
      }
      const queue = await QueueModel.findById(subQueue.queue_id);
      if (!queue) {
        return res.status(404).json({ error: 'Queue not found' });
      }
      const activeMembers = await QueueMemberModel.findActiveByQueueType(subQueue.id);
      const currentServing = activeMembers.find(m => m.status === 'SERVING');
      const waitingMembers = activeMembers.filter(m => m.status === 'WAITING');
      const peopleWaiting = waitingMembers.length;
      const peopleAhead = currentServing ? peopleWaiting : peopleWaiting;
      const estimatedWait = peopleWaiting * 5;
      const docRequirements = await query(
        'SELECT id, name, description FROM document_requirements WHERE queue_id = $1',
        [queue.id]
      ).catch(() => ({ rows: [] }));
      const eligibilityCheck = await query(
        'SELECT COUNT(*) as count FROM eligibility_records WHERE queue_id = $1',
        [queue.id]
      ).catch(() => ({ rows: [{ count: 0 }] }));
      const queueTypes = await QueueTypeModel.findByQueueId(queue.id);
      const QueueSettingsModel = require('../models/QueueSettings');
      const settings = await QueueSettingsModel.findByQueueId(queue.id);
      res.json({
        queue: {
          name: queue.name,
          status: queue.status,
          date: queue.date,
        },
        subQueue: {
          name: subQueue.name,
          status: subQueue.status,
          publicCode: subQueue.public_code,
          capacity: subQueue.capacity,
        },
        liveStats: {
          currentlyServing: currentServing?.token_number || null,
          peopleWaiting,
          peopleAhead,
          estimatedWaitMinutes: estimatedWait,
          estimatedWaitRange: `${estimatedWait}-${estimatedWait + 5}`,
        },
        subQueues: queueTypes.map(t => ({
          name: t.name,
          publicCode: t.public_code,
          status: t.status,
        })),
        documentRequirements: docRequirements.rows || [],
        eligibilityEnabled: parseInt((eligibilityCheck.rows?.[0]?.count || 0)) > 0,
        settings: settings ? {
          welcome_message: settings.welcome_message,
          error_message: settings.error_message,
          eligibility_enabled: settings.eligibility_enabled,
          documents_required: settings.documents_required,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublicQueueInfo(req, res, next) {
    try {
      const { publicCode } = req.params;
      const queue = await QueueModel.findByPublicCode(publicCode);
      if (!queue) {
        return res.status(404).json({ error: 'Queue not found' });
      }
      const queueTypes = await QueueTypeModel.findByQueueId(queue.id);
      const typeStats = [];
      for (const qt of queueTypes) {
        const activeMembers = await QueueMemberModel.findActiveByQueueType(qt.id);
        const currentServing = activeMembers.find(m => m.status === 'SERVING');
        const peopleWaiting = activeMembers.filter(m => m.status === 'WAITING').length;
        typeStats.push({
          id: qt.id,
          name: qt.name,
          publicCode: qt.public_code,
          status: qt.status,
          capacity: qt.capacity,
          currentlyServing: currentServing?.token_number || null,
          peopleWaiting,
          estimatedWaitMinutes: peopleWaiting * 5,
        });
      }
      res.json({
        queue: {
          name: queue.name,
          status: queue.status,
          date: queue.date,
        },
        subQueues: typeStats,
      });
    } catch (error) {
      next(error);
    }
  }

  async skipSelf(req, res, next) {
    try {
      const { memberId } = req.params;
      const { targetPosition } = req.body;
      const QueueMemberModel = require('../models/QueueMember');
      const QueueTypeModel = require('../models/QueueType');
      const member = await QueueMemberModel.findById(memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      if (member.status !== 'WAITING') {
        return res.status(400).json({ error: 'Can only skip while WAITING' });
      }
      const position = await QueueMemberModel.getPosition(member.queue_type_id, memberId);
      if (!targetPosition || targetPosition <= position || targetPosition > position + 10) {
        return res.status(400).json({ error: 'Invalid target position. Can only skip forward up to 10 positions.' });
      }
      const allWaiting = await QueueMemberModel.getWaitingMembers(member.queue_type_id);
      const targetIndex = allWaiting.findIndex(m => m.id === memberId);
      const swapIndex = targetIndex + (targetPosition - position);
      if (swapIndex >= allWaiting.length) {
        return res.status(400).json({ error: 'Cannot skip past the last waiting person' });
      }
      const swapMember = allWaiting[swapIndex];
      const memberOriginalToken = member.token_number;
      const swapOriginalToken = swapMember.token_number;
      const { query: dbQuery } = require('../config/database');
      await dbQuery('UPDATE queue_members SET token_number = $1 WHERE id = $2', [-999999, member.id]);
      await dbQuery('UPDATE queue_members SET token_number = $1 WHERE id = $2', [memberOriginalToken, swapMember.id]);
      await dbQuery('UPDATE queue_members SET token_number = $1 WHERE id = $2', [swapOriginalToken, member.id]);
      const queueType = await QueueTypeModel.findById(member.queue_type_id);
      const io = req.app.get('io');
      if (io && queueType) {
        io.to(`queue:${queueType.queue_id}`).emit('token:skipped', { member: { ...member, token_number: tempToken } });
      }
      res.json({ message: 'Skipped forward successfully', newPosition: targetPosition });
    } catch (error) {
      next(error);
    }
  }

  async undoServe(req, res, next) {
    try {
      const { queueTypeId, memberId } = req.params;
      const member = await QueueMemberModel.undoServe(memberId);
      if (!member) {
        return res.status(400).json({ error: 'Cannot undo - member not in SERVED status' });
      }

      const io = req.app.get('io');
      const queueType = await QueueTypeModel.findById(queueTypeId);
      if (io && queueType) {
        io.to(`queue:${queueType.queue_id}`).emit('token:undone', { member });
      }

      res.json({ message: 'Serve undone - member moved back to waiting', member });
    } catch (error) {
      next(error);
    }
  }

  async getMemberStatus(req, res, next) {
    try {
      const { memberId } = req.params;
      const QueueMemberModel = require('../models/QueueMember');
      const QueueTypeModel = require('../models/QueueType');
      const member = await QueueMemberModel.findById(memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      const queueType = await QueueTypeModel.findById(member.queue_type_id);
      const queue = await QueueModel.findById(queueType?.queue_id);
      const activeMembers = await QueueMemberModel.findActiveByQueueType(member.queue_type_id);
      const currentServing = activeMembers.find(m => m.status === 'SERVING');
      const position = await QueueMemberModel.getPosition(member.queue_type_id, memberId);
      const peopleAhead = position ? position - 1 : 0;
      const estimatedWait = peopleAhead * 5;
      res.json({
        member: {
          id: member.id,
          token_number: member.token_number,
          name: member.name,
          status: member.status,
          joined_at: member.joined_at,
        },
        queue: {
          name: queue?.name,
          status: queue?.status,
        },
        queueType: {
          name: queueType?.name,
          publicCode: queueType?.public_code,
        },
        liveStats: {
          currentlyServing: currentServing?.token_number || null,
          position: position || null,
          peopleAhead,
          estimatedWaitMinutes: estimatedWait,
          estimatedWaitRange: `${estimatedWait}-${estimatedWait + 5}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QueueController();
