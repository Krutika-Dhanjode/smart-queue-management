const express = require('express');
const router = express.Router();
const EligibilityController = require('../controllers/EligibilityController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload Excel or CSV.'), false);
    }
  },
});

router.post('/:queueId/upload', authenticate, authorize('ADMIN'), upload.single('file'), EligibilityController.uploadFile);
router.post('/:queueId/check', EligibilityController.checkEligibility);
router.get('/:queueId/records', authenticate, authorize('ADMIN'), EligibilityController.getRecords);
router.delete('/:queueId/records', authenticate, authorize('ADMIN'), EligibilityController.deleteRecords);

module.exports = router;
