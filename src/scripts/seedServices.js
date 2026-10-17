require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Deleting all current services...');
    const delRes = await Service.deleteMany({});
    console.log('Deleted old services count:', delRes.deletedCount);

    const newServices = [
      { name: 'Lash Techs', description: 'Classic lash extensions, volume sets, lash lifts, and infills.', duration: 45, price: 4000, type: 'single', category: 'Lashes', location: 'Lead City University Campus' },
      { name: 'Nail Techs', description: 'Acrylic full set, gel extensions, custom nail art, and grooming.', duration: 40, price: 3500, type: 'single', category: 'Nails', location: 'Lead City University Campus' },
      { name: 'Hair Braider (Male & Female)', description: 'Cornrows, knotless braids, box braids, and twists for males and females.', duration: 90, price: 5000, type: 'single', category: 'Hair', location: 'Lead City University Campus' },
      { name: 'Wig Installers (Frontal & Others)', description: 'Frontal wig melt, closure installation, styling, and revamp.', duration: 60, price: 6500, type: 'single', category: 'Hair', location: 'Lead City University Campus' },
      { name: 'Barber', description: 'Clean precision haircut, beard grooming, fading, styling, and razor line-up.', duration: 30, price: 3000, type: 'single', category: 'Barbering', location: 'Lead City University Campus' },
      { name: 'Body Care (Manicure, Pedicure)', description: 'Refreshing manicure, exfoliating pedicure, cuticle therapy, and body relaxation.', duration: 50, price: 4500, type: 'single', category: 'Body Care', location: 'Lead City University Campus' }
    ];

    const inserted = await Service.insertMany(newServices);
    console.log('Successfully inserted new services count:', inserted.length);
    await mongoose.disconnect();
    console.log('Services migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

seed();
