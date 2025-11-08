const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { Parser } = require('json2csv');
const { CardData } = require('../models');
const AIService = require('../services/aiService');
const WebhookService = require('../services/webhookService');
const CacheService = require('../services/cacheService');
const { authenticate, authorize, validateOrganization, checkSubscriptionLimits } = require('../middleware/auth');
const { uploadRateLimit } = require('../middleware/validation');

const router = express.Router();

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Apply middleware to all card routes
router.use(authenticate);
router.use(validateOrganization);

// Process business card image
router.post('/process',
  uploadRateLimit,
  checkSubscriptionLimits,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      console.log(`Processing card for user ${req.user.email}, org ${req.user.organization.name}`);

      // Process with AI service
      const aiResult = await AIService.processBusinessCard(
        req.file.buffer,
        req.user.organization._id
      );

      // Save extracted data to database
      const cardData = new CardData({
        organization: req.user.organization._id,
        extractedBy: req.user._id,
        data: aiResult.data,
        confidence: aiResult.confidence,
        aiProvider: aiResult.aiProvider,
        processingTime: aiResult.processingTime
      });

      await cardData.save();

      // Update organization's monthly usage
      await req.user.organization.updateOne({
        $inc: { 'subscription.cardsProcessedThisMonth': 1 }
      });

      // Invalidate cache for this organization
      CacheService.invalidateCards(req.user.organization._id);

      // Send webhook notification (async)
      WebhookService.sendWebhook(
        req.user.organization._id,
        'cardExtracted',
        {
          cardId: cardData._id,
          extractedData: aiResult.data,
          extractedBy: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
          },
          processingTime: aiResult.processingTime,
          confidence: aiResult.confidence
        }
      ).catch(err => {
        console.error('Webhook delivery failed:', err);
      });

      res.json({
        success: true,
        data: {
          id: cardData._id,
          extractedData: aiResult.data,
          confidence: aiResult.confidence,
          processingTime: aiResult.processingTime,
          aiProvider: aiResult.aiProvider,
          extractedAt: cardData.createdAt
        }
      });

    } catch (error) {
      console.error('Card processing error:', error);
      res.status(500).json({
        error: 'Card processing failed',
        details: error.message
      });
    }
  }
);

