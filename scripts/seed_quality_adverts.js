require('dotenv').config();
const mongoose = require('mongoose');
const Advert = require('../src/models/Advert');

const CAMPAIGNS = [
  {
    title: "Meet D.WORLD — Campus Services Reimagined",
    description: "Discover verified campus lash techs, barbers, stylists, and creatives right at your doorstep with verified student reviews.",
    category: "public_awareness",
    mediaType: "video",
    mediaUrl: "/videos/dworld-campus-anthem.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1280&q=80",
    placement: "all_campus",
    ctaText: "Explore Specialists",
    ctaLink: "/services",
    isActive: true,
    priority: 10
  },
  {
    title: "How to Find & Vet Campus Specialists in 60s",
    description: "Step-by-step: Filter by campus, inspect real customer lookbooks, read verified student ratings, and chat directly before you book.",
    category: "product_feature",
    mediaType: "video",
    mediaUrl: "/videos/dworld-how-to-find-experts.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1280&q=80",
    placement: "specialist_directory",
    ctaText: "Find an Expert",
    ctaLink: "/services",
    isActive: true,
    priority: 9
  },
  {
    title: "The Booking Process & 100% Escrow Protection",
    description: "Zero risk. Your payment is held safely in D.WORLD Escrow and only released after you confirm satisfaction. 100% refund guarantee on cancellation.",
    category: "commercial_video",
    mediaType: "video",
    mediaUrl: "/videos/dworld-booking-and-escrow.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1280&q=80",
    placement: "public_home",
    ctaText: "Book with Escrow",
    ctaLink: "/services",
    isActive: true,
    priority: 8
  },
  {
    title: "Monetize Your Skills — Earn On Campus With Zero Rent",
    description: "For student barbers, braiders, lash artists, and creators: automated bookings, zero salon rent, and instant wallet payouts.",
    category: "special_promo",
    mediaType: "video",
    mediaUrl: "/videos/dworld-monetize-your-skills.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1280&q=80",
    placement: "student_dashboard",
    ctaText: "Become a Specialist",
    ctaLink: "/register?role=expert",
    isActive: true,
    priority: 7
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Remove existing placeholder adverts
    await Advert.deleteMany({});
    console.log('Cleared old placeholder adverts.');

    // Insert new high quality campaigns
    const inserted = await Advert.insertMany(CAMPAIGNS);
    console.log(`Successfully seeded ${inserted.length} high-definition commercial campaigns:`);
    inserted.forEach(c => console.log(` - [${c.category}] ${c.title} -> ${c.mediaUrl}`));

    await mongoose.disconnect();
    console.log('Finished.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding adverts:', err);
    process.exit(1);
  }
}

seed();
