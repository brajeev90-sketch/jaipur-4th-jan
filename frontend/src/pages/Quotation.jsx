import { useState, useEffect } from 'react';
import { productsApi, quotationsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Download,
  Search,
  Send,
  Package,
  Calculator,
  Copy,
  Edit,
  Eye,
  History,
  Save,
  X,
  Loader2,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';

// Resize and convert image to WebP - FAST version
const optimizeImage = (base64Image, maxSize = 600, quality = 0.6) => {
  return new Promise((resolve) => {
    if (!base64Image || !base64Image.startsWith('data:image')) {
      resolve(base64Image);
      return;
    }
    
    // Skip if already small (less than 50KB)
    if (base64Image.length < 50000) {
      resolve(base64Image);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Calculate new dimensions (max 600px for quotations)
      let width = img.width;
      let height = img.height;
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to WebP with aggressive compression
      const optimized = canvas.toDataURL('image/webp', quality);
      resolve(optimized);
    };
    img.onerror = () => resolve(base64Image);
    img.src = base64Image;
  });
};

// Batch optimize all images in quotation - runs in parallel
const optimizeQuotationImages = async (items) => {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      image: item.image ? await optimizeImage(item.image) : ''
    }))
  );
};

export default function Quotation() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [quotationItems, setQuotationItems] = useState([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [savedQuotations, setSavedQuotations] = useState([]);
  const [showSavedQuotes, setShowSavedQuotes] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [viewQuotePopup, setViewQuotePopup] = useState(false);
  const [viewQuoteData, setViewQuoteData] = useState(null);
  const [editQuotePopup, setEditQuotePopup] = useState(false);
  const [editQuoteData, setEditQuoteData] = useState(null);
  const [loadingQuoteId, setLoadingQuoteId] = useState(null); // Track which quote is being loaded
  const [quotationDetails, setQuotationDetails] = useState({
    customer_name: '',
    customer_email: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    currency: 'FOB_USD'
  });

  // Fetch full quotation data by ID (with items)
  const fetchFullQuotation = async (quoteId) => {
    try {
      setLoadingQuoteId(quoteId);
      const response = await quotationsApi.getById(quoteId);
      return response.data;
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error('Failed to load quotation data');
      return null;
    } finally {
      setLoadingQuoteId(null);
    }
  };

  // Handle View button - fetch full data first
  const handleViewQuotation = async (quote) => {
    const fullQuote = await fetchFullQuotation(quote.id);
    if (fullQuote) {
      setViewQuoteData(fullQuote);
      setViewQuotePopup(true);
    }
  };

  // Handle Edit button - fetch full data first
  const handleEditQuotation = async (quote) => {
    const fullQuote = await fetchFullQuotation(quote.id);
    if (fullQuote) {
      setEditQuoteData(fullQuote);
      setEditQuotePopup(true);
    }
  };

  useEffect(() => {
    loadProducts();
    loadSavedQuotations();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsApi.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedQuotations = async () => {
    try {
      const response = await quotationsApi.getAll();
      setSavedQuotations(response.data);
    } catch (error) {
      console.error('Error loading quotations:', error);
    }
  };

  const addProductToQuotation = (product) => {
    const existingItem = quotationItems.find(item => item.product_code === product.product_code);
    if (existingItem) {
      toast.info('Product already added to quotation');
      return;
    }

    // Get price based on selected price type
    let fobPrice = 0;
    switch(quotationDetails.currency) {
      case 'FOB_USD':
        fobPrice = product.fob_price_usd || 0;
        break;
      case 'FOB_GBP':
        fobPrice = product.fob_price_gbp || 0;
        break;
      case 'WH_700':
        fobPrice = product.warehouse_price_1 || product.warehouse_price_700 || 0;
        break;
      case 'WH_2000':
        fobPrice = product.warehouse_price_2 || product.warehouse_price_2000 || 0;
        break;
      default:
        fobPrice = product.fob_price_usd || 0;
    }

    const newItem = {
      id: product.id,
      product_code: product.product_code,
      description: product.description,
      height_cm: product.height_cm,
      depth_cm: product.depth_cm,
      width_cm: product.width_cm,
      cbm: product.cbm,
      quantity: 1,
      fob_price: fobPrice,
      total: fobPrice,
      image: product.image || ''
    };

    setQuotationItems([...quotationItems, newItem]);
    toast.success(`Added ${product.product_code} to quotation`);
  };

  const removeItem = (id) => {
    setQuotationItems(quotationItems.filter(item => item.id !== id));
    toast.success('Item removed');
  };

  const updateItemQuantity = (id, quantity) => {
    setQuotationItems(quotationItems.map(item => {
      if (item.id === id) {
        const qty = parseInt(quantity) || 1;
        return { ...item, quantity: qty, total: item.fob_price * qty };
      }
      return item;
    }));
  };

  const updateItemPrice = (id, price) => {
    setQuotationItems(quotationItems.map(item => {
      if (item.id === id) {
        const fobPrice = parseFloat(price) || 0;
        return { ...item, fob_price: fobPrice, total: fobPrice * item.quantity };
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const totalItems = quotationItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCBM = quotationItems.reduce((sum, item) => sum + (item.cbm * item.quantity), 0);
    const totalValue = quotationItems.reduce((sum, item) => sum + item.total, 0);
    return { totalItems, totalCBM: totalCBM.toFixed(2), totalValue: totalValue.toFixed(2) };
  };

  const handleSaveQuotation = async () => {
    if (saving) return false;
    
    if (quotationItems.length === 0) {
      toast.error('Please add products to the quotation');
      return false;
    }

    setSaving(true);
    
    try {
      // Optimize images (resize + compress) - very fast
      const optimizedItems = await optimizeQuotationImages(quotationItems);
      
      const totals = calculateTotals();
      const quotationData = {
        ...quotationDetails,
        items: optimizedItems,
        total_items: totals.totalItems,
        total_cbm: parseFloat(totals.totalCBM),
        total_value: parseFloat(totals.totalValue),
        status: 'draft'
      };

      if (editingQuotationId) {
        await quotationsApi.update(editingQuotationId, quotationData);
        toast.success('Quotation updated!');
      } else {
        const response = await quotationsApi.create(quotationData);
        if (response.data && response.data.id) {
          setEditingQuotationId(response.data.id);
        }
        toast.success('Quotation saved!');
      }
      loadSavedQuotations();
      return true;
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleLoadQuotation = (quotation) => {
    setQuotationDetails({
      customer_name: quotation.customer_name || '',
      customer_email: quotation.customer_email || '',
      reference: quotation.reference || '',
      date: quotation.date || new Date().toISOString().split('T')[0],
      notes: quotation.notes || '',
      currency: quotation.currency || 'USD'
    });
    setQuotationItems(quotation.items || []);
    setEditingQuotationId(quotation.id);
    setShowSavedQuotes(false);
    toast.success(`Loaded quotation: ${quotation.reference}`);
  };

  const handleDuplicateQuotation = async (quotation) => {
    try {
      await quotationsApi.duplicate(quotation.id);
      loadSavedQuotations();
      toast.success('Quotation duplicated!');
    } catch (error) {
      toast.error('Failed to duplicate quotation');
    }
  };

  const handleDeleteQuotation = async (quotation) => {
    if (!window.confirm(`Delete quotation ${quotation.reference}?`)) return;
    try {
      await quotationsApi.delete(quotation.id);
      loadSavedQuotations();
      toast.success('Quotation deleted');
    } catch (error) {
      toast.error('Failed to delete quotation');
    }
  };

  const handleNewQuotation = () => {
    setQuotationDetails({
      customer_name: '',
      customer_email: '',
      reference: `QT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      currency: 'FOB_USD'
    });
    setQuotationItems([]);
    setEditingQuotationId(null);
    setShowSavedQuotes(false);
  };

  // Get currency symbol and label
  const getCurrencyInfo = (currency) => {
    switch(currency) {
      case 'FOB_USD': return { symbol: '$', label: 'FOB India $' };
      case 'FOB_GBP': return { symbol: '£', label: 'FOB India £' };
      case 'WH_700': return { symbol: '£', label: 'Warehouse £700' };
      case 'WH_2000': return { symbol: '£', label: 'Warehouse £2000' };
      default: return { symbol: '$', label: 'FOB India $' };
    }
  };

  // Export quotation to Excel
  const handleExportExcel = () => {
    if (quotationItems.length === 0) {
      toast.error('Please add products to export');
      return;
    }

    const currencyInfo = getCurrencyInfo(quotationDetails.currency);
    const totals = calculateTotals();

    // Prepare data for Excel
    const excelData = quotationItems.map((item, idx) => ({
      'Sr No': idx + 1,
      'Product Code': item.product_code || '',
      'Description': item.description || '',
      'H': item.height_cm || 0,
      'D': item.depth_cm || 0,
      'W': item.width_cm || 0,
      'CBM': parseFloat(item.cbm) || 0,
      [`Price ${currencyInfo.label}`]: item.fob_price || 0,
      'QTY': item.quantity || 1,
      'Total CBM': (parseFloat(item.cbm) || 0) * (item.quantity || 1),
      'Total Price': (item.fob_price || 0) * (item.quantity || 1)
    }));

    // Add totals row
    excelData.push({
      'Sr No': '',
      'Product Code': '',
      'Description': 'TOTALS',
      'H': '',
      'D': '',
      'W': '',
      'CBM': '',
      [`Price ${currencyInfo.label}`]: '',
      'QTY': totals.totalItems,
      'Total CBM': parseFloat(totals.totalCBM),
      'Total Price': parseFloat(totals.totalValue)
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // Sr No
      { wch: 20 },  // Product Code
      { wch: 40 },  // Description
      { wch: 6 },   // H
      { wch: 6 },   // D
      { wch: 6 },   // W
      { wch: 8 },   // CBM
      { wch: 15 },  // Price
      { wch: 6 },   // QTY
      { wch: 12 },  // Total CBM
      { wch: 12 }   // Total Price
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quotation');

    // Generate filename
    const filename = `Quotation_${quotationDetails.reference || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
    toast.success('Excel file downloaded!');
  };

  // Generate quotation HTML content (reusable for both view and download)
  const generateQuotationHTML = () => {
    const totals = calculateTotals();
    const currencyInfo = getCurrencyInfo(quotationDetails.currency);
    const currencySymbol = currencyInfo.symbol;
    const priceLabel = currencyInfo.label;
    
    // Format date as DD-MM-YYYY
    const formatDateDDMMYYYY = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Group items into pairs for 2-per-page layout
    const itemPairs = [];
    for (let i = 0; i < quotationItems.length; i += 2) {
      itemPairs.push({
        left: quotationItems[i],
        right: quotationItems[i + 1] || null
      });
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quotationDetails.reference || 'QUOTE'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4 landscape; 
            margin: 10mm 15mm; 
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 10px 20px; 
            background: white;
            color: #333;
            font-size: 11px;
          }
          .page { 
            page-break-after: always; 
            width: 100%;
          }
          .page:last-child { page-break-after: auto; }
          
          /* Header */
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 2px solid #3d2c1e;
          }
          .logo {
            height: 40px;
            object-fit: contain;
          }
          .quote-info {
            text-align: right;
          }
          .quote-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 24px;
            font-weight: 700;
            color: #3d2c1e;
            letter-spacing: 3px;
          }
          .customer-info {
            font-size: 10px;
            color: #333;
            line-height: 1.4;
            margin-top: 2px;
          }
          
          /* Two column layout */
          .products-row {
            display: flex;
            gap: 15px;
          }
          .product-column {
            flex: 1;
            border: 1px solid #c0c0c0;
            padding: 6px 8px;
            display: flex;
            flex-direction: column;
          }
          .product-column.empty {
            background: #fafafa;
            border: 1px dashed #ccc;
          }
          
          /* Product Image - TIGHT LAYOUT */
          .product-image-section {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            height: 320px;
          }
          .product-image {
            max-width: 100%;
            max-height: 320px;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          .no-image {
            width: 100%;
            height: 250px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            border: 1px dashed #ccc;
            color: #888;
            font-size: 12px;
          }
          
          /* Product Details */
          .product-details {
            margin-top: 5px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .details-table .header-row th {
            background: #3d2c1e;
            color: white;
            padding: 6px 8px;
            text-align: center;
            font-weight: 600;
            font-size: 10px;
            letter-spacing: 0.5px;
            border: 1px solid #2d1e12;
          }
          .details-table .sub-header-row th {
            background: #5a4636;
            color: white;
            padding: 4px 6px;
            text-align: center;
            font-weight: 500;
            font-size: 9px;
            border: 1px solid #3d2c1e;
          }
          .details-table .sub-header-row th:empty {
            background: #3d2c1e;
          }
          .details-table .item-code-col { width: 18%; }
          .details-table .desc-col { width: 30%; }
          .details-table .size-col { width: 20%; }
          .details-table .size-sub { width: 6.66%; }
          .details-table .cbm-col { width: 12%; }
          .details-table .price-col { width: 15%; }
          .details-table td {
            padding: 6px 8px;
            border: 1px solid #ddd;
            text-align: center;
            background: white;
          }
          .details-table .item-code-cell {
            font-family: monospace;
            font-weight: bold;
            font-size: 11px;
            text-align: left;
          }
          .details-table .desc-cell {
            text-align: left;
            font-size: 10px;
            color: #333;
          }
          .details-table .size-cell {
            font-size: 10px;
          }
          .details-table .cbm-cell {
            font-size: 10px;
          }
          .details-table .price-cell {
            font-weight: bold;
            color: #000;
            font-size: 11px;
          }
          
          /* Footer - Only on last page */
          .footer-section {
            margin-top: 8px;
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .footer-text {
            font-size: 10px;
            color: #333;
            max-width: 60%;
            line-height: 1.4;
          }
          .footer-options {
            font-weight: bold;
            font-size: 9px;
            color: #3d2c1e;
            margin-top: 4px;
          }
          .summary-box {
            text-align: right;
            background: #f5f0eb;
            padding: 6px 10px;
            border-radius: 3px;
          }
          .summary-row {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            font-size: 10px;
            padding: 2px 0;
          }
          .grand-total {
            font-size: 12px;
            font-weight: bold;
            color: #3d2c1e;
            border-top: 1px solid #3d2c1e;
            margin-top: 3px;
            padding-top: 3px;
          }
          .page-number {
            text-align: center;
            font-size: 9px;
            color: #888;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        ${itemPairs.map((pair, pageIndex) => {
          const isLastPage = pageIndex === itemPairs.length - 1;
          
          const renderProduct = (item) => {
            if (!item) return '<div class="product-column empty"><div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;">No Product</div></div>';
            
            return `
              <div class="product-column">
                <div class="product-image-section">
                  ${item.image 
                    ? `<img src="${item.image}" alt="${item.product_code}" class="product-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="no-image" style="display:none;">Image Not Available</div>`
                    : `<div class="no-image">No Product Image</div>`
                  }
                </div>
                <div class="product-details">
                  <table class="details-table">
                    <thead>
                      <tr class="header-row">
                        <th class="item-code-col">ITEM CODE</th>
                        <th class="desc-col">DESCRIPTION</th>
                        <th class="size-col" colspan="3">SIZE (cm)</th>
                        <th class="cbm-col">CBM</th>
                        <th class="price-col">${priceLabel}</th>
                      </tr>
                      <tr class="sub-header-row">
                        <th></th>
                        <th></th>
                        <th class="size-sub">H</th>
                        <th class="size-sub">D</th>
                        <th class="size-sub">W</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="item-code-cell">${item.product_code}</td>
                        <td class="desc-cell">${item.description || '-'}</td>
                        <td class="size-cell">${item.height_cm || '-'}</td>
                        <td class="size-cell">${item.depth_cm || '-'}</td>
                        <td class="size-cell">${item.width_cm || '-'}</td>
                        <td class="cbm-cell">${item.cbm || '-'}</td>
                        <td class="price-cell">${currencySymbol}${item.fob_price?.toFixed(2) || '0.00'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          };
          
          return `
          <div class="page">
            <!-- Header -->
            <div class="header">
              <img src="https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg" alt="JAIPUR" class="logo" />
              <div class="quote-info">
                <div class="quote-title">QUOTATION</div>
                <div class="customer-info">
                  <strong>Ref:</strong> ${quotationDetails.reference || '-'} &nbsp;|&nbsp;
                  <strong>Date:</strong> ${formatDateDDMMYYYY(quotationDetails.date)} &nbsp;|&nbsp;
                  <strong>Customer:</strong> ${quotationDetails.customer_name || '-'}
                </div>
              </div>
            </div>
            
            <!-- Two Products Side by Side -->
            <div class="products-row">
              ${renderProduct(pair.left)}
              ${renderProduct(pair.right)}
            </div>
            
            <!-- Footer - validity text only on last page -->
            <div class="footer-section">
              ${isLastPage ? `
                <div class="footer-text">
                  This quotation is valid for 30 days from the date of issue.<br>
                  Prices are ${priceLabel}. Shipping and import duties not included.
                  <div class="footer-options">
                    UK WAREHOUSE • FACTORY DIRECT • SHARED CONTAINERS • TAILORED DESIGNS
                  </div>
                </div>
                <div class="summary-box">
                  <div class="summary-row">
                    <span>Total Items:</span>
                    <strong>${totals.totalItems} Pcs</strong>
                  </div>
                  <div class="summary-row">
                    <span>Total CBM:</span>
                    <strong>${totals.totalCBM} m³</strong>
                  </div>
                  <div class="summary-row grand-total">
                    <span>GRAND TOTAL:</span>
                    <strong>${currencySymbol}${totals.totalValue}</strong>
                  </div>
                </div>
              ` : `
                <div class="footer-options" style="width:100%;text-align:center;">
                  UK WAREHOUSE • FACTORY DIRECT • SHARED CONTAINERS • TAILORED DESIGNS
                </div>
              `}
            </div>
            
            <div class="page-number">Page ${pageIndex + 1} of ${itemPairs.length}</div>
          </div>
        `}).join('')}
      </body>
      </html>
    `;
  };

  // View/Print quote - opens in new window for viewing
  const handleViewQuote = () => {
    if (quotationItems.length === 0) {
      toast.error('Please add products to the quotation');
      return;
    }

    const quotationHTML = generateQuotationHTML();
    const viewWindow = window.open('', '_blank');
    viewWindow.document.write(quotationHTML);
    viewWindow.document.close();
    toast.success('Quotation opened for viewing');
  };

  const handleGenerateQuote = async () => {
    if (quotationItems.length === 0) {
      toast.error('Please add products to the quotation');
      return;
    }

    // Generate quotation and open print dialog (don't auto-save to prevent duplicates)
    try {
      const quotationHTML = generateQuotationHTML();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups for this site');
        return;
      }
      printWindow.document.write(quotationHTML + `
        <script>
          // Wait for images to load before printing
          window.onload = function() {
            var images = document.images;
            var loaded = 0;
            var total = images.length;
            
            if (total === 0) {
              setTimeout(function() { window.print(); }, 500);
              return;
            }
            
            for (var i = 0; i < total; i++) {
              if (images[i].complete) {
                loaded++;
              } else {
                images[i].onload = images[i].onerror = function() {
                  loaded++;
                  if (loaded >= total) {
                    setTimeout(function() { window.print(); }, 500);
                  }
                };
              }
            }
            
            if (loaded >= total) {
              setTimeout(function() { window.print(); }, 500);
            }
          };
        </script>
      `);
      printWindow.document.close();
      toast.success('Quotation generated - select "Save as PDF" to download');
    } catch (error) {
      console.error('Error generating quotation:', error);
      toast.error('Failed to generate quotation');
    }
  };

  // Print/PDF directly from a quotation object (used in View popup)
  const handlePrintQuotationDirect = (quotationData) => {
    if (!quotationData?.items || quotationData.items.length === 0) {
      toast.error('No items in this quotation');
      return;
    }

    // Generate HTML using the quotation data directly
    const currencyInfo = getCurrencyInfo(quotationData.currency || 'FOB_USD');
    const currencySymbol = currencyInfo.symbol;
    const priceLabel = currencyInfo.label;
    
    const formatDateDDMMYYYY = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const items = quotationData.items;
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalCBM = items.reduce((sum, item) => sum + ((item.cbm || 0) * (item.quantity || 1)), 0).toFixed(2);
    const totalValue = items.reduce((sum, item) => sum + (item.total || (item.fob_price * item.quantity) || 0), 0).toFixed(2);

    const itemPairs = [];
    for (let i = 0; i < items.length; i += 2) {
      itemPairs.push({
        left: items[i],
        right: items[i + 1] || null
      });
    }

    const renderProduct = (item) => {
      if (!item) return '<div class="product-column empty"><div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;">No Product</div></div>';
      
      return `
        <div class="product-column">
          <div class="product-image-section">
            ${item.image 
              ? `<img src="${item.image}" alt="${item.product_code}" class="product-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="no-image" style="display:none;">Image Not Available</div>`
              : `<div class="no-image">No Product Image</div>`
            }
          </div>
          <div class="product-details">
            <table class="details-table">
              <thead>
                <tr class="header-row">
                  <th class="item-code-col">ITEM CODE</th>
                  <th class="desc-col">DESCRIPTION</th>
                  <th class="size-col" colspan="3">SIZE (cm)</th>
                  <th class="cbm-col">CBM</th>
                  <th class="price-col">${priceLabel}</th>
                </tr>
                <tr class="sub-header-row">
                  <th></th>
                  <th></th>
                  <th class="size-sub">H</th>
                  <th class="size-sub">D</th>
                  <th class="size-sub">W</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="item-code-cell">${item.product_code}</td>
                  <td class="desc-cell">${item.description || '-'}</td>
                  <td class="size-cell">${item.height_cm || '-'}</td>
                  <td class="size-cell">${item.depth_cm || '-'}</td>
                  <td class="size-cell">${item.width_cm || '-'}</td>
                  <td class="cbm-cell">${item.cbm || '-'}</td>
                  <td class="price-cell">${currencySymbol}${item.fob_price?.toFixed(2) || '0.00'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    };

    const quotationHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quotationData.reference || 'QUOTE'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4 landscape; margin: 10mm 15mm; }
          body { font-family: Arial, sans-serif; padding: 10px 20px; background: white; color: #333; font-size: 11px; }
          .page { page-break-after: always; width: 100%; }
          .page:last-child { page-break-after: auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #3d2c1e; }
          .logo { height: 40px; object-fit: contain; }
          .quote-info { text-align: right; }
          .quote-title { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #3d2c1e; letter-spacing: 3px; }
          .customer-info { font-size: 10px; color: #333; line-height: 1.4; margin-top: 2px; }
          .products-row { display: flex; gap: 15px; }
          .product-column { flex: 1; border: 1px solid #c0c0c0; padding: 6px 8px; display: flex; flex-direction: column; }
          .product-column.empty { background: #fafafa; border: 1px dashed #ccc; }
          .product-image-section { display: flex; align-items: center; justify-content: center; padding: 0; height: 320px; }
          .product-image { max-width: 100%; max-height: 320px; width: auto; height: auto; object-fit: contain; }
          .no-image { width: 100%; height: 250px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border: 1px dashed #ccc; color: #888; font-size: 12px; }
          .product-details { margin-top: 5px; }
          .details-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .details-table .header-row th { background: #3d2c1e; color: white; padding: 6px 8px; text-align: center; font-weight: 600; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #2d1e12; }
          .details-table .sub-header-row th { background: #5a4636; color: white; padding: 4px 6px; text-align: center; font-weight: 500; font-size: 9px; border: 1px solid #3d2c1e; }
          .details-table .sub-header-row th:empty { background: #3d2c1e; }
          .details-table td { padding: 6px 8px; border: 1px solid #ddd; text-align: center; background: white; }
          .details-table .item-code-cell { font-family: monospace; font-weight: bold; font-size: 11px; text-align: left; }
          .details-table .desc-cell { text-align: left; font-size: 10px; color: #333; }
          .details-table .price-cell { font-weight: bold; color: #000; font-size: 11px; }
          .footer-section { margin-top: 8px; padding-top: 6px; display: flex; justify-content: space-between; align-items: flex-start; }
          .footer-text { font-size: 10px; color: #333; max-width: 60%; line-height: 1.4; }
          .footer-options { font-weight: bold; font-size: 9px; color: #3d2c1e; margin-top: 4px; }
          .summary-box { text-align: right; background: #f5f0eb; padding: 6px 10px; border-radius: 3px; }
          .summary-row { display: flex; justify-content: flex-end; gap: 10px; font-size: 10px; padding: 2px 0; }
          .grand-total { font-size: 12px; font-weight: bold; color: #3d2c1e; border-top: 1px solid #3d2c1e; margin-top: 3px; padding-top: 3px; }
          .page-number { text-align: center; font-size: 9px; color: #888; margin-top: 6px; }
        </style>
      </head>
      <body>
        ${itemPairs.map((pair, pageIndex) => {
          const isLastPage = pageIndex === itemPairs.length - 1;
          return `
          <div class="page">
            <div class="header">
              <img src="https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg" alt="JAIPUR" class="logo" />
              <div class="quote-info">
                <div class="quote-title">QUOTATION</div>
                <div class="customer-info">
                  <strong>Ref:</strong> ${quotationData.reference || '-'} &nbsp;|&nbsp;
                  <strong>Date:</strong> ${formatDateDDMMYYYY(quotationData.date)} &nbsp;|&nbsp;
                  <strong>Customer:</strong> ${quotationData.customer_name || '-'}
                </div>
              </div>
            </div>
            <div class="products-row">
              ${renderProduct(pair.left)}
              ${renderProduct(pair.right)}
            </div>
            <div class="footer-section">
              ${isLastPage ? `
                <div class="footer-text">
                  This quotation is valid for 30 days from the date of issue.<br>
                  Prices are ${priceLabel}. Shipping and import duties not included.
                  <div class="footer-options">UK WAREHOUSE • FACTORY DIRECT • SHARED CONTAINERS • TAILORED DESIGNS</div>
                </div>
                <div class="summary-box">
                  <div class="summary-row"><span>Total Items:</span><strong>${totalItems} Pcs</strong></div>
                  <div class="summary-row"><span>Total CBM:</span><strong>${totalCBM} m³</strong></div>
                  <div class="summary-row grand-total"><span>GRAND TOTAL:</span><strong>${currencySymbol}${totalValue}</strong></div>
                </div>
              ` : `<div class="footer-options" style="width:100%;text-align:center;">UK WAREHOUSE • FACTORY DIRECT • SHARED CONTAINERS • TAILORED DESIGNS</div>`}
            </div>
            <div class="page-number">Page ${pageIndex + 1} of ${itemPairs.length}</div>
          </div>
        `}).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups for this site');
      return;
    }
    printWindow.document.write(quotationHTML + `
      <script>
        window.onload = function() {
          var images = document.images;
          var loaded = 0;
          var total = images.length;
          if (total === 0) { setTimeout(function() { window.print(); }, 500); return; }
          for (var i = 0; i < total; i++) {
            if (images[i].complete) { loaded++; }
            else { images[i].onload = images[i].onerror = function() { loaded++; if (loaded >= total) { setTimeout(function() { window.print(); }, 500); } }; }
          }
          if (loaded >= total) { setTimeout(function() { window.print(); }, 500); }
        };
      </script>
    `);
    printWindow.document.close();
    toast.success('Quotation generated - select "Save as PDF" to download');
  };
  const addSelectedProducts = () => {
    const newItems = [];
    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product) {
        // Check if already exists
        const exists = quotationItems.some(item => item.product_code === product.product_code);
        if (!exists) {
          // Get price based on selected price type
          let fobPrice = 0;
          switch(quotationDetails.currency) {
            case 'FOB_USD':
              fobPrice = product.fob_price_usd || 0;
              break;
            case 'FOB_GBP':
              fobPrice = product.fob_price_gbp || 0;
              break;
            case 'WH_700':
              fobPrice = product.warehouse_price_1 || product.warehouse_price_700 || 0;
              break;
            case 'WH_2000':
              fobPrice = product.warehouse_price_2 || product.warehouse_price_2000 || 0;
              break;
            default:
              fobPrice = product.fob_price_usd || 0;
          }

          newItems.push({
            id: product.id,
            product_code: product.product_code,
            description: product.description,
            height_cm: product.height_cm,
            depth_cm: product.depth_cm,
            width_cm: product.width_cm,
            cbm: product.cbm,
            quantity: 1,
            fob_price: fobPrice,
            total: fobPrice,
            image: product.image || ''
          });
        }
      }
    });
    
    if (newItems.length > 0) {
      setQuotationItems([...quotationItems, ...newItems]);
      toast.success(`Added ${newItems.length} item(s) to quotation`);
    } else {
      toast.info('Selected items already in quotation');
    }
    
    setSelectedProducts([]);
    setProductDialogOpen(false);
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(product =>
    product.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = calculateTotals();
  const currencyInfo = getCurrencyInfo(quotationDetails.currency);
  const currencySymbol = currencyInfo.symbol;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileSpreadsheet className="text-amber-600" />
            {t('quotation')}
          </h1>
          <p className="page-description">{t('quotationDesc')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => setShowSavedQuotes(true)}>
            <History size={18} />
            Saved Quotes ({savedQuotations.length})
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleNewQuotation}>
            <Plus size={18} />
            New Quote
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleSaveQuotation} disabled={quotationItems.length === 0 || saving}>
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            className="gap-2" 
            disabled={quotationItems.length === 0} 
            onClick={handleViewQuote}
          >
            <Eye size={18} />
            View / Print
          </Button>
          <Button 
            variant="outline" 
            className="gap-2" 
            disabled={quotationItems.length === 0} 
            onClick={handleExportExcel}
          >
            <FileDown size={18} />
            Excel
          </Button>
          <Button className="gap-2" disabled={quotationItems.length === 0} onClick={handleGenerateQuote} data-testid="generate-quote-btn">
            <Download size={18} />
            {t('generateQuote')}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Quotation Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send size={18} />
              {t('quotationDetails')}
              {editingQuotationId && <Badge variant="outline" className="ml-2">Editing</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('customerName')}</Label>
              <Input
                value={quotationDetails.customer_name}
                onChange={(e) => setQuotationDetails({...quotationDetails, customer_name: e.target.value})}
                placeholder="Enter customer name"
                data-testid="customer-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={quotationDetails.customer_email}
                onChange={(e) => setQuotationDetails({...quotationDetails, customer_email: e.target.value})}
                placeholder="customer@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('quoteReference')}</Label>
              <Input
                value={quotationDetails.reference}
                onChange={(e) => setQuotationDetails({...quotationDetails, reference: e.target.value})}
                placeholder="QT-001"
                data-testid="quote-reference-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('date')}</Label>
              <Input
                type="date"
                value={quotationDetails.date}
                onChange={(e) => setQuotationDetails({...quotationDetails, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Price Type</Label>
              <select
                className="w-full border rounded-md p-2"
                value={quotationDetails.currency}
                onChange={(e) => setQuotationDetails({...quotationDetails, currency: e.target.value})}
              >
                <option value="FOB_USD">FOB India Price $</option>
                <option value="FOB_GBP">FOB India Price £</option>
                <option value="WH_700">Warehouse Price £700</option>
                <option value="WH_2000">Warehouse Price £2000</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={quotationDetails.notes}
                onChange={(e) => setQuotationDetails({...quotationDetails, notes: e.target.value})}
                placeholder="Special terms, conditions, or notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quotation Items */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package size={18} />
              {t('quotationItems')} ({quotationItems.length})
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setProductDialogOpen(true)}>
              <Plus size={16} />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {quotationItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('noItemsInQuotation')}</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setProductDialogOpen(true)}>
                  <Plus size={18} />
                  {t('addProducts')}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('productCode')}</TableHead>
                      <TableHead>{t('description')}</TableHead>
                      <TableHead className="text-center">CBM</TableHead>
                      <TableHead className="text-center w-24">Qty</TableHead>
                      <TableHead className="text-right w-28">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotationItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-semibold">{item.product_code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                        <TableCell className="text-center">{item.cbm}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max="99999"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                            onClick={(e) => e.target.select()}
                            onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                            className="w-24 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.fob_price}
                            onChange={(e) => updateItemPrice(item.id, e.target.value)}
                            onClick={(e) => e.target.select()}
                            onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencySymbol}{item.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                            <Trash2 size={16} className="text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {quotationItems.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-muted-foreground">{t('totalItems')}</p>
                <p className="text-2xl font-bold text-amber-700">{totals.totalItems} Pcs</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-muted-foreground">{t('totalCBM')}</p>
                <p className="text-2xl font-bold text-amber-700">{totals.totalCBM} m³</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-muted-foreground">40&apos; HQ Container</p>
                <p className="text-2xl font-bold text-amber-700">{(parseFloat(totals.totalCBM) / 76 * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center p-4 bg-amber-600 text-white rounded-lg shadow-sm">
                <p className="text-sm opacity-90">{t('grandTotal')}</p>
                <p className="text-2xl font-bold">{currencySymbol}{totals.totalValue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Selection Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('selectProducts')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder={t('searchProducts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>{t('productCode')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>Size (HxDxW)</TableHead>
                  <TableHead>CBM</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer" onClick={() => toggleProductSelection(product.id)}>
                    <TableCell>
                      <Checkbox checked={selectedProducts.includes(product.id)} />
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{product.product_code}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>{product.height_cm}×{product.depth_cm}×{product.width_cm}</TableCell>
                    <TableCell>{product.cbm}</TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const c = quotationDetails.currency;
                        if (c === 'FOB_USD') return `$${product.fob_price_usd || 0}`;
                        if (c === 'FOB_GBP') return `£${product.fob_price_gbp || 0}`;
                        if (c === 'WH_700') return `£${product.warehouse_price_1 || product.warehouse_price_700 || 0}`;
                        if (c === 'WH_2000') return `£${product.warehouse_price_2 || product.warehouse_price_2000 || 0}`;
                        return `$${product.fob_price_usd || 0}`;
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">{selectedProducts.length} products selected</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
                <Button onClick={addSelectedProducts} disabled={selectedProducts.length === 0}>Add Selected</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Quotations Dialog */}
      <Dialog open={showSavedQuotes} onOpenChange={setShowSavedQuotes}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={20} />
              Saved Quotations
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {savedQuotations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
                <p>No saved quotations yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedQuotations.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono font-semibold">{quote.reference || 'N/A'}</TableCell>
                      <TableCell>{quote.customer_name || '-'}</TableCell>
                      <TableCell>{quote.date || '-'}</TableCell>
                      <TableCell>{quote.item_count || quote.items?.length || quote.total_items || 0} items</TableCell>
                      <TableCell className="text-right font-semibold">
                        {quote.currency === 'GBP' ? '£' : '$'}{quote.total_value?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={quote.status === 'sent' ? 'default' : 'outline'}>
                          {quote.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="View" 
                            disabled={loadingQuoteId === quote.id}
                            onClick={() => handleViewQuotation(quote)}
                          >
                            {loadingQuoteId === quote.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Eye size={16} />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Edit" 
                            disabled={loadingQuoteId === quote.id}
                            onClick={() => handleEditQuotation(quote)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicateQuotation(quote)}>
                            <Copy size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDeleteQuotation(quote)}>
                            <Trash2 size={16} className="text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Quote Popup */}
      <Dialog open={viewQuotePopup} onOpenChange={setViewQuotePopup}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={20} />
              View Quotation - {viewQuoteData?.reference || 'N/A'}
            </DialogTitle>
          </DialogHeader>
          {viewQuoteData && (
            <div className="space-y-4">
              {/* Quote Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-gray-50 rounded-lg">
                <div><strong>Reference:</strong> {viewQuoteData.reference || '-'}</div>
                <div><strong>Date:</strong> {viewQuoteData.date || '-'}</div>
                <div><strong>Customer:</strong> {viewQuoteData.customer_name || '-'}</div>
                <div><strong>Email:</strong> {viewQuoteData.customer_email || '-'}</div>
              </div>
              
              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#3d2c1e] hover:bg-[#3d2c1e]">
                      <TableHead className="text-white">Code</TableHead>
                      <TableHead className="text-white">Description</TableHead>
                      <TableHead className="text-white text-center">H</TableHead>
                      <TableHead className="text-white text-center">W</TableHead>
                      <TableHead className="text-white text-center">D</TableHead>
                      <TableHead className="text-white text-center">CBM</TableHead>
                      <TableHead className="text-white text-center">Qty</TableHead>
                      <TableHead className="text-white text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewQuoteData.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono font-semibold">{item.product_code}</TableCell>
                        <TableCell>{item.description || '-'}</TableCell>
                        <TableCell className="text-center">{item.height_cm || '-'}</TableCell>
                        <TableCell className="text-center">{item.width_cm || '-'}</TableCell>
                        <TableCell className="text-center">{item.depth_cm || '-'}</TableCell>
                        <TableCell className="text-center">{item.cbm || '-'}</TableCell>
                        <TableCell className="text-center">{item.quantity || 1}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {viewQuoteData.currency === 'GBP' ? '£' : '$'}{item.fob_price?.toFixed(2) || '0.00'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Summary */}
              <div className="text-right space-y-1 pt-4 border-t">
                <div><strong>Total Items:</strong> {viewQuoteData.total_items || viewQuoteData.items?.length || 0} Pcs</div>
                <div><strong>Total CBM:</strong> {viewQuoteData.total_cbm?.toFixed(2) || '0.00'} m³</div>
                <div className="text-lg font-bold text-primary">
                  <strong>Grand Total:</strong> {viewQuoteData.currency === 'GBP' ? '£' : '$'}{viewQuoteData.total_value?.toFixed(2) || '0.00'}
                </div>
              </div>
              
              {viewQuoteData.notes && (
                <div className="pt-4 border-t">
                  <strong>Notes:</strong>
                  <p className="text-sm text-muted-foreground mt-1">{viewQuoteData.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t justify-end">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    // Load quote and switch to edit mode
                    handleLoadQuotation(viewQuoteData);
                    setViewQuotePopup(false);
                    setShowSavedQuotes(false);
                    toast.success('Quotation loaded for editing');
                  }}
                >
                  <Edit size={16} />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    // Export to Excel
                    if (!viewQuoteData.items || viewQuoteData.items.length === 0) {
                      toast.error('No items to export');
                      return;
                    }
                    const currencySymbol = viewQuoteData.currency === 'GBP' ? '£' : '$';
                    const excelData = viewQuoteData.items.map((item, idx) => ({
                      'Sr No': idx + 1,
                      'Product Code': item.product_code || '',
                      'Description': item.description || '',
                      'H': item.height_cm || 0,
                      'D': item.depth_cm || 0,
                      'W': item.width_cm || 0,
                      'CBM': parseFloat(item.cbm) || 0,
                      'Price': item.fob_price || 0,
                      'QTY': item.quantity || 1,
                      'Total CBM': (parseFloat(item.cbm) || 0) * (item.quantity || 1),
                      'Total Price': (item.fob_price || 0) * (item.quantity || 1)
                    }));
                    excelData.push({
                      'Sr No': '',
                      'Product Code': '',
                      'Description': 'TOTALS',
                      'H': '', 'D': '', 'W': '', 'CBM': '', 'Price': '',
                      'QTY': viewQuoteData.total_items || viewQuoteData.items.length,
                      'Total CBM': viewQuoteData.total_cbm || 0,
                      'Total Price': viewQuoteData.total_value || 0
                    });
                    const ws = XLSX.utils.json_to_sheet(excelData);
                    ws['!cols'] = [
                      { wch: 6 }, { wch: 20 }, { wch: 40 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
                      { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 12 }
                    ];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
                    XLSX.writeFile(wb, `Quotation_${viewQuoteData.reference || 'Export'}.xlsx`);
                    toast.success('Excel downloaded!');
                  }}
                >
                  <FileDown size={16} />
                  Excel
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    // Print directly from viewQuoteData
                    handlePrintQuotationDirect(viewQuoteData);
                  }}
                >
                  <Download size={16} />
                  Print / PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Popup */}
      <Dialog open={editQuotePopup} onOpenChange={setEditQuotePopup}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={20} />
              Edit Quotation - {editQuoteData?.reference || 'N/A'}
            </DialogTitle>
          </DialogHeader>
          {editQuoteData && (
            <div className="space-y-4">
              {/* Edit Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input 
                    value={editQuoteData.reference || ''} 
                    onChange={(e) => setEditQuoteData({...editQuoteData, reference: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date"
                    value={editQuoteData.date || ''} 
                    onChange={(e) => setEditQuoteData({...editQuoteData, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input 
                    value={editQuoteData.customer_name || ''} 
                    onChange={(e) => setEditQuoteData({...editQuoteData, customer_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Email</Label>
                  <Input 
                    value={editQuoteData.customer_email || ''} 
                    onChange={(e) => setEditQuoteData({...editQuoteData, customer_email: e.target.value})}
                  />
                </div>
              </div>
              
              {/* Items */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Items ({editQuoteData.items?.length || 0})</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Load this quotation into main editor to add items
                      handleLoadQuotation(editQuoteData);
                      setEditQuotePopup(false);
                      toast.success('Quotation loaded - Add more items below');
                    }}
                  >
                    <Plus size={14} className="mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editQuoteData.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{item.product_code}</TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Input 
                              type="number"
                              className="w-24 text-right"
                              value={item.fob_price || 0}
                              onChange={(e) => {
                                const newItems = [...editQuoteData.items];
                                newItems[idx] = {...newItems[idx], fob_price: parseFloat(e.target.value) || 0};
                                const newTotal = newItems.reduce((sum, i) => sum + (i.fob_price || 0), 0);
                                setEditQuoteData({...editQuoteData, items: newItems, total_value: newTotal});
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                const newItems = editQuoteData.items.filter((_, i) => i !== idx);
                                const newTotal = newItems.reduce((sum, i) => sum + (i.fob_price || 0), 0);
                                const newCbm = newItems.reduce((sum, i) => sum + (parseFloat(i.cbm) || 0), 0);
                                setEditQuoteData({...editQuoteData, items: newItems, total_value: newTotal, total_cbm: newCbm});
                              }}
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={editQuoteData.notes || ''} 
                  onChange={(e) => setEditQuoteData({...editQuoteData, notes: e.target.value})}
                  rows={3}
                />
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditQuotePopup(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      await quotationsApi.update(editQuoteData.id, editQuoteData);
                      toast.success('Quotation updated successfully');
                      loadSavedQuotations();
                      setEditQuotePopup(false);
                    } catch (error) {
                      console.error('Error updating quotation:', error);
                      toast.error('Failed to update quotation');
                    }
                  }}
                >
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
