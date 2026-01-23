/**
 * Parsing Service for extracting structured data from raw OCR text
 */
class ParsingService {
    /**
     * Parse structured data from receipt text
     * @param {string} text - Raw text from OCR
     * @returns {Object} - Parsed data (amount, date, merchant, category)
     */
    parseReceiptText(text) {
        if (!text) return null;

        const data = {
            amount: this.extractAmount(text),
            date: this.extractDate(text),
            merchant: this.extractMerchant(text),
            category: 'other',
            confidence: 0
        };

        if (data.merchant) {
            data.category = this.suggestCategory(data.merchant, text);
        }

        // Calculate overall confidence based on found fields
        let foundFields = 0;
        if (data.amount) foundFields++;
        if (data.date) foundFields++;
        if (data.merchant) foundFields++;

        data.confidence = Math.round((foundFields / 3) * 100);

        return data;
    }

    /**
     * Extract total amount from text
     */
    extractAmount(text) {
        // Look for patterns like "Total: 50.00", "Amount: $10", etc.
        const patterns = [
            /(?:total|amount|sum|net|balance|due|payable)[:\s]*[^\d]*(\d+(?:[.,]\d{2})?)/i,
            /(\d+(?:[.,]\d{2})?)\s*(?:total|amount|sum)/i,
            /(\d+(?:[.,]\d{2})?)/g // Fallback: first large number usually
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                // If it's the global match fallback, find the most likely total (usually near bottom or largest)
                if (pattern.global) {
                    const matches = [...text.matchAll(pattern)];
                    if (matches.length > 0) {
                        const values = matches.map(m => parseFloat(m[1].replace(',', '.')));
                        // Filter realistic values and return max (since totals are usually the largest)
                        const realisticValues = values.filter(v => v > 0.5 && v < 1000000);
                        if (realisticValues.length > 0) return Math.max(...realisticValues);
                    }
                    continue;
                }
                return parseFloat(match[1].replace(',', '.'));
            }
        }
        return null;
    }

    /**
     * Extract date from text
     */
    extractDate(text) {
        const patterns = [
            /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, // DD/MM/YYYY or MM/DD/YYYY
            /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+\d{4}/i,
            /\d{4}[\-\/](\d{1,2})[\-\/](\d{1,2})/ // YYYY-MM-DD
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const parsedDate = new Date(match[0]);
                if (!isNaN(parsedDate.getTime())) {
                    // Sanity check: date shouldn't be too far in future
                    if (parsedDate > new Date(Date.now() + 86400000)) continue;
                    return parsedDate;
                }
            }
        }
        return null;
    }

    /**
     * Extract merchant name (usually first few lines)
     */
    extractMerchant(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        if (lines.length === 0) return null;

        // Typically the first line is the merchant name
        // Skip common headers
        const skipList = ['receipt', 'invoice', 'order', 'tax', 'bill'];
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
            const line = lines[i].toLowerCase();
            if (!skipList.some(skip => line.includes(skip)) && lines[i].length > 2) {
                return lines[i];
            }
        }
        return lines[0];
    }

    /**
     * Suggest category based on merchant and keywords
     */
    suggestCategory(merchant, text) {
        const lowerMerchant = merchant.toLowerCase();
        const lowerText = text.toLowerCase();

        const mappings = {
            food: ['restaurant', 'cafe', 'mcdonald', 'starbucks', 'pizza', 'burger', 'food', 'eats', 'grill', 'bakery', 'swiggy', 'zomato'],
            transport: ['uber', 'ola', 'taxi', 'fuel', 'petrol', 'parking', 'metro', 'train', 'flight', 'airline', 'irctc'],
            shopping: ['amazon', 'walmart', 'target', 'flipkart', 'myntra', 'nike', 'adidas', 'clothing', 'fashion', 'mall'],
            entertainment: ['netflix', 'spotify', 'cinema', 'theatre', 'movie', 'game', 'club', 'pvr', 'inox'],
            utilities: ['electric', 'water', 'gas', 'internet', 'mobile', 'recharge', 'bill', 'insurance'],
            healthcare: ['pharmacy', 'hospital', 'doctor', 'clinic', 'medical', 'medicine', 'lab']
        };

        for (const [cat, keywords] of Object.entries(mappings)) {
            if (keywords.some(kw => lowerMerchant.includes(kw) || lowerText.includes(kw))) {
                return cat;
            }
        }

        return 'other';
    }
}

module.exports = new ParsingService();
