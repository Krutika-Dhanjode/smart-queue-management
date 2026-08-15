const DocumentModel = require('../models/Document');
const config = require('../config');

class DocumentService {
  async addRequirement({ queueId, name, description, mandatory }) {
    return DocumentModel.createRequirement({ queueId, name, description, mandatory });
  }

  async getRequirements(queueId) {
    return DocumentModel.getRequirements(queueId);
  }

  async updateRequirement(id, updates) {
    return DocumentModel.updateRequirement(id, updates);
  }

  async deleteRequirement(id) {
    return DocumentModel.deleteRequirement(id);
  }

  async uploadDocument({ queueMemberId, documentRequirementId, userId, file }) {
    const storagePath = `queue-documents/${queueMemberId}/${documentRequirementId}/${Date.now()}_${file.originalname}`;

    const document = await DocumentModel.createDocument({
      queueMemberId,
      documentRequirementId,
      userId,
      storagePath,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    });

    return document;
  }

  async verifyDocument(documentId, { status, extractedName, confidence, rejectionReason, verifiedBy }) {
    return DocumentModel.updateVerification(documentId, {
      status,
      extractedName,
      confidence,
      rejectionReason,
      verifiedBy,
    });
  }

  async getDocumentsByMember(queueMemberId) {
    return DocumentModel.getByQueueMember(queueMemberId);
  }

  async checkAllRequiredDocuments(queueMemberId) {
    const documents = await DocumentModel.getByQueueMember(queueMemberId);
    const missing = documents.filter(d => d.mandatory && d.verification_status !== 'VERIFIED');
    return {
      allVerified: missing.length === 0,
      missing: missing.map(d => d.requirement_name),
      documents,
    };
  }

  async processDocument(file) {
    try {
      const response = await fetch(`${config.mlService.url}/document/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: file.path || file.buffer }),
      });

      if (!response.ok) {
        return { valid: true, quality: 'unknown' };
      }

      return await response.json();
    } catch (error) {
      console.error('ML document processing failed:', error);
      return { valid: true, quality: 'unknown' };
    }
  }

  async verifyName(documentId, expectedName) {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      const response = await fetch(`${config.mlService.url}/document/verify-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_path: document.storage_path,
          expected_name: expectedName,
        }),
      });

      if (!response.ok) {
        return { match: false, confidence: 0, extracted_name: '' };
      }

      return await response.json();
    } catch (error) {
      console.error('ML name verification failed:', error);
      return { match: false, confidence: 0, extracted_name: '' };
    }
  }
}

module.exports = new DocumentService();
