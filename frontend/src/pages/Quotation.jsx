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
    currency: 'USD'
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

    const newItem = {
      id: product.id,
      product_code: product.product_code,
      description: product.description,
      height_cm: product.height_cm,
      depth_cm: product.depth_cm,
      width_cm: product.width_cm,
      cbm: product.cbm,
      quantity: 1,
      fob_price: quotationDetails.currency === 'USD' ? (product.fob_price_usd || 0) : (product.fob_price_gbp || 0),
      total: quotationDetails.currency === 'USD' ? (product.fob_price_usd || 0) : (product.fob_price_gbp || 0)
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
      currency: 'USD'
    });
    setQuotationItems([]);
    setEditingQuotationId(null);
    setShowSavedQuotes(false);
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
    const currencySymbol = quotationDetails.currency === 'USD' ? '$' : quotationDetails.currency === 'GBP' ? '£' : '₹';
    const containerCapacity = 76;
    
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
          .logo-icon {
            width: 60px; height: 60px;
            background: linear-gradient(135deg, #3d2c1e 0%, #5a4a3a 100%);
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
          }
          .logo-icon svg { width: 40px; height: 40px; fill: white; }
          .company-name { font-size: 32px; font-weight: bold; color: #3d2c1e; letter-spacing: 2px; }
          .company-tagline { font-size: 11px; color: #666; font-style: italic; margin-top: 2px; }
          .quote-info {
            text-align: right; background: #f8f5f2; padding: 15px 20px;
            border-radius: 8px; min-width: 200px;
          }
          .quote-title { font-size: 22px; font-weight: bold; color: #3d2c1e; margin-bottom: 8px; }
          .quote-detail { font-size: 12px; color: #555; margin: 4px 0; }
          .quote-detail strong { color: #3d2c1e; }
          .customer-section {
            background: #fafafa; padding: 15px 20px; border-radius: 8px;
            margin-bottom: 20px; border-left: 4px solid #3d2c1e;
          }
          .customer-section h3 { font-size: 14px; color: #888; margin-bottom: 5px; font-weight: normal; }
          .customer-name { font-size: 18px; font-weight: bold; color: #333; }
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
          .size-cell { text-align: center; font-size: 11px; }
          .cbm-cell { text-align: center; font-weight: 500; }
          .load-cell { text-align: center; background: #fff8e6 !important; font-weight: 500; }
          .price-header { background: #ffd700 !important; color: #333 !important; font-weight: bold !important; }
          .price-cell { text-align: right; font-weight: bold; color: #2e7d32; font-size: 13px; }
          .qty-cell { text-align: center; font-weight: bold; }
          .total-cell { text-align: right; font-weight: bold; color: #1565c0; font-size: 13px; }
          .summary-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
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
          .container-info {
            background: #e8f5e9; border: 1px solid #a5d6a7; padding: 12px 20px;
            border-radius: 8px; margin-bottom: 20px;
            display: flex; justify-content: space-between; align-items: center;
          }
          .container-label { font-size: 12px; color: #2e7d32; }
          .container-value { font-size: 16px; font-weight: bold; color: #1b5e20; }
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
          @media print { 
            body { padding: 15px; }
            .summary-box.highlight { background: #3d2c1e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L18 8v8l-6 3.5L6 16V8l6-3.5z"/><path d="M12 7v10M7 9.5l5 3 5-3"/></svg>
            </div>
            <div>
              <div class="company-name">JAIPUR</div>
              <div class="company-tagline">A fine wood furniture company</div>
            </div>
          </div>
          <div class="quote-info">
            <div class="quote-title">QUOTATION</div>
            <div class="quote-detail"><strong>Ref:</strong> ${quotationDetails.reference || 'N/A'}</div>
            <div class="quote-detail"><strong>Date:</strong> ${quotationDetails.date}</div>
            <div class="quote-detail"><strong>Currency:</strong> ${quotationDetails.currency}</div>
          </div>
        </div>
        ${quotationDetails.customer_name ? `
        <div class="customer-section">
          <h3>Quotation For:</h3>
          <div class="customer-name">${quotationDetails.customer_name}</div>
          ${quotationDetails.customer_email ? `<div style="font-size: 12px; color: #666; margin-top: 3px;">${quotationDetails.customer_email}</div>` : ''}
        </div>` : ''}
        <table class="items-table">
          <thead>
            <tr>
              <th rowspan="2">Item Code</th>
              <th rowspan="2">Description</th>
              <th colspan="3" style="text-align: center;">Size (cm)</th>
              <th rowspan="2" style="text-align: center">CBM</th>
              <th rowspan="2" style="text-align: center">Load 40' HQ</th>
              <th rowspan="2" style="text-align: center">Qty</th>
              <th rowspan="2" class="price-header" style="text-align: center">FOB ${quotationDetails.currency}</th>
              <th rowspan="2" class="price-header" style="text-align: center">Total</th>
            </tr>
            <tr><th>H</th><th>D</th><th>W</th></tr>
          </thead>
          <tbody>
            ${quotationItems.map(item => {
              const itemCBM = item.cbm || 0;
              const loadCapacity = itemCBM > 0 ? Math.floor(containerCapacity / itemCBM) : 0;
              return `
              <tr>
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
          <div class="summary-box"><div class="summary-label">40' HQ Container</div><div class="summary-value">${(parseFloat(totals.totalCBM) / containerCapacity * 100).toFixed(0)}%</div></div>
          <div class="summary-box highlight"><div class="summary-label">Grand Total</div><div class="summary-value">${currencySymbol}${totals.totalValue}</div></div>
        </div>
        <div class="container-info">
          <div><div class="container-label">Container Load Estimate</div><div class="container-value">${totals.totalCBM} CBM / 76 CBM (40' HQ)</div></div>
          <div style="text-align: right;"><div class="container-label">Containers Required</div><div class="container-value">${Math.ceil(parseFloat(totals.totalCBM) / containerCapacity)} × 40' HQ</div></div>
        </div>
        ${quotationDetails.notes ? `<div class="notes-section"><div class="notes-title">📝 Special Notes:</div><div class="notes-content">${quotationDetails.notes}</div></div>` : ''}
        <div class="footer">
          <div class="footer-text">This quotation is valid for 30 days from the date of issue.</div>
          <div class="footer-text">Prices are FOB India. Shipping and import duties not included.</div>
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
    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product) addProductToQuotation(product);
    });
    setSelectedProducts([]);
    setProductDialogOpen(false);
    toast.success('Items added to quotation');
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
  const currencySymbol = quotationDetails.currency === 'USD' ? '$' : quotationDetails.currency === 'GBP' ? '£' : '₹';

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
              <Label>{t('currency')}</Label>
              <select
                className="w-full border rounded-md p-2"
                value={quotationDetails.currency}
                onChange={(e) => setQuotationDetails({...quotationDetails, currency: e.target.value})}
              >
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
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
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package size={18} />
              {t('quotationItems')} ({quotationItems.length})
            </CardTitle>
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
                      {quotationDetails.currency === 'USD' ? `$${product.fob_price_usd || 0}` : `£${product.fob_price_gbp || 0}`}
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
