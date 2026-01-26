const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const User = require('../models/User');
const reportService = require('./reportService');
const FinancialReport = require('../models/FinancialReport');

class PDFService {
    /**
     * Generate PDF for an existing report
     */
    static async generatePDFForReport(reportId, userId) {
        const report = await FinancialReport.findOne({
            _id: reportId,
            user: userId,
            status: 'ready'
        });

        if (!report) {
            throw new Error('Report not found or not ready');
        }

        // Use the reportService's PDF generation
        return reportService.generatePDF(userId, {
            startDate: report.dateRange.startDate,
            endDate: report.dateRange.endDate,
            currency: report.currency,
            includeCharts: true
        });
    }

    /**
     * Generate invoice PDF
     */
    static async generateInvoicePDF(invoiceId, userId) {
        try {
            // Fetch invoice with all related data
            const invoice = await Invoice.findOne({ _id: invoiceId, user: userId })
                .populate('client')
                .populate('user');
            
            if (!invoice) {
                throw new Error('Invoice not found');
            }
            
            // Create directory if it doesn't exist
            const pdfDir = path.join(__dirname, '../uploads/invoices');
            if (!fs.existsSync(pdfDir)) {
                fs.mkdirSync(pdfDir, { recursive: true });
            }
            
            const pdfPath = path.join(pdfDir, `invoice-${invoice.invoice_number}.pdf`);
            
            // Create PDF document
            const doc = new PDFDocument({ margin: 50 });
            const writeStream = fs.createWriteStream(pdfPath);
            
            doc.pipe(writeStream);
            
            // Generate PDF content
            this.generateInvoiceHeader(doc, invoice);
            this.generateInvoiceDetails(doc, invoice);
            this.generateInvoiceTable(doc, invoice);
            this.generateInvoiceTotals(doc, invoice);
            this.generateInvoiceFooter(doc, invoice);
            
            // Finalize PDF
            doc.end();
            
            // Wait for PDF to be written
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            
            // Update invoice with PDF URL
            invoice.pdf_url = `/uploads/invoices/invoice-${invoice.invoice_number}.pdf`;
            invoice.pdf_generated_at = new Date();
            await invoice.save();
            
            return {
                pdfPath,
                pdfUrl: invoice.pdf_url
            };
        } catch (error) {
            throw new Error(`Failed to generate invoice PDF: ${error.message}`);
        }
    }
    
    /**
     * Generate invoice header with company logo and info
     */
    static generateInvoiceHeader(doc, invoice) {
        // Company name
        doc.fontSize(20)
            .font('Helvetica-Bold')
            .text('ExpenseFlow', 50, 50);
        
        doc.fontSize(10)
            .font('Helvetica')
            .text('Invoice Management System', 50, 75)
            .moveDown();
        
        // Invoice title
        doc.fontSize(20)
            .font('Helvetica-Bold')
            .fillColor('#444444')
            .text('INVOICE', 350, 50, { align: 'right' });
        
        // Invoice number and date
        doc.fontSize(10)
            .font('Helvetica')
            .text(`Invoice #: ${invoice.invoice_number}`, 350, 75, { align: 'right' })
            .text(`Date: ${this.formatDate(invoice.invoice_date)}`, 350, 90, { align: 'right' })
            .text(`Due Date: ${this.formatDate(invoice.due_date)}`, 350, 105, { align: 'right' })
            .moveDown();
        
        // Status badge
        const statusY = 120;
        const statusColor = this.getStatusColor(invoice.status);
        doc.fillColor(statusColor)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(invoice.status.toUpperCase().replace('_', ' '), 350, statusY, { align: 'right' });
        
        doc.fillColor('#000000');
    }
    
    /**
     * Generate invoice details (bill to/from)
     */
    static generateInvoiceDetails(doc, invoice) {
        const detailsTop = 180;
        
        // Bill From
        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('From:', 50, detailsTop);
        
        doc.fontSize(10)
            .font('Helvetica')
            .text(invoice.user?.name || 'User', 50, detailsTop + 20)
            .text(invoice.user?.email || '', 50, detailsTop + 35)
            .moveDown();
        
        // Bill To
        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('Bill To:', 300, detailsTop);
        
        doc.fontSize(10)
            .font('Helvetica')
            .text(invoice.client.company_name || invoice.client.name, 300, detailsTop + 20)
            .text(invoice.client.email, 300, detailsTop + 35);
        
        if (invoice.client.address) {
            let addressY = detailsTop + 50;
            if (invoice.client.address.street) {
                doc.text(invoice.client.address.street, 300, addressY);
                addressY += 15;
            }
            const cityState = [
                invoice.client.address.city,
                invoice.client.address.state,
                invoice.client.address.postal_code
            ].filter(Boolean).join(', ');
            
            if (cityState) {
                doc.text(cityState, 300, addressY);
                addressY += 15;
            }
            
            if (invoice.client.address.country) {
                doc.text(invoice.client.address.country, 300, addressY);
            }
        }
        
        if (invoice.client.tax_id) {
            doc.text(`Tax ID: ${invoice.client.tax_id}`, 300, doc.y + 10);
        }
        
        doc.moveDown(2);
    }
    
