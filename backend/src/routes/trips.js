import { Router } from 'express';
import Trip from '../models/Trip.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/trips - Get all trips for authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json({ ok: true, data: trips });
  } catch (e) {
    console.error('Get trips error:', e);
    res.status(500).json({ ok: false, error: 'read_failed', message: e.message });
  }
});

// POST /api/trips - Create new trip for authenticated user
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const trip = await Trip.create({
      userId: req.userId,
      origin: body.origin || null,
      destination: body.destination || null,
      dates: body.dates || null,
      budget: body.budget || 0,
      adults: body.adults || 1,
      interests: Array.isArray(body.interests) ? body.interests : [],
      plan: body.plan || null,
      selectedFlight: body.plan?.options?.[0]?.flight || null,
      selectedHotel: body.plan?.options?.[0]?.hotel || null,
    });
    res.json({ ok: true, data: trip });
  } catch (e) {
    console.error('Create trip error:', e);
    res.status(500).json({ ok: false, error: 'write_failed', message: e.message });
  }
});

// DELETE /api/trips/:id - Delete trip for authenticated user
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!trip) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, deleted: req.params.id });
  } catch (e) {
    console.error('Delete trip error:', e);
    res.status(500).json({ ok: false, error: 'delete_failed', message: e.message });
  }
});

export default router;
