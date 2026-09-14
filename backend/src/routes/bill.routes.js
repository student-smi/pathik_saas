const express = require('express');
const { body } = require('express-validator');
const {
  listBills, createBill, getBill, getBillById,
  updateEntryAv, updateEntryHv,
  publishBill, unpublishBill, previewCalculation,
  deleteBill, syncMissingHouses
} = require('../controllers/bill.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/error.middleware');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/', listBills);
router.post('/create',
  [body('societyId').notEmpty(), body('year').isInt(), body('month').isInt({ min: 1, max: 12 })],
  validate,
  createBill
);
router.get('/preview', previewCalculation);
router.get('/by-id/:billId', getBillById);
router.get('/:societyId/:year/:month', getBill);

router.patch('/entry/:entryId/av',
  [body('av').isNumeric(), body('societyId').notEmpty()],
  validate,
  updateEntryAv
);
router.patch('/entry/:entryId/hv',
  [body('hv').isNumeric(), body('societyId').notEmpty()],
  validate,
  updateEntryHv
);

router.post('/:billId/publish', publishBill);
router.post('/:billId/unpublish', unpublishBill);
router.post('/:billId/sync-houses', syncMissingHouses);
router.delete('/:billId', deleteBill);

module.exports = router;
