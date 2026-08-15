const { getRedis } = require('../config/redis');

class QueueRedis {
  constructor() {
    this.redis = getRedis();
  }

  async setActiveQueue(queueId, queueTypeId, members) {
    const key = `queue:${queueId}:${queueTypeId}:active`;
    await this.redis.del(key);
    if (members.length > 0) {
      const data = members.map(m => JSON.stringify({
        id: m.id,
        token: m.token_number,
        name: m.name,
        status: m.status,
        priority: m.priority,
      }));
      await this.redis.rpush(key, ...data);
    }
  }

  async getActiveQueue(queueId, queueTypeId) {
    const key = `queue:${queueId}:${queueTypeId}:active`;
    const members = await this.redis.lrange(key, 0, -1);
    return members.map(m => JSON.parse(m));
  }

  async setCurrentToken(queueId, queueTypeId, tokenNumber) {
    await this.redis.set(`queue:${queueId}:${queueTypeId}:current`, tokenNumber);
  }

  async getCurrentToken(queueId, queueTypeId) {
    return this.redis.get(`queue:${queueId}:${queueTypeId}:current`);
  }

  async setQueueLength(queueId, queueTypeId, length) {
    await this.redis.set(`queue:${queueId}:${queueTypeId}:length`, length);
  }

  async getQueueLength(queueId, queueTypeId) {
    const length = await this.redis.get(`queue:${queueId}:${queueTypeId}:length`);
    return parseInt(length) || 0;
  }

  async setETA(queueId, queueTypeId, eta) {
    await this.redis.set(`queue:${queueId}:${queueTypeId}:eta`, JSON.stringify(eta));
  }

  async getETA(queueId, queueTypeId) {
    const eta = await this.redis.get(`queue:${queueId}:${queueTypeId}:eta`);
    return eta ? JSON.parse(eta) : null;
  }

  async setQueueStatus(queueId, status) {
    await this.redis.set(`queue:${queueId}:status`, status);
  }

  async getQueueStatus(queueId) {
    return this.redis.get(`queue:${queueId}:status`);
  }

  async setBreakInfo(queueId, breakInfo) {
    await this.redis.set(`queue:${queueId}:break`, JSON.stringify(breakInfo));
  }

  async getBreakInfo(queueId) {
    const info = await this.redis.get(`queue:${queueId}:break`);
    return info ? JSON.parse(info) : null;
  }

  async clearBreakInfo(queueId) {
    await this.redis.del(`queue:${queueId}:break`);
  }

  async clearQueue(queueId, queueTypeId) {
    await this.redis.del(`queue:${queueId}:${queueTypeId}:active`);
    await this.redis.del(`queue:${queueId}:${queueTypeId}:current`);
    await this.redis.del(`queue:${queueId}:${queueTypeId}:length`);
    await this.redis.del(`queue:${queueId}:${queueTypeId}:eta`);
  }

  async rebuildFromDatabase(queueId, QueueMemberModel, QueueTypeModel) {
    const types = await QueueTypeModel.findByQueueId(queueId);
    for (const type of types) {
      const members = await QueueMemberModel.findActiveByQueueType(type.id);
      await this.setActiveQueue(queueId, type.id, members);
      const currentServing = members.find(m => m.status === 'SERVING');
      if (currentServing) {
        await this.setCurrentToken(queueId, type.id, currentServing.token_number);
      }
      await this.setQueueLength(queueId, type.id, members.length);
    }
  }
}

module.exports = new QueueRedis();
