const { validationResult } = require('express-validator');

/**
 * Run express-validator checks and return 422 if there are errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Record already exists' });
  }
  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error'
  });
};

module.exports = { validate, errorHandler };
