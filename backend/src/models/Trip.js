import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    dates: {
      start: String,
      end: String
    },
    budget: Number,
    adults: { type: Number, default: 1 },
    interests: [String],
    plan: {
      trip: Object,
      options: Array
    },
    selectedFlight: Object,
    selectedHotel: Object,
    itinerary: Array,
    status: { type: String, enum: ['draft', 'upcoming', 'past', 'completed'], default: 'draft' }
  },
  { timestamps: true }
);

export default mongoose.model('Trip', tripSchema);
