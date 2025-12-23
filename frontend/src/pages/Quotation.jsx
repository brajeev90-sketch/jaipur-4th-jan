import { useState, useEffect } from 'react';
import { productsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
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
  Calculator
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
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsApi.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const addProductsToQuotation = () => {
    const newItems = selectedProducts.map(productId => {
      const product = products.find(p => p.id === productId);
      return {
        id: product.id,
        product_code: product.product_code,
        description: product.description,
        size: product.size,
        height_cm: product.height_cm,
        width_cm: product.width_cm,
        depth_cm: product.depth_cm,
        cbm: product.cbm,
        quantity: 1,
        fob_price: product.fob_price_usd || 0,
        total: product.fob_price_usd || 0
      };
    });
    
    // Filter out already added items
    const existingIds = quotationItems.map(item => item.id);
    const itemsToAdd = newItems.filter(item => !existingIds.includes(item.id));
    
    setQuotationItems([...quotationItems, ...itemsToAdd]);
    setSelectedProducts([]);
    setProductDialogOpen(false);
    toast.success(t('itemsAdded'));
  };

  const updateItemQuantity = (itemId, quantity) => {
    setQuotationItems(quotationItems.map(item => {
      if (item.id === itemId) {
        const qty = Math.max(1, parseInt(quantity) || 1);
        return { ...item, quantity: qty, total: qty * item.fob_price };
      }
      return item;
    }));
  };

  const updateItemPrice = (itemId, price) => {
    setQuotationItems(quotationItems.map(item => {
      if (item.id === itemId) {
        const p = parseFloat(price) || 0;
        return { ...item, fob_price: p, total: item.quantity * p };
      }
      return item;
    }));
  };

  const removeItem = (itemId) => {
    setQuotationItems(quotationItems.filter(item => item.id !== itemId));
  };

  const calculateTotals = () => {
    const totalItems = quotationItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCBM = quotationItems.reduce((sum, item) => sum + (item.cbm * item.quantity), 0);
    const totalValue = quotationItems.reduce((sum, item) => sum + item.total, 0);
    return { totalItems, totalCBM: totalCBM.toFixed(2), totalValue: totalValue.toFixed(2) };
  };

  const filteredProducts = products.filter(product => 
    !searchTerm || 
    product.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="quotation-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="quotation-page">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3" data-testid="quotation-title">
            <FileSpreadsheet size={28} />
            {t('quotationTitle')}
          </h1>
          <p className="page-description">{t('quotationDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="gap-2" 
            onClick={() => setProductDialogOpen(true)}
            data-testid="add-products-btn"
          >
            <Plus size={18} />
            {t('addProducts')}
          </Button>
          <Button 
            className="gap-2"
            disabled={quotationItems.length === 0}
            data-testid="generate-quote-btn"
          >
            <Download size={18} />
            {t('generateQuote')}
          </Button>
        </div>
      </div>

      {/* Quotation Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('quotationDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('customerName')}</Label>
              <Input
                value={quotationDetails.customer_name}
                onChange={(e) => setQuotationDetails({...quotationDetails, customer_name: e.target.value})}
                placeholder={t('enterCustomerName')}
                data-testid="customer-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('reference')}</Label>
              <Input
                value={quotationDetails.reference}
                onChange={(e) => setQuotationDetails({...quotationDetails, reference: e.target.value})}
                placeholder="QT-2024-001"
                data-testid="quote-reference-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('date')}</Label>
              <Input
                type="date"
                value={quotationDetails.date}
                onChange={(e) => setQuotationDetails({...quotationDetails, date: e.target.value})}
                data-testid="quote-date-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('currency')}</Label>
              <select
                value={quotationDetails.currency}
                onChange={(e) => setQuotationDetails({...quotationDetails, currency: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                data-testid="currency-select"
              >
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotation Items Table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('quotationItems')}</CardTitle>
          {quotationItems.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {quotationItems.length} {t('items')}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {quotationItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground mb-4">{t('noItemsInQuotation')}</p>
              <Button variant="outline" onClick={() => setProductDialogOpen(true)}>
                <Plus size={16} className="mr-2" />
                {t('addProducts')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead className="font-semibold">{t('itemCode')}</TableHead>
                    <TableHead className="font-semibold">{t('description')}</TableHead>
                    <TableHead className="font-semibold text-center">{t('sizeCm')}</TableHead>
                    <TableHead className="font-semibold text-center">CBM</TableHead>
                    <TableHead className="font-semibold text-center">{t('qty')}</TableHead>
                    <TableHead className="font-semibold text-right">FOB {quotationDetails.currency}</TableHead>
                    <TableHead className="font-semibold text-right">{t('total')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotationItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.product_code}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="line-clamp-2 text-sm">{item.description}</span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {item.height_cm}×{item.width_cm}×{item.depth_cm}
                      </TableCell>
                      <TableCell className="text-center text-sm">{item.cbm}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                          className="w-16 h-8 text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.fob_price}
                          onChange={(e) => updateItemPrice(item.id, e.target.value)}
                          className="w-24 h-8 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {quotationDetails.currency === 'USD' ? '$' : quotationDetails.currency === 'GBP' ? '£' : '€'}
                        {item.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={16} />
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

      {/* Totals Summary */}
      {quotationItems.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalItems')}</p>
                  <p className="text-2xl font-semibold">{totals.totalItems} {t('pcs')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalCBM')}</p>
                  <p className="text-2xl font-semibold">{totals.totalCBM} m³</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('grandTotal')}</p>
                <p className="text-3xl font-bold text-primary">
                  {quotationDetails.currency === 'USD' ? '$' : quotationDetails.currency === 'GBP' ? '£' : '€'}
                  {totals.totalValue}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Container Load Estimation */}
      {quotationItems.length > 0 && parseFloat(totals.totalCBM) > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator size={20} />
              {t('containerEstimate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">20' Container (~28 CBM)</p>
                <p className="text-xl font-semibold">
                  {Math.ceil(parseFloat(totals.totalCBM) / 28)} {t('containers')}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">40' Container (~58 CBM)</p>
                <p className="text-xl font-semibold">
                  {Math.ceil(parseFloat(totals.totalCBM) / 58)} {t('containers')}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">40' HQ (~68 CBM)</p>
                <p className="text-xl font-semibold">
                  {Math.ceil(parseFloat(totals.totalCBM) / 68)} {t('containers')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Products Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{t('selectProducts')}</DialogTitle>
          </DialogHeader>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={t('searchProducts')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {products.length === 0 ? t('noProductsYet') : t('noProductsFound')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>{t('productCode')}</TableHead>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead className="text-right">FOB $</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow 
                      key={product.id}
                      className={`cursor-pointer ${selectedProducts.includes(product.id) ? 'bg-primary/10' : ''}`}
                      onClick={() => toggleProductSelection(product.id)}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.product_code}</TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell className="text-right">${product.fob_price_usd || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Selected Count & Actions */}
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <span className="text-sm text-muted-foreground">
              {selectedProducts.length} {t('productsSelected')}
            </span>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={addProductsToQuotation}
                disabled={selectedProducts.length === 0}
              >
                {t('addSelected')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
