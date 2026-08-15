const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details,
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Invalid credentials') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (err.message === 'Insufficient permissions') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  if (err.message === 'Queue not found') {
    return res.status(404).json({ error: 'Queue not found' });
  }

  if (err.message === 'Member not found') {
    return res.status(404).json({ error: 'Member not found' });
  }

  if (err.message === 'Queue is closed') {
    return res.status(400).json({ error: 'Queue is closed' });
  }

  if (err.message === 'Queue is full') {
    return res.status(400).json({ error: 'Queue is full' });
  }

  if (err.message === 'Sub-queue is full') {
    return res.status(400).json({ error: 'Sub-queue is full' });
  }

  if (err.message === 'You are already in this queue') {
    return res.status(409).json({ error: 'You are already in this queue' });
  }

  if (err.message === 'Email already registered') {
    return res.status(409).json({ error: 'Email already registered' });
  }

  if (err.message.includes('OTP')) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;
