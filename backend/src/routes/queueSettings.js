const express = require('express');
const router = express.Router();
const QueueSettingsController = require('../controllers/QueueSettingsController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/:queueId/settings', authenticate, QueueSettingsController.getSettings);
router.put('/:queueId/settings', authenticate, QueueSettingsController.updateSettings);

router.get('/:queueId/custom-fields', QueueSettingsController.getCustomFields);
router.post('/:queueId/custom-fields', authenticate, QueueSettingsController.addCustomField);
router.put('/custom-fields/:fieldId', authenticate, QueueSettingsController.updateCustomField);
router.delete('/custom-fields/:fieldId', authenticate, QueueSettingsController.deleteCustomField);
router.post('/:queueId/custom-fields/bulk', authenticate, QueueSettingsController.bulkCreateCustomFields);

router.post('/:queueId/eligibility/upload', authenticate, upload.single('file'), QueueSettingsController.uploadEligibility);
router.get('/:queueId/eligibility/info', authenticate, QueueSettingsController.getEligibilityInfo);
router.delete('/:queueId/eligibility', authenticate, QueueSettingsController.removeEligibility);
router.post('/:queueId/eligibility/check', QueueSettingsController.checkEligibility);

router.post('/:queueId/doc-requirements', authenticate, upload.single('template'), QueueSettingsController.addDocumentRequirement);
router.put('/doc-requirements/:requirementId', authenticate, upload.single('template'), QueueSettingsController.updateDocumentRequirement);
router.delete('/doc-requirements/:requirementId', authenticate, QueueSettingsController.deleteDocumentRequirement);

router.post('/:queueId/check-join', QueueSettingsController.checkJoinRequirements);

module.exports = router;
