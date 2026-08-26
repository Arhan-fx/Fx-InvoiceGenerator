document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];

    document.getElementById('invoiceNumber').value = 'INV-' + Math.floor(1000 + Math.random() * 9000);

    setupTheme();
    setupFormListeners();
    setupFolioRail();

    addItemRow();

    document.getElementById('addItem').addEventListener('click', addItemRow);
    document.getElementById('generatePdf').addEventListener('click', generatePdf);
    document.getElementById('printInvoice').addEventListener('click', () => window.print());
    document.getElementById('clearAll').addEventListener('click', clearAll);

    updateInvoicePreview();
}

/* ---------------- Theme ---------------- */
function setupTheme() {
    const toggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem('ledger-theme') || 'dark';
    applyTheme(saved);
    toggle.checked = saved === 'light';

    toggle.addEventListener('change', () => {
        const theme = toggle.checked ? 'light' : 'dark';
        applyTheme(theme);
        localStorage.setItem('ledger-theme', theme);
    });
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

/* ---------------- Folio rail (scrollspy + click-to-scroll) ---------------- */
function setupFolioRail() {
    const tabs = Array.from(document.querySelectorAll('.folio-tab'));

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(tab.dataset.target);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const sections = tabs
        .map(tab => document.getElementById(tab.dataset.target))
        .filter(Boolean);

    if (!('IntersectionObserver' in window) || sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                tabs.forEach(t => t.classList.toggle('is-active', t.dataset.target === id));
            }
        });
    }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));
}

/* ---------------- Form wiring ---------------- */
function setupFormListeners() {
    const previewFields = [
        'companyName', 'companyEmail', 'companyAddress', 'companyPhone',
        'clientName', 'clientEmail', 'clientAddress', 'clientPhone',
        'invoiceNumber', 'invoiceDate', 'dueDate', 'notes'
    ];
    previewFields.forEach(id => {
        document.getElementById(id).addEventListener('input', updateInvoicePreview);
    });

    document.getElementById('taxRate').addEventListener('input', calculateTotals);
    document.getElementById('discount').addEventListener('input', calculateTotals);
}

function addItemRow() {
    const itemsContainer = document.getElementById('itemsContainer');
    const itemId = Date.now() + Math.floor(Math.random() * 1000);

    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.dataset.id = itemId;

    itemRow.innerHTML = `
        <div class="col-desc"><input type="text" class="item-desc" placeholder="Design &amp; art direction, week 1"></div>
        <div class="col-qty"><input type="number" class="item-qty" value="1" min="1" step="1"></div>
        <div class="col-price"><input type="number" class="item-price" value="0" min="0" step="0.01"></div>
        <div class="col-amount"><span class="item-amount">$0.00</span></div>
        <div class="col-action"><button class="remove-item" data-id="${itemId}" type="button" aria-label="Remove line">&times;</button></div>
    `;

    itemsContainer.appendChild(itemRow);

    const descInput = itemRow.querySelector('.item-desc');
    const qtyInput = itemRow.querySelector('.item-qty');
    const priceInput = itemRow.querySelector('.item-price');
    const removeBtn = itemRow.querySelector('.remove-item');

    descInput.addEventListener('input', updateInvoicePreview);
    [qtyInput, priceInput].forEach(input => {
        input.addEventListener('input', () => {
            calculateItemTotal(itemRow);
            calculateTotals();
        });
    });
    removeBtn.addEventListener('click', () => {
        itemRow.remove();
        calculateTotals();
    });

    descInput.focus();
}

function calculateItemTotal(itemRow) {
    const qty = parseFloat(itemRow.querySelector('.item-qty').value) || 0;
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;

    itemRow.querySelector('.item-amount').textContent = formatCurrency(qty * price);
}

function calculateTotals() {
    const itemRows = document.querySelectorAll('#itemsContainer .item-row');
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const discount = parseFloat(document.getElementById('discount').value) || 0;

    let subtotal = 0;

    itemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        subtotal += qty * price;
    });

    const totalTax = subtotal * (taxRate / 100);
    const total = subtotal + totalTax - discount;

    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('taxAmount').textContent = formatCurrency(totalTax);
    document.getElementById('discountAmount').textContent = formatSigned(-discount);
    document.getElementById('totalAmount').textContent = formatCurrency(total);

    updateInvoicePreview();
}

