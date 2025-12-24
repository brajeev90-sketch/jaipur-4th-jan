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

  const handleGenerateQuote = async () => {
    if (quotationItems.length === 0) {
      toast.error('Please add products to the quotation');
      return;
    }

    // Save the quotation first
    await handleSaveQuotation();

    // Generate quotation PDF
    const totals = calculateTotals();
    const currencyInfo = getCurrencyInfo(quotationDetails.currency);
    const currencySymbol = currencyInfo.symbol;
    const priceLabel = currencyInfo.label;
    
    const quotationHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quotationDetails.reference || 'QUOTE'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 30px; 
            max-width: 1100px; 
            margin: 0 auto; 
            background: white;
            color: #333;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3d2c1e;
          }
          .logo-section { display: flex; align-items: center; gap: 15px; }
          .quote-info {
            text-align: right; background: #f8f5f2; padding: 15px 20px;
            border-radius: 8px; min-width: 200px;
          }
          .quote-title { font-size: 22px; font-weight: bold; color: #3d2c1e; margin-bottom: 8px; }
          .quote-detail { font-size: 12px; color: #555; margin: 4px 0; }
          .quote-detail strong { color: #3d2c1e; }
          .customer-date-section {
            display: flex; justify-content: space-between; align-items: center;
            background: linear-gradient(135deg, #3d2c1e 0%, #5a4a3a 100%);
            color: white; padding: 20px 25px; border-radius: 8px;
            margin-bottom: 25px;
          }
          .customer-info h2 { font-size: 24px; margin-bottom: 5px; }
          .customer-info p { font-size: 14px; opacity: 0.9; }
          .date-info { text-align: right; }
          .date-info .date-label { font-size: 12px; opacity: 0.8; }
          .date-info .date-value { font-size: 20px; font-weight: bold; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          .items-table thead tr:first-child th {
            background: #3d2c1e; color: white; padding: 12px 10px;
            text-align: left; font-weight: 600; font-size: 11px;
            text-transform: uppercase; letter-spacing: 0.5px;
          }
          .items-table thead tr:nth-child(2) th {
            background: #5a4a3a; color: white; padding: 8px 10px;
            text-align: center; font-weight: 500; font-size: 10px;
          }
          .items-table tbody td {
            padding: 12px 10px; border-bottom: 1px solid #e0e0e0; vertical-align: middle;
          }
          .items-table tbody tr:nth-child(even) { background: #fafafa; }
          .item-code { font-family: 'Courier New', monospace; font-weight: bold; color: #3d2c1e; font-size: 11px; }
          .item-image { width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
          .size-cell { text-align: center; font-size: 11px; }
          .cbm-cell { text-align: center; font-weight: 500; }
          .load-cell { text-align: center; background: #fff8e6 !important; font-weight: 500; }
          .price-header { background: #ffd700 !important; color: #333 !important; font-weight: bold !important; }
          .price-cell { text-align: right; font-weight: bold; color: #2e7d32; font-size: 13px; }
          .qty-cell { text-align: center; font-weight: bold; }
          .total-cell { text-align: right; font-weight: bold; color: #1565c0; font-size: 13px; }
          .summary-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
          .summary-box {
            background: #f8f5f2; padding: 15px; border-radius: 8px;
            text-align: center; border: 1px solid #e0d5c8;
          }
          .summary-box.highlight {
            background: linear-gradient(135deg, #3d2c1e 0%, #5a4a3a 100%);
            color: white; border: none;
          }
          .summary-label { font-size: 11px; color: #888; margin-bottom: 5px; }
          .summary-box.highlight .summary-label { color: rgba(255,255,255,0.8); }
          .summary-value { font-size: 22px; font-weight: bold; color: #3d2c1e; }
          .summary-box.highlight .summary-value { color: white; }
          .notes-section {
            background: #fff8e6; border: 1px solid #ffe082; padding: 15px 20px;
            border-radius: 8px; margin-bottom: 20px;
          }
          .notes-title { font-size: 12px; font-weight: bold; color: #f57c00; margin-bottom: 8px; }
          .notes-content { font-size: 12px; color: #555; line-height: 1.5; }
          .footer {
            margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center;
          }
          .footer-text { font-size: 11px; color: #888; margin: 5px 0; }
          .footer-brand { font-size: 14px; font-weight: bold; color: #3d2c1e; margin-top: 10px; }
          .no-image { width: 80px; height: 60px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #888; }
          @media print { 
            body { padding: 15px; }
            .summary-box.highlight, .customer-date-section { background: #3d2c1e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg" 
                 alt="JAIPUR" 
                 style="height: 70px; width: auto; object-fit: contain;" />
          </div>
          <div class="quote-info">
            <div class="quote-title">QUOTATION</div>
            <div class="quote-detail"><strong>Ref:</strong> ${quotationDetails.reference || 'N/A'}</div>
            <div class="quote-detail"><strong>Price Type:</strong> ${priceLabel}</div>
          </div>
        </div>
        
        <div class="customer-date-section">
          <div class="customer-info">
            <h2>${quotationDetails.customer_name || 'Customer'}</h2>
            ${quotationDetails.customer_email ? `<p>${quotationDetails.customer_email}</p>` : ''}
          </div>
          <div class="date-info">
            <div class="date-label">Quotation Date</div>
            <div class="date-value">${quotationDetails.date}</div>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 100px">Image</th>
              <th rowspan="2">Item Code</th>
              <th rowspan="2">Description</th>
              <th colspan="3" style="text-align: center;">Size (cm)</th>
              <th rowspan="2" style="text-align: center">CBM</th>
              <th rowspan="2" style="text-align: center">Load 40' HQ</th>
              <th rowspan="2" style="text-align: center">Qty</th>
              <th rowspan="2" class="price-header" style="text-align: center">${priceLabel}</th>
              <th rowspan="2" class="price-header" style="text-align: center">Total</th>
            </tr>
            <tr><th>H</th><th>D</th><th>W</th></tr>
          </thead>
          <tbody>
            ${quotationItems.map(item => {
              const itemCBM = item.cbm || 0;
              const containerCapacity = 76;
              const loadCapacity = itemCBM > 0 ? Math.floor(containerCapacity / itemCBM) : 0;
              return `
              <tr>
                <td>${item.image ? `<img src="${item.image}" class="item-image" alt="${item.product_code}"/>` : '<div class="no-image">No Image</div>'}</td>
                <td class="item-code">${item.product_code}</td>
                <td>${item.description || '-'}</td>
                <td class="size-cell">${item.height_cm || 0}</td>
                <td class="size-cell">${item.depth_cm || 0}</td>
                <td class="size-cell">${item.width_cm || 0}</td>
                <td class="cbm-cell">${itemCBM}</td>
                <td class="load-cell">${loadCapacity} Pcs</td>
                <td class="qty-cell">${item.quantity} Pcs</td>
                <td class="price-cell">${currencySymbol}${item.fob_price.toFixed(2)}</td>
                <td class="total-cell">${currencySymbol}${item.total.toFixed(2)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="summary-section">
          <div class="summary-box"><div class="summary-label">Total Items</div><div class="summary-value">${totals.totalItems} Pcs</div></div>
          <div class="summary-box"><div class="summary-label">Total CBM</div><div class="summary-value">${totals.totalCBM} m³</div></div>
          <div class="summary-box highlight"><div class="summary-label">Grand Total</div><div class="summary-value">${currencySymbol}${totals.totalValue}</div></div>
        </div>
        ${quotationDetails.notes ? `<div class="notes-section"><div class="notes-title">📝 Special Notes:</div><div class="notes-content">${quotationDetails.notes}</div></div>` : ''}
        <div class="footer">
          <div class="footer-text">This quotation is valid for 30 days from the date of issue.</div>
          <div class="footer-text">Prices are FOB India. Shipping and import duties charges not included.</div>
          <div class="footer-brand">JAIPUR - A fine wood furniture company</div>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(quotationHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
    toast.success('Quotation generated and saved!');
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
          <Button variant="outline" className="gap-2" onClick={() => setProductDialogOpen(true)} data-testid="add-products-btn">
            <Plus size={18} />
            {t('addProducts')}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleSaveQuotation} disabled={quotationItems.length === 0}>
            <Save size={18} />
            Save
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
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.fob_price}
                            onChange={(e) => updateItemPrice(item.id, e.target.value)}
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
