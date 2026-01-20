# ExpenseFlow File Upload & Receipt Management

## Features Implemented

### 📎 Receipt Upload System
- Drag & drop file upload interface
- Image and PDF receipt support
- File compression and validation
- Cloud storage with Cloudinary
- OCR text extraction from receipts
- Automatic expense data extraction

## New Files Created

### Backend Files:
1. **`models/Receipt.js`** - Receipt metadata and OCR data model
2. **`services/fileUploadService.js`** - Cloudinary integration and OCR processing
3. **`middleware/uploadMiddleware.js`** - Multer file upload middleware
4. **`routes/receipts.js`** - Receipt management API endpoints

### Frontend Files:
1. **`receipt-upload.js`** - Complete upload UI with drag-drop and OCR display

### Updated Files:
1. **`package.json`** - Added multer, cloudinary, sharp, tesseract.js
2. **`.env`** - Added Cloudinary configuration
3. **`server.js`** - Added receipt routes

## Key Features

### ✅ File Upload
- **Drag & Drop Interface** - Intuitive file upload experience
- **File Validation** - Type and size restrictions (5MB max)
- **Image Compression** - Automatic optimization using Sharp
- **Cloud Storage** - Secure storage with Cloudinary CDN
- **Progress Indicators** - Real-time upload progress

### ✅ OCR Processing
- **Text Extraction** - Tesseract.js OCR engine
- **Amount Detection** - Automatic price extraction with regex
- **Date Recognition** - Receipt date parsing
- **Confidence Scoring** - OCR accuracy measurement
- **Auto-fill Forms** - Smart expense form population

### ✅ Receipt Management
- **Expense Linking** - Receipts tied to specific expenses
- **Multiple Formats** - Support for JPEG, PNG, PDF files
- **Metadata Storage** - File info, OCR data, timestamps
- **Secure Access** - User-specific receipt isolation
- **Easy Deletion** - Remove receipts with cloud cleanup

## API Endpoints

### Receipt Routes:
- **POST /api/receipts/upload/:expenseId** - Upload receipt for expense
- **GET /api/receipts/expense/:expenseId** - Get receipts for expense
- **GET /api/receipts** - Get all user receipts
- **DELETE /api/receipts/:receiptId** - Delete receipt
- **GET /api/receipts/:receiptId/ocr** - Get OCR data

## Setup Instructions

1. **Install dependencies:**
```bash
npm install multer cloudinary sharp tesseract.js
```

2. **Configure Cloudinary in `.env`:**
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

3. **Include frontend script:**
```html
<script src="receipt-upload.js"></script>
```

## Usage Flow

### Upload Process:
1. User creates/selects expense
2. Clicks "Add Receipt" button
3. Drags file or browses to select
4. File uploads with progress indicator
5. OCR processes image automatically
6. Extracted data displays with confidence score
7. Form auto-fills if OCR confidence > 70%

### OCR Data Extraction:
```javascript
{
  extractedText: "Full receipt text...",
  extractedAmount: 1250.00,
  extractedDate: "2024-01-15",
  confidence: 85.2
}
```

## File Processing Pipeline

### Image Processing:
1. **Validation** - Check file type and size
2. **Compression** - Optimize using Sharp (JPEG, 80% quality)
3. **Upload** - Store in Cloudinary with organized folders
4. **OCR** - Extract text using Tesseract.js
5. **Parsing** - Extract amounts and dates with regex
6. **Storage** - Save metadata and OCR results

### Security Features:
- **User Isolation** - Receipts accessible only by owner
- **File Validation** - Strict type and size limits
- **Secure URLs** - Cloudinary signed URLs
- **Error Handling** - Comprehensive validation and cleanup

## Frontend Integration

### Drag & Drop UI:
```javascript
// Initialize receipt manager
const receiptManager = new ReceiptManager();

// Show upload area for expense
receiptManager.showUploadArea(expenseId);

// Handle successful upload
receiptManager.showUploadSuccess(receipt);
```

### OCR Results Display:
- **Visual Feedback** - Extracted amount, date, confidence
- **Smart Auto-fill** - Populate expense form automatically
- **Confidence Indicator** - Show OCR accuracy percentage
- **Manual Override** - Users can edit extracted data

## Benefits

📎 **Digital Records** - Paperless receipt management  
🤖 **Smart Extraction** - Automatic data entry from images  
☁️ **Cloud Storage** - Secure, scalable file storage  
📱 **Mobile Friendly** - Works on all devices  
🔍 **OCR Technology** - Advanced text recognition  
💾 **Data Backup** - Receipts safely stored in cloud  

The receipt management system transforms ExpenseFlow into a comprehensive expense tracking solution with digital receipt storage and intelligent data extraction.

**Resolves: #48**