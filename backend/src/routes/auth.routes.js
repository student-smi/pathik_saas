const express = require('express');
const { body } = require('express-validator');
const { login, registerAdmin, me, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/error.middleware');

const router = express.Router();

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  login
);

router.post('/register-admin',
  [body('email').isEmail(), body('password').isLength({ min: 6 })],
  validate,
  registerAdmin
);

router.get('/me', authenticate, me);

router.post('/change-password',
  authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  changePassword
);

module.exports = router;
