const QueueService = require('../services/QueueService');
const QueueMemberModel = require('../models/QueueMember');
const QueueTypeModel = require('../models/QueueType');
const QueueModel = require('../models/Queue');
const QRCode = require('qrcode');
const config = require('../config');

class QueueController {
  async createQueue(req, res, next) {
    try {
      const { name, date, capacity, subQueues } = req.body;
      const result = await QueueService.createQueue({
        name,
        date,
        capacity,
        createdBy: req.user.id,
        subQueues,
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
      res.json({ queue });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QueueController();
