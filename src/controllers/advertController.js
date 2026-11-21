const Advert = require('../models/Advert');

// Public: Get active adverts for display across the platform
const getActiveAdverts = async (req, res, next) => {
  try {
    const { placement, category } = req.query;
    const query = { isActive: true };

    if (placement && placement !== 'all') {
      query.$or = [{ placement }, { placement: 'all_campus' }];
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const adverts = await Advert.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: adverts.length, data: adverts });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all adverts (including drafts and paused)
const getAllAdverts = async (req, res, next) => {
  try {
    const adverts = await Advert.find()
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: adverts.length, data: adverts });
  } catch (error) {
    next(error);
  }
};

// Admin: Create new advert
const createAdvert = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      mediaType,
      mediaUrl,
      thumbnailUrl,
      placement,
      ctaText,
      ctaLink,
      isActive,
      priority
    } = req.body;

    if (!title || !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Title and Media URL are required.' });
    }

    const advert = await Advert.create({
      title,
      description: description || '',
      category: category || 'public_awareness',
      mediaType: mediaType || 'video',
      mediaUrl,
      thumbnailUrl: thumbnailUrl || '',
      placement: placement || 'all_campus',
      ctaText: ctaText || 'Learn More',
      ctaLink: ctaLink || '/services',
      isActive: isActive !== undefined ? isActive : true,
      priority: Number(priority) || 0
    });

    res.status(201).json({ success: true, message: 'Advertisement campaign created successfully', data: advert });
  } catch (error) {
    next(error);
  }
};

// Admin: Update advert
const updateAdvert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const advert = await Advert.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!advert) {
      return res.status(404).json({ success: false, message: 'Advert record not found.' });
    }

    res.status(200).json({ success: true, message: 'Advertisement updated successfully', data: advert });
  } catch (error) {
    next(error);
  }
};

// Admin: Toggle active status
const toggleAdvertStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const advert = await Advert.findById(id);
    if (!advert) {
      return res.status(404).json({ success: false, message: 'Advert record not found.' });
    }

    advert.isActive = !advert.isActive;
    await advert.save();

    res.status(200).json({
      success: true,
      message: `Advert status updated to ${advert.isActive ? 'Active' : 'Draft/Paused'}`,
      data: advert
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete advert
const deleteAdvert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const advert = await Advert.findByIdAndDelete(id);
    if (!advert) {
      return res.status(404).json({ success: false, message: 'Advert record not found.' });
    }

    res.status(200).json({ success: true, message: 'Advertisement removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveAdverts,
  getAllAdverts,
  createAdvert,
  updateAdvert,
  toggleAdvertStatus,
  deleteAdvert
};