function updateInvoicePreview() {
    setText('previewCompanyName', field('companyName'), 'Your Company LLC');
    setText('previewCompanyAddress', field('companyAddress'), '123 Business St, City, Country');
    setText('previewCompanyContact', `${field('companyEmail') || 'contact@company.com'} · ${field('companyPhone') || '+1 (555) 123-4567'}`);

    setText('previewClientName', field('clientName'), 'Client Company LLC');
    setText('previewClientAddress', field('clientAddress'), '123 Client St, City, Country');
    setText('previewClientContact', `${field('clientEmail') || 'contact@client.com'} · ${field('clientPhone') || '+1 (555) 987-6543'}`);

    setText('previewInvoiceNumber', field('invoiceNumber'), 'INV-001');

    const invoiceDate = field('invoiceDate');
    setText('previewInvoiceDate', invoiceDate ? formatDate(invoiceDate) : 'Jan 1, 2026');

    const dueDate = field('dueDate');
    setText('previewDueDate', dueDate ? formatDate(dueDate) : 'Jan 15, 2026');

    setText('previewNotes', field('notes'), 'Thank you for your business.');

    const previewItemsContainer = document.getElementById('previewItemsContainer');
    previewItemsContainer.innerHTML = '';
    const itemRows = document.querySelectorAll('#itemsContainer .item-row');

    if (itemRows.length === 0) {
        previewItemsContainer.innerHTML = '<div class="preview-item-row empty-message">No items added yet</div>';
    } else {
        itemRows.forEach(row => {
            const desc = row.querySelector('.item-desc').value || 'Item description';
            const qty = row.querySelector('.item-qty').value || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const amount = row.querySelector('.item-amount').textContent;

            const previewRow = document.createElement('div');
            previewRow.className = 'preview-item-row';
            previewRow.innerHTML = `
                <span class="col-desc">${escapeHtml(desc)}</span>
                <span class="col-qty">${qty}</span>
                <span class="col-price mono-value">${formatCurrency(price)}</span>
                <span class="col-total mono-value">${amount}</span>
            `;
            previewItemsContainer.appendChild(previewRow);
        });
    }

    setText('previewSubtotal', document.getElementById('subtotal').textContent);
    setText('previewTax', document.getElementById('taxAmount').textContent);
    setText('previewDiscount', document.getElementById('discountAmount').textContent);
    setText('previewTotal', document.getElementById('totalAmount').textContent);
}

/* ---------------- Helpers ---------------- */
function field(id) { return document.getElementById(id).value.trim(); }
function setText(id, value, fallback) { document.getElementById(id).textContent = value || fallback || value; }
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function formatCurrency(amount) {
    return '$' + parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}
function formatSigned(amount) {
    const n = parseFloat(amount || 0);
    const sign = n < 0 ? '\u2212' : '';
    return sign + formatCurrency(Math.abs(n));
}
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
}

/* ---------------- PDF export ---------------- */
async function generatePdf() {
    const btn = document.getElementById('generatePdf');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="stamp-ring">…</span> Generating…';
    btn.disabled = true;

    let captureWrapper = null;

    try {
        const { jsPDF } = window.jspdf;

        // Render a fixed-width, A4-proportioned clone offscreen so the exported
        // page always has correct proportions, regardless of the on-screen
        // column width (which shrinks on smaller/narrower viewports).
        const invoicePreview = document.getElementById('invoicePreview');
        captureWrapper = document.createElement('div');
        captureWrapper.className = 'pdf-capture-wrapper';
        captureWrapper.appendChild(invoicePreview.cloneNode(true));
        document.body.appendChild(captureWrapper);

        const canvas = await html2canvas(captureWrapper, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FBF7EE',
            windowWidth: 794
        });

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/png');

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const usableWidth = pageWidth - margin * 2;
        const usableHeight = pageHeight - margin * 2;
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        let heightLeft = imgHeight;
        let renderedHeight = 0;

        doc.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
        heightLeft -= usableHeight;

        while (heightLeft > 0) {
            renderedHeight += usableHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', margin, margin - renderedHeight, usableWidth, imgHeight);
            heightLeft -= usableHeight;
        }

        const invoiceNumber = document.getElementById('invoiceNumber').value || 'invoice';
        doc.save(`${invoiceNumber}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Could not generate the PDF. Please try again.');
    } finally {
        if (captureWrapper) captureWrapper.remove();
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

function clearAll() {
    if (!confirm('Clear every field on this invoice?')) return;

    document.querySelectorAll('.ledger-form input[type="text"], .ledger-form input[type="email"], .ledger-form input[type="tel"], .ledger-form textarea').forEach(input => {
        input.value = '';
    });

    document.getElementById('taxRate').value = '10';
    document.getElementById('discount').value = '0';
    document.getElementById('itemsContainer').innerHTML = '';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];

    document.getElementById('invoiceNumber').value = 'INV-' + Math.floor(1000 + Math.random() * 9000);

    addItemRow();
    calculateTotals();
}
