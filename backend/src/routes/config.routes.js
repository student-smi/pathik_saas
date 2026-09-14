const express = require('express');
const { body } = require('express-validator');
const { getConfigs, upsertConfig, deleteConfig } = require('../controllers/config.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/error.middleware');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/', getConfigs);
router.put('/',
  [body('societyId').notEmpty(), body('fieldName').notEmpty(), body('formula').notEmpty()],
  validate,
  upsertConfig
);
router.delete('/:id', deleteConfig);

module.exports = router;
