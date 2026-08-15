const DocumentService = require('../services/DocumentService');

class DocumentController {
  async addRequirement(req, res, next) {
    try {
      const { queueId } = req.params;
      const { name, description, mandatory } = req.body;
      const requirement = await DocumentService.addRequirement({
        queueId,
        name,
        description,
        mandatory,
      });
      res.status(201).json({ requirement });
    } catch (error) {
      next(error);
    }
  }

  async getRequirements(req, res, next) {
    try {
      const { queueId } = req.params;
      const requirements = await DocumentService.getRequirements(queueId);
      res.json({ requirements });
    } catch (error) {
      next(error);
    }
  }

  async updateRequirement(req, res, next) {
    try {
      const { requirementId } = req.params;
      const requirement = await DocumentService.updateRequirement(requirementId, req.body);
      res.json({ requirement });
    } catch (error) {
      next(error);
    }
  }

  async deleteRequirement(req, res, next) {
    try {
      const { requirementId } = req.params;
      await DocumentService.deleteRequirement(requirementId);
      res.json({ message: 'Requirement deleted' });
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req, res, next) {
    try {
      const { queueMemberId, documentRequirementId } = req.params;
      const document = await DocumentService.uploadDocument({
        queueMemberId,
        documentRequirementId,
        userId: req.user.id,
        file: req.file,
      });
      res.status(201).json({ document });
    } catch (error) {
      next(error);
    }
  }

  async verifyDocument(req, res, next) {
    try {
      const { documentId } = req.params;
      const { status, rejectionReason } = req.body;
      const document = await DocumentService.verifyDocument(documentId, {
        status,
        rejectionReason,
        verifiedBy: req.user.id,
      });
      res.json({ document });
    } catch (error) {
      next(error);
    }
  }

  async getDocumentsByMember(req, res, next) {
    try {
      const { queueMemberId } = req.params;
      const documents = await DocumentService.getDocumentsByMember(queueMemberId);
      res.json({ documents });
    } catch (error) {
      next(error);
    }
  }

  async checkRequiredDocuments(req, res, next) {
    try {
      const { queueMemberId } = req.params;
      const result = await DocumentService.checkAllRequiredDocuments(queueMemberId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DocumentController();