    /**
     * Generate invoice items table
     */
    static generateInvoiceTable(doc, invoice) {
        const tableTop = 340;
        const itemCodeX = 50;
        const descriptionX = 100;
        const quantityX = 280;
        const priceX = 350;
        const amountX = 450;
        
        // Table header
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#444444');
        
        this.generateTableRow(
            doc,
            tableTop,
            '#',
            'Description',
            'Qty',
            'Unit Price',
            'Amount'
        );
        
        // Horizontal line
        doc.strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(50, tableTop + 20)
            .lineTo(550, tableTop + 20)
            .stroke();
        
        // Table rows
        doc.font('Helvetica')
            .fillColor('#000000');
        
        let yPosition = tableTop + 30;
        
        invoice.items.forEach((item, index) => {
            const itemTotal = item.amount || (item.quantity * item.unit_price);
            
            this.generateTableRow(
                doc,
                yPosition,
                (index + 1).toString(),
                item.description,
                item.quantity.toString(),
                this.formatCurrency(item.unit_price, invoice.currency),
                this.formatCurrency(itemTotal, invoice.currency)
            );
            
            yPosition += 25;
            
            // Add page if needed
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;
            }
        });
        
        // Line before totals
        doc.strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(50, yPosition)
            .lineTo(550, yPosition)
            .stroke();
        
