// Simple categorization service
class CategorizationService {
  categorize(description) {
    const categories = {
      'food': ['restaurant', 'grocery', 'cafe'],
      'transport': ['uber', 'taxi', 'bus'],
      'shopping': ['amazon', 'store', 'mall']
    };

    const desc = description.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }
    return 'other';
  }
}

module.exports = new CategorizationService();