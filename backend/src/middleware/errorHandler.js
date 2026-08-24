const errorHandler = (err, req, res, next) => {
  const msg = err.message || '';
  const detail = msg || err.detail || err.routine || err.code || 'Internal server error';
  console.error('Error:', detail);
  console.error('Stack:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.details });
  }

  if (err.name === 'UnauthorizedError' || msg === 'Invalid credentials') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (msg === 'Insufficient permissions') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  if (msg === 'Queue not found') {
    return res.status(404).json({ error: 'Queue not found' });
  }

  if (msg === 'Member not found') {
    return res.status(404).json({ error: 'Member not found' });
  }

  if (msg === 'Queue is closed') {
    return res.status(400).json({ error: 'Queue is closed' });
  }

  if (msg === 'Queue is full') {
    return res.status(400).json({ error: 'Queue is full' });
  }

  if (msg === 'Sub-queue is full') {
    return res.status(400).json({ error: 'Sub-queue is full' });
  }

  if (msg === 'You are already in this queue') {
    return res.status(409).json({ error: 'You are already in this queue' });
  }

  if (msg === 'Email already registered') {
    return res.status(409).json({ error: 'Email already registered' });
  }

  if (msg.includes('OTP')) {
    return res.status(400).json({ error: msg });
  }

  return res.status(500).json({ error: detail });
};

module.exports = errorHandler;
