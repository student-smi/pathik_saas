const express = require('express');
const { body } = require('express-validator');
const { listSocieties, createSociety, getSociety, updateSociety } = require('../controllers/society.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/error.middleware');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/', listSocieties);
router.post('/', [body('name').notEmpty()], validate, createSociety);
router.get('/:id', getSociety);
router.put('/:id', updateSociety);

module.exports = router;
