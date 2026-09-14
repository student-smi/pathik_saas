const express = require('express');
const { body, query } = require('express-validator');
const { listHouses, createHouse, updateHouse, deleteHouse } = require('../controllers/house.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/error.middleware');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/', [query('societyId').notEmpty()], validate, listHouses);
router.post('/', [body('societyId').notEmpty(), body('houseNo').notEmpty()], validate, createHouse);
router.put('/:id', updateHouse);
router.delete('/:id', deleteHouse);

module.exports = router;
