const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/appointment');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Seed default Master Admin account if not existing
    const User = require('../models/User');
    const adminExists = await User.findOne({ email: 'admin@dworld.com' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'D.WORLD System Admin',
        email: 'admin@dworld.com',
        password: hashedPassword,
        role: 'admin',
        bio: 'Master System Administrator',
        walletBalance: 0
      });
      console.log('Master Admin created: admin@dworld.com / admin123');
    }

    // Seed Default Services & Beauty Packages if needed
    const Service = require('../models/Service');
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {

      const defaultServices = [
        // 🟢 PURE SINGLE SERVICES ONLY (18)
        { name: 'Nails', description: 'Classic nail care, shaping, and polish.', duration: 30, price: 2500, type: 'single', category: 'Nails', location: 'Beauty Studio' },
        { name: 'Lash Extensions', description: 'Classic full set lash extensions.', duration: 45, price: 4000, type: 'single', category: 'Lashes', location: 'Beauty Studio' },
        { name: 'Hair Braiding', description: 'Neat campus hair braiding and styling.', duration: 90, price: 5000, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Wig Installation', description: 'Professional wig install and melt.', duration: 60, price: 6000, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Frontal Installation', description: 'Custom frontal wig placement and styling.', duration: 75, price: 7500, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Wig Revamping', description: 'Wig wash, deep conditioning, and restyling.', duration: 60, price: 4500, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Hair Tinting', description: 'Vibrant hair color tinting and treatment.', duration: 45, price: 4000, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Makeup', description: 'Professional full face glam makeup.', duration: 50, price: 5000, type: 'single', category: 'Makeup', location: 'Glam Studio' },
        { name: 'Male Haircut / Barbering', description: 'Precision male haircut and line-up.', duration: 30, price: 3000, type: 'single', category: 'Barbering', location: 'Barber Suite' },
        { name: 'Male Hair Braiding', description: 'Neat male cornrows and braided styles.', duration: 60, price: 4500, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Hair Styling', description: 'Blowout, press, curling, and updos.', duration: 45, price: 3500, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Hair Treatment', description: 'Deep scalp conditioning and moisture therapy.', duration: 40, price: 3500, type: 'single', category: 'Hair', location: 'Hair Suite' },
        { name: 'Manicure', description: 'Nail trim, cuticle care, and hand massage.', duration: 30, price: 2500, type: 'single', category: 'Nails', location: 'Beauty Studio' },
        { name: 'Pedicure', description: 'Exfoliating foot soak, nail trim, and massage.', duration: 45, price: 3500, type: 'single', category: 'Nails', location: 'Beauty Studio' },
        { name: 'Facial', description: 'Deep cleansing facial treatment and glow mask.', duration: 45, price: 5000, type: 'single', category: 'Skincare', location: 'Spa Room' },
        { name: 'Eyebrow Grooming', description: 'Precision eyebrow shaping, threading, or waxing.', duration: 20, price: 1500, type: 'single', category: 'Grooming', location: 'Beauty Studio' },
        { name: 'Waxing', description: 'Smooth body or facial hair removal waxing.', duration: 30, price: 3500, type: 'single', category: 'Skincare', location: 'Spa Room' },
        { name: 'Massage', description: 'Relaxing full body or neck & shoulder massage.', duration: 45, price: 6000, type: 'single', category: 'Wellness', location: 'Spa Room' }
      ];
      await Service.insertMany(defaultServices);
      console.log('Successfully seeded 18 Pure Single Services!');
    }
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
