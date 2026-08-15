const express = require('express');
const router = express.Router();
const config = require('../config');

router.get('/:queueTypeId', async (req, res, next) => {
  try {
    const { queueTypeId } = req.params;
    const { peopleAhead, queueLength, activeCounters, serviceType } = req.query;

    const response = await fetch(`${config.mlService.url}/predict/wait-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queue_type_id: queueTypeId,
        people_ahead: parseInt(peopleAhead) || 0,
        queue_length: parseInt(queueLength) || 0,
        active_counters: parseInt(activeCounters) || 1,
        service_type: serviceType || 'normal',
      }),
    });

    if (!response.ok) {
      const people = parseInt(peopleAhead) || 0;
      const avgServiceTime = 5;
      const estimated = people * avgServiceTime;
      return res.json({
        prediction: {
          estimated_wait_minutes: estimated,
          lower_bound: Math.max(0, estimated - 5),
          upper_bound: estimated + 5,
          model_version: 'statistical-fallback',
        },
      });
    }

    const prediction = await response.json();
    res.json({ prediction });
  } catch (error) {
    const people = parseInt(req.query.peopleAhead) || 0;
    const estimated = people * 5;
    res.json({
      prediction: {
        estimated_wait_minutes: estimated,
        lower_bound: Math.max(0, estimated - 5),
        upper_bound: estimated + 5,
        model_version: 'statistical-fallback',
      },
    });
  }
});

module.exports = router;
