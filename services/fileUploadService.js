const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class FileUploadService {
  
  // Upload file to Cloudinary
  async uploadToCloudinary(buffer, filename, folder = 'receipts') {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: folder,
          public_id: filename,
          quality: 'auto:good',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });
  }

  // Compress image using Sharp
  async compressImage(buffer, quality = 80) {
    try {
      return await sharp(buffer)
        .jpeg({ quality })
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .toBuffer();
    } catch (error) {
      throw new Error('Image compression failed');
    }
  }

  // Extract text from image using OCR
  async extractTextFromImage(imageUrl) {
    try {
      const { data: { text, confidence } } = await Tesseract.recognize(imageUrl, 'eng');
      
      // Extract amount using regex
      const amountRegex = /₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
      const amounts = [];
      let match;
      
      while ((match = amountRegex.exec(text)) !== null) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0) amounts.push(amount);
      }

      // Extract date using regex
      const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
      const dateMatch = dateRegex.exec(text);
      let extractedDate = null;
      
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        extractedDate = new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
      }

      return {
        extractedText: text.trim(),
        extractedAmount: amounts.length > 0 ? Math.max(...amounts) : null,
        extractedDate,
        confidence: confidence
      };
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        extractedText: '',
        extractedAmount: null,
        extractedDate: null,
        confidence: 0
      };
    }
  }

  // Validate file type and size
  validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB.');
    }

    return true;
  }

  // Get file type category
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype === 'application/pdf') return 'pdf';
    return 'unknown';
  }

  // Delete file from Cloudinary
  async deleteFromCloudinary(publicId) {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete from Cloudinary:', error);
      throw error;
    }
  }
}

module.exports = new FileUploadService();