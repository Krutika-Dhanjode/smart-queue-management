const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/DocumentController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

router.put('/requirements/:requirementId', authenticate, authorize('ADMIN'), DocumentController.updateRequirement);
router.delete('/requirements/:requirementId', authenticate, authorize('ADMIN'), DocumentController.deleteRequirement);
router.post('/documents/:documentId/verify', authenticate, authorize('ADMIN'), DocumentController.verifyDocument);

router.post('/:queueId/requirements', authenticate, authorize('ADMIN'), DocumentController.addRequirement);
router.get('/:queueId/requirements', DocumentController.getRequirements);

router.post('/:queueMemberId/documents/:documentRequirementId', authenticate, upload.single('document'), DocumentController.uploadDocument);
router.get('/:queueMemberId/documents/check', DocumentController.checkRequiredDocuments);
router.get('/:queueMemberId/documents', DocumentController.getDocumentsByMember);

module.exports = router;
