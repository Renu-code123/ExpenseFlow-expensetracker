// Simple export service without pdfkit
class ExportService {
  exportToCSV(data, filename = 'expenses.csv') {
    if (!data || data.length === 0) {
      return { success: false, message: 'No data to export' };
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header] || '').join(','))
    ].join('\n');

    return {
      success: true,
      content: csvContent,
      filename,
      contentType: 'text/csv'
    };
  }

  exportToJSON(data, filename = 'expenses.json') {
    return {
      success: true,
      content: JSON.stringify(data, null, 2),
      filename,
      contentType: 'application/json'
    };
  }

  exportToPDF(data, filename = 'expenses.pdf') {
    // Simplified PDF export - just return JSON for now
    return {
      success: false,
      message: 'PDF export not available in simplified version'
    };
  }
}

module.exports = new ExportService();