        return yPosition + 20;
    }
    
    /**
     * Generate table row
     */
    static generateTableRow(doc, y, col1, col2, col3, col4, col5) {
        doc.fontSize(9)
            .text(col1, 50, y, { width: 40 })
            .text(col2, 100, y, { width: 170 })
            .text(col3, 280, y, { width: 60, align: 'right' })
            .text(col4, 350, y, { width: 80, align: 'right' })
            .text(col5, 450, y, { width: 100, align: 'right' });
    }
    
    /**
     * Generate invoice totals
     */
    static generateInvoiceTotals(doc, invoice) {
        const totalX = 400;
        let yPosition = doc.y + 20;
        
        doc.fontSize(10).font('Helvetica');
        
        // Subtotal
        doc.text('Subtotal:', totalX, yPosition)
            .text(this.formatCurrency(invoice.subtotal, invoice.currency), 480, yPosition, { align: 'right' });
        yPosition += 20;
        
        // Discount (if any)
        if (invoice.discount_amount > 0) {
            doc.text('Discount:', totalX, yPosition)
                .text(`-${this.formatCurrency(invoice.discount_amount, invoice.currency)}`, 480, yPosition, { align: 'right' });
            yPosition += 20;
        }
        
        // Tax
        if (invoice.tax_amount > 0) {
            doc.text(`Tax (${invoice.tax_rate}%):`, totalX, yPosition)
                .text(this.formatCurrency(invoice.tax_amount, invoice.currency), 480, yPosition, { align: 'right' });
            yPosition += 20;
        }
        
        // Late fee (if any)
        if (invoice.late_fee > 0) {
            doc.fillColor('#ff0000')
                .text('Late Fee:', totalX, yPosition)
                .text(this.formatCurrency(invoice.late_fee, invoice.currency), 480, yPosition, { align: 'right' });
            yPosition += 20;
            doc.fillColor('#000000');
        }
        
        // Total
        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('Total:', totalX, yPosition)
            .text(this.formatCurrency(invoice.total, invoice.currency), 480, yPosition, { align: 'right' });
        yPosition += 25;
        
        // Amount Paid
        if (invoice.amount_paid > 0) {
            doc.fontSize(10)
                .font('Helvetica')
                .text('Amount Paid:', totalX, yPosition)
                .text(this.formatCurrency(invoice.amount_paid, invoice.currency), 480, yPosition, { align: 'right' });
            yPosition += 20;
        }
        
        // Amount Due
        doc.fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(invoice.amount_due > 0 ? '#ff0000' : '#00aa00')
            .text('Amount Due:', totalX, yPosition)
            .text(this.formatCurrency(invoice.amount_due, invoice.currency), 480, yPosition, { align: 'right' });
        
        doc.fillColor('#000000');
    }
    
    /**
     * Generate invoice footer
     */
    static generateInvoiceFooter(doc, invoice) {
        const footerTop = 650;
        
        // Terms and notes
        if (invoice.terms) {
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Terms & Conditions:', 50, footerTop);
            
            doc.fontSize(9)
                .font('Helvetica')
                .text(invoice.terms, 50, footerTop + 15, { width: 500, align: 'left' });
        }
        
        if (invoice.notes) {
            const notesTop = invoice.terms ? footerTop + 60 : footerTop;
            
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Notes:', 50, notesTop);
            
            doc.fontSize(9)
                .font('Helvetica')
                .text(invoice.notes, 50, notesTop + 15, { width: 500, align: 'left' });
        }
        
        // Payment instructions
        if (invoice.payment_instructions) {
            const paymentTop = 720;
            
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Payment Instructions:', 50, paymentTop);
            
            doc.fontSize(9)
                .font('Helvetica')
                .text(invoice.payment_instructions, 50, paymentTop + 15, { width: 500, align: 'left' });
        }
    }
    
    /**
     * Generate payment receipt PDF
     */
    static async generateReceiptPDF(paymentId, userId) {
        try {
            const payment = await Payment.findOne({ _id: paymentId, user: userId })
                .populate('client')
                .populate('invoice')
                .populate('user');
            
            if (!payment) {
                throw new Error('Payment not found');
            }
            
            const pdfDir = path.join(__dirname, '../uploads/receipts');
            if (!fs.existsSync(pdfDir)) {
                fs.mkdirSync(pdfDir, { recursive: true });
            }
            
            const pdfPath = path.join(pdfDir, `receipt-${payment.receipt_number}.pdf`);
            
            const doc = new PDFDocument({ margin: 50 });
            const writeStream = fs.createWriteStream(pdfPath);
            
            doc.pipe(writeStream);
            
            // Receipt header
            doc.fontSize(24)
                .font('Helvetica-Bold')
                .text('PAYMENT RECEIPT', 50, 50, { align: 'center' });
            
            doc.fontSize(12)
                .font('Helvetica')
                .text(`Receipt #: ${payment.receipt_number}`, 50, 100, { align: 'center' })
                .text(`Date: ${this.formatDate(payment.payment_date)}`, 50, 120, { align: 'center' });
            
            // Payment details
            const detailsTop = 180;
            
            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('Payment Details', 50, detailsTop);
            
            doc.fontSize(10)
                .font('Helvetica')
                .text(`Received From:`, 50, detailsTop + 30)
                .text(payment.client.company_name || payment.client.name, 200, detailsTop + 30)
                .text(`Amount:`, 50, detailsTop + 50)
                .text(this.formatCurrency(payment.amount, payment.currency), 200, detailsTop + 50)
                .text(`Payment Method:`, 50, detailsTop + 70)
                .text(payment.payment_method.replace('_', ' ').toUpperCase(), 200, detailsTop + 70)
                .text(`Invoice:`, 50, detailsTop + 90)
                .text(payment.invoice.invoice_number, 200, detailsTop + 90);
            
            if (payment.transaction_id) {
                doc.text(`Transaction ID:`, 50, detailsTop + 110)
                    .text(payment.transaction_id, 200, detailsTop + 110);
            }
            
            if (payment.notes) {
                doc.text(`Notes:`, 50, detailsTop + 130)
                    .text(payment.notes, 200, detailsTop + 130, { width: 300 });
            }
            
            // Thank you message
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .text('Thank you for your payment!', 50, 450, { align: 'center' });
            
            doc.end();
            
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            
            payment.receipt_url = `/uploads/receipts/receipt-${payment.receipt_number}.pdf`;
            await payment.save();
            
            return {
                pdfPath,
                pdfUrl: payment.receipt_url
            };
        } catch (error) {
            throw new Error(`Failed to generate receipt PDF: ${error.message}`);
        }
    }
    
    /**
     * Helper: Format date
     */
    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    /**
     * Helper: Format currency
     */
    static formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
    
    /**
     * Helper: Get status color
     */
    static getStatusColor(status) {
        const colors = {
            draft: '#888888',
            sent: '#0066cc',
            viewed: '#00aaff',
            partially_paid: '#ff9900',
            paid: '#00aa00',
            overdue: '#ff0000',
            cancelled: '#666666',
            refunded: '#aa00aa'
        };
        
        return colors[status] || '#000000';
    }
}

module.exports = PDFService;
