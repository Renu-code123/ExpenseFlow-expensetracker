/**
 * Receipt OCR Frontend Logic
 */
const RECEIPT_API_URL = 'http://localhost:3000/api/receipts';

let currentScanData = null;

async function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

/**
 * Handle receipt file selection and upload for scanning
 */
async function handleReceiptScan(file) {
    if (!file) return;

    showOCRNotification('Scanning receipt... This may take a few seconds.', 'info');
    toggleOverlay(true, 'AI is reading your receipt...');

    const formData = new FormData();
    formData.append('receipt', file);

    try {
        const response = await fetch(`${RECEIPT_API_URL}/scan`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: formData
        });

        const result = await response.json();
        toggleOverlay(false);

        if (!response.ok) throw new Error(result.error || 'Failed to scan receipt');

        currentScanData = result.data;
        openOCRResultModal(result.data);
    } catch (error) {
        toggleOverlay(false);
        console.error('Scan error:', error);
        showOCRNotification(error.message, 'error');
    }
}

/**
 * Open Modal to show OCR results and allow confirmation
 */
function openOCRResultModal(data) {
    const modal = document.getElementById('ocr-result-modal');
    if (!modal) return;

    // Fill modal fields
    document.getElementById('ocr-merchant').value = data.merchant || '';
    document.getElementById('ocr-amount').value = data.amount || '';
    document.getElementById('ocr-date').value = data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('ocr-category').value = data.category || 'other';
    document.getElementById('ocr-preview-img').src = data.fileUrl;

    const confidenceBar = document.getElementById('ocr-confidence-bar');
    if (confidenceBar) {
        confidenceBar.style.width = `${data.confidence}%`;
        confidenceBar.className = `progress-fill ${data.confidence > 80 ? 'high' : (data.confidence > 50 ? 'medium' : 'low')}`;
    }

    modal.classList.add('active');
}

/**
 * Save confirmed data as a new expense
 */
async function saveScannedExpense() {
    if (!currentScanData) return;

    const confirmedData = {
        merchant: document.getElementById('ocr-merchant').value,
        amount: parseFloat(document.getElementById('ocr-amount').value),
        date: document.getElementById('ocr-date').value,
        category: document.getElementById('ocr-category').value,
        description: `Receipt from ${document.getElementById('ocr-merchant').value}`,
        fileUrl: currentScanData.fileUrl,
        cloudinaryId: currentScanData.cloudinaryId,
        originalName: currentScanData.originalName
    };

    try {
        toggleOverlay(true, 'Saving expense...');
        const response = await fetch(`${RECEIPT_API_URL}/save-scanned`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...await getAuthHeaders()
            },
            body: JSON.stringify(confirmedData)
        });

        const result = await response.json();
        toggleOverlay(false);

        if (!response.ok) throw new Error(result.error || 'Failed to save expense');

        showOCRNotification('Expense added successfully from receipt!', 'success');
        closeOCRModal();

        // Trigger dashboard refresh if available
        if (typeof updateAllData === 'function') updateAllData();
        else if (typeof fetchExpenses === 'function') fetchExpenses();

    } catch (error) {
        toggleOverlay(false);
        showOCRNotification(error.message, 'error');
    }
}

function closeOCRModal() {
    document.getElementById('ocr-result-modal')?.classList.remove('active');
    currentScanData = null;
}

function showOCRNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        alert(message);
    }
}

function toggleOverlay(show, message = '') {
    const overlay = document.getElementById('ocr-loading-overlay');
    if (!overlay) return;

    if (show) {
        overlay.querySelector('.loading-text').textContent = message;
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    const scanInput = document.getElementById('receipt-scan-input');
    if (scanInput) {
        scanInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleReceiptScan(e.target.files[0]);
            }
        });
    }

    const saveBtn = document.getElementById('ocr-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveScannedExpense);
    }
});
