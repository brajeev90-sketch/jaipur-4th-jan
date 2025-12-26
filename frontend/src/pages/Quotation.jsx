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
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

export default function Quotation() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [quotationItems, setQuotationItems] = useState([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [savedQuotations, setSavedQuotations] = useState([]);
  const [showSavedQuotes, setShowSavedQuotes] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [quotationDetails, setQuotationDetails] = useState({
    customer_name: '',
    customer_email: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    currency: 'FOB_USD'
  });

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
    if (quotationItems.length === 0) {
      toast.error('Please add products to the quotation');
      return;
    }

    const totals = calculateTotals();
    const quotationData = {
      ...quotationDetails,
      items: quotationItems,
      total_items: totals.totalItems,
      total_cbm: parseFloat(totals.totalCBM),
      total_value: parseFloat(totals.totalValue),
      status: 'draft'
    };

    try {
      if (editingQuotationId) {
        await quotationsApi.update(editingQuotationId, quotationData);
        toast.success('Quotation updated successfully!');
      } else {
        await quotationsApi.create(quotationData);
        toast.success('Quotation saved successfully!');
      }
      loadSavedQuotations();
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
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
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quotationDetails.reference || 'QUOTE'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 15px; 
            max-width: 210mm; 
            margin: 0 auto; 
            background: white;
            color: #333;
            font-size: 12px;
          }
          .page { 
            page-break-after: always; 
            min-height: calc(297mm - 30mm);
            position: relative;
          }
          .page:last-child { page-break-after: auto; }
          
          /* Header */
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3d2c1e;
          }
          .logo-container {
            text-align: left;
          }
          .logo {
            height: 70px;
            object-fit: contain;
          }
          .company-tagline {
            font-size: 11px;
            font-style: italic;
            color: #666;
            margin-top: 3px;
          }
          .quote-info {
            text-align: right;
          }
          .quote-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 32px;
            font-weight: 700;
            color: #3d2c1e;
            letter-spacing: 2px;
            margin-bottom: 10px;
          }
          .customer-info {
            font-size: 11px;
            color: #333;
            line-height: 1.6;
          }
          
          /* BIG Product Image Section */
          .product-image-section {
            text-align: center;
            margin: 15px 0;
            padding: 10px;
          }
          .product-image {
            max-width: 100%;
            max-height: 350px;
            width: auto;
            height: auto;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .no-image {
            width: 100%;
            height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            border: 1px dashed #ccc;
            color: #888;
            font-size: 14px;
          }
          
          /* Details Table - No Image column */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 12px;
          }
          th {
            background: #3d2c1e;
            color: white;
            padding: 12px 10px;
            text-align: center;
            font-weight: 600;
            font-size: 11px;
          }
          td {
            padding: 12px 10px;
            border: 1px solid #ddd;
            text-align: center;
          }
          .code-cell {
            font-family: monospace;
            font-weight: bold;
            color: #3d2c1e;
            font-size: 13px;
          }
          .desc-cell {
            text-align: left;
          }
          .price-cell {
            font-weight: bold;
            color: #3d2c1e;
          }
          
          /* Summary Section */
          .summary-section {
            margin-top: 15px;
            padding: 15px;
            background: #f5f0eb;
            border-radius: 8px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
          }
          .summary-label {
            color: #666;
          }
          .summary-value {
            font-weight: 600;
          }
          .grand-total {
            border-top: 2px solid #3d2c1e;
            margin-top: 10px;
            padding-top: 10px;
            font-size: 18px;
          }
          .grand-total .summary-value {
            color: #3d2c1e;
          }
          
          /* Footer - Font size increased by 80% */
          .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
          }
          .footer-title {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
          }
          .footer-text {
            font-size: 16px;
            color: #333;
            line-height: 1.8;
          }
          .footer-options {
            margin-top: 12px;
            font-weight: bold;
            font-size: 14px;
            color: #3d2c1e;
          }
          
          .page-number {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            color: #888;
          }
        </style>
      </head>
      <body>
        ${quotationItems.map((item, index) => {
          const isLastItem = index === quotationItems.length - 1;
          return `
          <div class="page">
            <!-- Header with logo and quotation info -->
            <div class="header">
              <div class="logo-container">
                <img src="https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg" alt="JAIPUR" class="logo" />
                <div class="company-tagline">A fine wood furniture company</div>
              </div>
              <div class="quote-info">
                <div class="quote-title">QUOTATION</div>
                <div class="customer-info">
                  <div><strong>Ref:</strong> ${quotationDetails.reference || '-'}</div>
                  <div><strong>Date:</strong> ${formatDateDDMMYYYY(quotationDetails.date)}</div>
                  <div><strong>Customer:</strong> ${quotationDetails.customer_name || '-'}</div>
                </div>
              </div>
            </div>
            
            <!-- BIG Product Image -->
            <div class="product-image-section">
              ${item.image 
                ? `<img src="${item.image}" alt="${item.product_code}" class="product-image" />`
                : `<div class="no-image">No Product Image Available</div>`
              }
            </div>
            
            <!-- Details Table below image - NO Image column -->
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>H</th>
                  <th>W</th>
                  <th>D</th>
                  <th>CBM</th>
                  <th>${priceLabel}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="code-cell">${item.product_code}</td>
                  <td class="desc-cell">${item.description || '-'}</td>
                  <td>${item.height_cm || '-'}</td>
                  <td>${item.width_cm || '-'}</td>
                  <td>${item.depth_cm || '-'}</td>
                  <td>${item.cbm || '-'}</td>
                  <td class="price-cell">${currencySymbol}${item.fob_price.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            ${isLastItem ? `
              <!-- Summary on last page -->
              <div class="summary-section">
                <div class="summary-row">
                  <span class="summary-label">Total Items:</span>
                  <span class="summary-value">${totals.totalItems} Pcs</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Total CBM:</span>
                  <span class="summary-value">${totals.totalCBM} m³</span>
                </div>
                <div class="summary-row grand-total">
                  <span class="summary-label">GRAND TOTAL:</span>
                  <span class="summary-value">${currencySymbol}${totals.totalValue}</span>
                </div>
              </div>
              
              <!-- Footer with larger font -->
              <div class="footer">
                <div class="footer-title">Delivery Options:</div>
                <div class="footer-text">
                  This quotation is valid for 30 days from the date of issue.<br>
                  Prices are ${priceLabel}. Shipping and import duties not included.
                </div>
                <div class="footer-options">
                  UK WAREHOUSE • FACTORY DIRECT CONTAINERS • SHARED CONTAINERS • TAILORED DESIGNS
                </div>
              </div>
            ` : ''}
            
            <div class="page-number">Page ${index + 1} of ${quotationItems.length}</div>
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

    // Save the quotation first
    try {
      await handleSaveQuotation();
    } catch (error) {
      console.error('Error saving quotation:', error);
    }

    // Generate quotation and open print dialog
    const quotationHTML = generateQuotationHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(quotationHTML + `
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
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
          <Button variant="outline" className="gap-2" onClick={handleSaveQuotation} disabled={quotationItems.length === 0}>
            <Save size={18} />
            Save
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
                <p className="text-sm text-muted-foreground">40' HQ Container</p>
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
                      <TableCell>{quote.items?.length || 0} items</TableCell>
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
                            title="View / Print" 
                            onClick={() => {
                              handleLoadQuotation(quote);
                              setShowSavedQuotes(false);
                              // After a small delay, trigger generate quote to show preview
                              setTimeout(() => handleGenerateQuote(), 500);
                            }}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" title="Load & Edit" onClick={() => handleLoadQuotation(quote)}>
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
    </div>
  );
}
