const express = require('express');
const { exportExcel, exportPdf } = require('../controllers/export.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/excel/:billId', exportExcel);
router.get('/pdf/:billId', exportPdf);

module.exports = router;
