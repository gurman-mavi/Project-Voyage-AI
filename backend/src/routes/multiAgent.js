import { Router } from 'express';
import { runMultiAgentSystem, quickMultiAgentAnalysis } from '../ai/multiAgentSystem.js';

const router = Router();

/**
 * POST /api/multi-agent/analyze
 * Run full multi-agent analysis on trip data
 */
router.post('/analyze', async (req, res) => {
  try {
    const { destination, budget, duration, dates, interests, flightPrice, hotelPrice } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    const tripData = {
      destination,
      budget: Number(budget) || 50000,
      duration: Number(duration) || 5,
      dates: dates || { start: 'TBD', end: 'TBD' },
      interests: Array.isArray(interests) ? interests : [],
      flightPrice: Number(flightPrice) || 0,
      hotelPrice: Number(hotelPrice) || 0
    };

    console.log('🤖 Running multi-agent analysis for:', destination);

    const result = await runMultiAgentSystem(tripData);

    res.json(result);
  } catch (error) {
    console.error('Multi-agent API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed'
    });
  }
});

/**
 * POST /api/multi-agent/quick
 * Run quick analysis (budget + activity only)
 */
router.post('/quick', async (req, res) => {
  try {
    const { destination, budget, duration, dates, interests, flightPrice, hotelPrice } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    const tripData = {
      destination,
      budget: Number(budget) || 50000,
      duration: Number(duration) || 5,
      dates: dates || { start: 'TBD', end: 'TBD' },
      interests: Array.isArray(interests) ? interests : [],
      flightPrice: Number(flightPrice) || 0,
      hotelPrice: Number(hotelPrice) || 0
    };

    const result = await quickMultiAgentAnalysis(tripData);

    res.json(result);
  } catch (error) {
    console.error('Quick analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed'
    });
  }
});

export default router;
