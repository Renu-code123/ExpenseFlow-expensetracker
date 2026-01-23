const express = require('express');
const auth = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const fileUploadService = require('../services/fileUploadService');
const ocrService = require('../services/ocrService');
const parsingService = require('../services/parsingService');
const Receipt = require('../models/Receipt');
const Expense = require('../models/Expense');
const router = express.Router();

/**
 * @route   POST /api/receipts/scan
 * @desc    Upload receipt and extract data using AI OCR
 * @access  Private
 */
router.post('/scan', auth, upload, handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt image uploaded' });
    }

    // 1. Process OCR
    const extractedData = await ocrService.processReceipt(req.file.buffer);

    // 2. Temporarily upload to Cloudinary to provide a preview URL
    const filename = `scan_temp_${req.user._id}_${Date.now()}`;
    const uploadResult = await fileUploadService.uploadToCloudinary(
      req.file.buffer,
      filename,
      `temp_scans/${req.user._id}`
    );

    res.json({
      success: true,
      data: {
        ...extractedData,
        fileUrl: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id,
        originalName: req.file.originalname
      }
    });

  } catch (error) {
    console.error('[Receipt Scan] Error:', error);
    res.status(500).json({ error: 'Failed to scan receipt: ' + error.message });
  }
});

/**
 * @route   POST /api/receipts/save-scanned
 * @desc    Confirm scanned data and create expense + receipt record
 * @access  Private
 */
router.post('/save-scanned', auth, async (req, res) => {
  try {
    const {
      description,
      amount,
      category,
      date,
      merchant,
      fileUrl,
      cloudinaryId,
      originalName,
      type = 'expense'
    } = req.body;

    // 1. Create Expense
    const expense = new Expense({
      user: req.user._id,
      description: description || merchant || 'Receipt Expense',
      amount,
      category,
      type,
      merchant: merchant || '',
      date: date || new Date(),
      originalAmount: amount,
      originalCurrency: 'INR' // Defaulting to user preference or base system currency
    });

    await expense.save();

    // 2. Create Receipt reference
    const receipt = new Receipt({
      user: req.user._id,
      expense: expense._id,
      filename: cloudinaryId.split('/').pop(),
      originalName,
      fileUrl,
      cloudinaryId,
      fileType: 'image',
      fileSize: 0, // Simplified for scan flow
      ocrData: {
        extractedText: 'Stored from scan flow',
        extractedAmount: amount,
        extractedDate: date,
        confidence: 100 // Manually confirmed by user
      }
    });

    await receipt.save();

    res.status(201).json({
      success: true,
      message: 'Expense created from receipt successfully',
      data: { expense, receipt }
    });

  } catch (error) {
    console.error('[Save Scanned] Error:', error);
    res.status(500).json({ error: 'Failed to save scanned expense' });
  }
});

// Upload receipt for expense
router.post('/upload/:expenseId', auth, upload, handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify expense belongs to user
    const expense = await Expense.findOne({ _id: req.params.expenseId, user: req.user._id });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    let processedBuffer = req.file.buffer;
    const fileType = fileUploadService.getFileType(req.file.mimetype);

    // Compress image if it's an image file
    if (fileType === 'image') {
      processedBuffer = await fileUploadService.compressImage(req.file.buffer);
    }

    // Generate unique filename
    const filename = `receipt_${req.params.expenseId}_${Date.now()}`;

    // Upload to Cloudinary
    const uploadResult = await fileUploadService.uploadToCloudinary(
      processedBuffer,
      filename,
      `receipts/${req.user._id}`
    );

    // Create receipt record
    const receipt = new Receipt({
      user: req.user._id,
      expense: req.params.expenseId,
      filename: filename,
      originalName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      fileType: fileType,
      fileSize: processedBuffer.length
    });

    // Perform OCR for images
    if (fileType === 'image') {
      try {
        const ocrData = await fileUploadService.extractTextFromImage(uploadResult.secure_url);
        receipt.ocrData = ocrData;
      } catch (ocrError) {
        console.error('OCR processing failed:', ocrError);
      }
    }

    await receipt.save();

    res.status(201).json({
      message: 'Receipt uploaded successfully',
      receipt: {
        id: receipt._id,
        filename: receipt.filename,
        fileUrl: receipt.fileUrl,
        fileType: receipt.fileType,
        ocrData: receipt.ocrData
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get receipts for expense
router.get('/expense/:expenseId', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.expenseId, user: req.user._id });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const receipts = await Receipt.find({
      expense: req.params.expenseId,
      user: req.user._id
    }).select('-cloudinaryId');

    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all receipts for user
router.get('/', auth, async (req, res) => {
  try {
    const receipts = await Receipt.find({ user: req.user._id })
      .populate('expense', 'description amount category type date')
      .select('-cloudinaryId')
      .sort({ createdAt: -1 });

    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete receipt
router.delete('/:receiptId', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.receiptId,
      user: req.user._id
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Delete from Cloudinary
    await fileUploadService.deleteFromCloudinary(receipt.cloudinaryId);

    // Delete from database
    await Receipt.findByIdAndDelete(req.params.receiptId);

    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get OCR data for receipt
router.get('/:receiptId/ocr', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.receiptId,
      user: req.user._id
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (!receipt.ocrData) {
      return res.status(404).json({ error: 'No OCR data available' });
    }

    res.json(receipt.ocrData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
