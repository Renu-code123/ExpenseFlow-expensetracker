const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const parsingService = require('./parsingService');

/**
 * OCR Service for receipt processing
 */
class OCRService {
    /**
     * Process an image buffer and extract structured data
     * @param {Buffer} buffer - Image buffer
     * @returns {Object} - Extracted structured data
     */
    async processReceipt(buffer) {
        try {
            // 1. Pre-process image for better OCR results
            const processedBuffer = await this.preprocessImage(buffer);

            // 2. Run OCR
            const { data: { text, confidence } } = await Tesseract.recognize(
                processedBuffer,
                'eng',
                {
                    logger: m => console.log(`[OCR Progress] ${m.status}: ${Math.round(m.progress * 100)}%`)
                }
            );

            // 3. Parse text into structured fields
            const structuredData = parsingService.parseReceiptText(text);

            return {
                rawText: text,
                ocrConfidence: confidence,
                ...structuredData
            };
        } catch (error) {
            console.error('[OCR Service] Error:', error);
            throw new Error('Failed to process receipt imagery');
        }
    }

    /**
     * Pre-process image to improve OCR accuracy
     * (Grayscale, Thresholding, Resize)
     */
    async preprocessImage(buffer) {
        return await sharp(buffer)
            .grayscale() // Convert to grayscale
            .resize(2000, null, { // Scale up for better character recognition
                withoutEnlargement: false,
                fit: 'inside'
            })
            .normalize() // Enhance contrast
            .toBuffer();
    }
}

module.exports = new OCRService();
