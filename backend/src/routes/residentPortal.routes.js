const express = require('express');
const { getMyProfile, getMyBills, getMyBillEntry, getCurrentBill } = require('../controllers/residentPortal.controller');
const { authenticate, requireResident } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate, requireResident);

router.get('/profile', getMyProfile);
router.get('/bills', getMyBills);
router.get('/bills/current', getCurrentBill);
router.get('/bills/:entryId', getMyBillEntry);

module.exports = router;