// Get all cards for organization with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = Math.min(parseInt(req.query.limit) || 20, 100), // Cap limit at 100
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      extractedBy,
      startDate,
      endDate
    } = req.query;

    // Check cache first
    const cacheKey = { page, limit, sortBy, sortOrder, search, extractedBy, startDate, endDate };
    const cached = CacheService.getCards(req.user.organization._id, cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const query = { organization: req.user.organization._id };

    // Add filters
    if (extractedBy) {
      query.extractedBy = extractedBy;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Add search functionality with text index if available
    if (search) {
      query.$or = [
        { 'data.name': { $regex: search, $options: 'i' } },
        { 'data.company': { $regex: search, $options: 'i' } },
        { 'data.title': { $regex: search, $options: 'i' } },
        { 'data.emails.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Use lean() for better performance since we don't need Mongoose documents
    const [cards, totalCount] = await Promise.all([
      CardData.find(query)
        .populate('extractedBy', 'name email picture')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Better performance
      CardData.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const responseData = {
      cards,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    // Cache the response
    CacheService.setCards(req.user.organization._id, cacheKey, responseData);

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({
      error: 'Failed to fetch cards',
      details: error.message
    });
  }
});

// Export cards data
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv', filename } = req.query;
    const validFormats = ['csv', 'xlsx', 'json'];
    
    if (!validFormats.includes(format)) {
      return res.status(400).json({ 
        error: 'Invalid format. Supported formats: csv, xlsx, json' 
      });
    }

    // Get all cards for the organization (no pagination for export)
    const cards = await CardData.find({ 
      organization: req.user.organization._id 
    })
    .populate('extractedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

    if (cards.length === 0) {
      return res.status(404).json({ 
        error: 'No cards found to export' 
      });
    }

    // Transform data for export
    const exportData = cards.map(card => {
      const phoneNumbers = card.data.phoneNumbers?.map(p => `${p.number} (${p.type})`).join(', ') || '';
      const emails = card.data.emails?.map(e => `${e.email} (${e.type})`).join(', ') || '';
      const socials = card.data.socials?.map(s => `${s.platform}: ${s.url || s.username}`).join(', ') || '';
      
      return {
        'Name': card.data.name || '',
        'Title': card.data.title || '',
        'Company': card.data.company || '',
        'Phone Numbers': phoneNumbers,
        'Emails': emails,
        'Website': card.data.website || '',
        'Address': card.data.address?.full || 
          [card.data.address?.street, card.data.address?.city, card.data.address?.state, card.data.address?.country, card.data.address?.zipCode]
          .filter(Boolean).join(', '),
        'Social Media': socials,
        'Confidence Score': card.confidence || '',
        'AI Provider': card.aiProvider || '',
        'Processing Time (ms)': card.processingTime || '',
        'Extracted By': card.extractedBy?.name || '',
        'Extractor Email': card.extractedBy?.email || '',
        'Date Created': card.createdAt ? new Date(card.createdAt).toLocaleString() : '',
        'Date Updated': card.updatedAt ? new Date(card.updatedAt).toLocaleString() : ''
      };
    });

    const defaultFilename = `business-cards-${new Date().toISOString().split('T')[0]}`;
    
    // Handle different export formats
    switch (format) {
      case 'csv': {
        const parser = new Parser();
        const csv = parser.parse(exportData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || defaultFilename}.csv"`);
        return res.send(csv);
      }
      
      case 'xlsx': {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Business Cards');
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || defaultFilename}.xlsx"`);
        return res.send(buffer);
      }
      
      case 'json': {
        const jsonData = JSON.stringify(exportData, null, 2);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || defaultFilename}.json"`);
        return res.send(jsonData);
      }
    }
  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({
      error: 'Failed to export data',
      details: error.message
    });
  }
});

// Get single card by ID
router.get('/:id', async (req, res) => {
  try {
    const card = await CardData.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    }).populate('extractedBy', 'name email picture');

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({
      error: 'Failed to fetch card',
      details: error.message
    });
  }
});

// Update card data (admin only)
router.put('/:id',
  authorize('admin'),
  async (req, res) => {
    try {

      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'Card data is required' });
      }

      const card = await CardData.findOneAndUpdate(
        {
          _id: req.params.id,
          organization: req.user.organization._id
        },
        { data },
        { new: true }
      ).populate('extractedBy', 'name email picture');

      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }

      res.json({
        success: true,
        data: card
      });
    } catch (error) {
      console.error('Error updating card:', error);
      res.status(500).json({
        error: 'Failed to update card',
        details: error.message
      });
    }
  }
);

// Delete card (admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {

    const card = await CardData.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({
      error: 'Failed to delete card',
      details: error.message
    });
  }
});

// Get extraction statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const organizationId = req.user.organization._id;
    const { period = '30d' } = req.query;

    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const [totalCards, periodCards, avgProcessingTime, topExtractors] = await Promise.all([
      CardData.countDocuments({ organization: organizationId }),
      CardData.countDocuments({ organization: organizationId, ...dateFilter }),
      CardData.aggregate([
        { $match: { organization: organizationId, ...dateFilter } },
        { $group: { _id: null, avgTime: { $avg: '$processingTime' } } }
      ]),
      CardData.aggregate([
        { $match: { organization: organizationId, ...dateFilter } },
        { $group: { _id: '$extractedBy', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { name: '$user.name', email: '$user.email', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalCards,
        periodCards,
        avgProcessingTime: avgProcessingTime[0]?.avgTime || 0,
        topExtractors,
        period
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

module.exports = router;