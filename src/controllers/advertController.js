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

// Stream media for direct saving to phone photos / camera roll
const downloadMedia = async (req, res, next) => {
  try {
    const { url, title } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Media URL required' });
    }

    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const http = require('http');

    const cleanUrl = url.trim();
    const ext = cleanUrl.split('.').pop().split('?')[0].toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const fileExt = isImage ? (ext || 'jpg') : 'mp4';
    const defaultMime = isImage ? `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}` : 'video/mp4';

    const safeFilename = (title || 'dworld-commercial')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') + `.${fileExt}`;

    // 1. Direct local file serving if relative URL or local asset
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('videos/')) {
      const relPath = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;
      const localDist = path.resolve(__dirname, '../../client/dist', relPath);
      const localPub = path.resolve(__dirname, '../../client/public', relPath);
      const targetFile = fs.existsSync(localDist) ? localDist : (fs.existsSync(localPub) ? localPub : null);

      if (targetFile) {
        res.setHeader('Content-Type', defaultMime);
        return res.download(targetFile, safeFilename);
      }
    }

    // 2. Fallback to HTTP/HTTPS streaming proxy for external CDN assets
    const fetchStream = (targetUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        return res.status(500).json({ success: false, message: 'Too many redirects' });
      }

      const client = targetUrl.startsWith('https') ? https : http;
      client.get(targetUrl, (remoteRes) => {
        if (remoteRes.statusCode === 301 || remoteRes.statusCode === 302 || remoteRes.statusCode === 307) {
          const redirectLocation = remoteRes.headers.location;
          if (redirectLocation) {
            return fetchStream(redirectLocation, redirectCount + 1);
          }
        }

        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Type', remoteRes.headers['content-type'] || defaultMime);
        remoteRes.pipe(res);
      }).on('error', (err) => {
        console.error('Error proxying media download:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Could not fetch video for download.' });
        }
      });
    };

    fetchStream(cleanUrl);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getActiveAdverts,
  getAllAdverts,
  createAdvert,
  updateAdvert,
  toggleAdvertStatus,
  deleteAdvert,
  downloadMedia
};
