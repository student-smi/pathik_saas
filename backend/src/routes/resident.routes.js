const express = require('express');
const { body } = require('express-validator');
const { listResidents, createResident, updateResident, deleteResident, resetPassword } = require('../controllers/resident.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/error.middleware');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/', listResidents);

// email and password are now OPTIONAL — auto-generated from name + house number
router.post('/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('houseId').notEmpty().withMessage('House is required'),
    // email optional — auto-generated
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email format'),
    // password optional — auto-generated as house number
    body('password').optional({ nullable: true, checkFalsy: true })
  ],
  validate,
  createResident
);

router.put('/:id', updateResident);
router.delete('/:id', deleteResident);
router.post('/:id/reset-password',
  [body('newPassword').isLength({ min: 1 }).withMessage('New password required')],
  validate,
  resetPassword
);

module.exports = router;
