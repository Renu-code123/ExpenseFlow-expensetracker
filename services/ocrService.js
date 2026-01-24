// Simple OCR service without tesseract
class OCRService {
  async extractText(imagePath) {
    // Simplified OCR - return mock data
    return {
      success: false,
      message: 'OCR not available in simplified version',
      text: '',
      confidence: 0
    };
  }

  async extractReceiptData(imagePath) {
    return {
      success: false,
      message: 'Receipt extraction not available in simplified version',
      data: {
        merchant: '',
        amount: 0,
        date: new Date(),
        items: []
      }
    };
  }
}

module.exports = new OCRService();