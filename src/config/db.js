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
        { name: 'Lash Techs', description: 'Classic lash extensions, volume sets, lash lifts, and infills.', duration: 45, price: 4000, type: 'single', category: 'Lashes', location: 'Lead City University Campus' },
        { name: 'Nail Techs', description: 'Acrylic full set, gel extensions, custom nail art, and grooming.', duration: 40, price: 3500, type: 'single', category: 'Nails', location: 'Lead City University Campus' },
        { name: 'Hair Braider (Male & Female)', description: 'Cornrows, knotless braids, box braids, and twists for males and females.', duration: 90, price: 5000, type: 'single', category: 'Hair', location: 'Lead City University Campus' },
        { name: 'Wig Installers (Frontal & Others)', description: 'Frontal wig melt, closure installation, styling, and revamp.', duration: 60, price: 6500, type: 'single', category: 'Hair', location: 'Lead City University Campus' },
        { name: 'Barber', description: 'Clean precision haircut, beard grooming, fading, styling, and razor line-up.', duration: 30, price: 3000, type: 'single', category: 'Barbering', location: 'Lead City University Campus' },
        { name: 'Body Care (Manicure, Pedicure)', description: 'Refreshing manicure, exfoliating pedicure, cuticle therapy, and body relaxation.', duration: 50, price: 4500, type: 'single', category: 'Body Care', location: 'Lead City University Campus' }
      ];
      await Service.insertMany(defaultServices);
      console.log('Successfully seeded the 6 D.World Platform Services!');
    }
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
