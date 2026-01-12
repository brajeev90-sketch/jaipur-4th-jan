import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi, factoriesApi, categoriesApi, leatherApi, finishApi, productsApi, noteTemplatesApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import RichTextEditor from '../components/RichTextEditor';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  CalendarIcon,
  Upload,
  X,
  GripVertical,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [factories, setFactories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [leatherLibrary, setLeatherLibrary] = useState([]);
  const [finishLibrary, setFinishLibrary] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [date, setDate] = useState(new Date());
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [noteTemplates, setNoteTemplates] = useState([]);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  const [order, setOrder] = useState({
    sales_order_ref: '',
    buyer_po_ref: '',
    buyer_name: '',
    entry_date: '',
    status: 'Draft',
    factory: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    id: '',
    product_code: '',
    description: '',
    category: '',
    height_cm: 0,
    depth_cm: 0,
    width_cm: 0,
    cbm: 0,
    cbm_auto: true,
    quantity: 1,
    in_house_production: true,
    machine_hall: '',
    leather_code: '',
    leather_image: '',
    finish_code: '',
    finish_image: '',
    color_notes: '',
    leg_color: '',
    wood_finish: '',
    notes: '',
    images: [],
    reference_images: [],
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [orderRes, factoriesRes, categoriesRes, leatherRes, finishRes, productsRes, noteTemplatesRes] = await Promise.all([
        ordersApi.getById(id),
        factoriesApi.getAll(),
        categoriesApi.getAll(),
        leatherApi.getAll(),
        finishApi.getAll(),
        productsApi.getAll(),
        noteTemplatesApi.getAll(),
      ]);
      
      // Auto-fill missing product_image from catalog for existing items
      const orderData = orderRes.data;
      const productsList = productsRes.data;
      
      if (orderData.items && orderData.items.length > 0) {
        orderData.items = orderData.items.map(item => {
          // If item doesn't have product_image, try to get it from catalog
          if (!item.product_image && item.product_code) {
            const catalogProduct = productsList.find(p => p.product_code === item.product_code);
            if (catalogProduct && catalogProduct.image) {
              return { ...item, product_image: catalogProduct.image };
            }
          }
          return item;
        });
      }
      
      setOrder(orderData);
      setFactories(factoriesRes.data);
      setCategories(categoriesRes.data);
      setLeatherLibrary(leatherRes.data);
      setFinishLibrary(finishRes.data);
      setProducts(productsList);
      setNoteTemplates(noteTemplatesRes.data || []);
      
      if (orderData.entry_date) {
        setDate(new Date(orderData.entry_date));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.product_code?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Handle product selection from suggestions
  const handleProductSelect = (product) => {
    // Get product image from catalog
    const mainProductImage = product.image || '';
    // Second image from catalog goes as additional image
    const secondImage = product.images && product.images.length > 0 ? product.images[0] : '';
    // Combine second image with any other additional images
    const additionalImages = secondImage ? [secondImage] : [];
    
    // Get category name from categories list (product stores category as ID)
    const categoryName = categories.find(c => c.id === product.category)?.name || product.category || '';
    
    setCurrentItem(prev => ({
      ...prev,
      product_code: product.product_code,
      description: product.description || '',
      category: categoryName,
      height_cm: product.height_cm || 0,
      depth_cm: product.depth_cm || 0,
      width_cm: product.width_cm || 0,
      // Take CBM directly from product catalog
      cbm: product.cbm || 0,
      cbm_auto: false,  // Don't auto-calculate, use product value
      dimensions: product.size || '',
      // Auto-fill main product image from catalog
      product_image: mainProductImage,
      // Second image from product goes as additional image (shown below main)
      images: additionalImages,
    }));
    setProductSearch(product.product_code);
    setShowProductSuggestions(false);
  };

  const handleOrderChange = (field, value) => {
    setOrder(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
      handleOrderChange('entry_date', format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ordersApi.update(id, order);
      toast.success('Order saved successfully');
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const openItemDialog = (index = null) => {
    if (index !== null) {
      // Ensure images and product_image are properly initialized when editing
      const existingItem = order.items[index];
      setCurrentItem({ 
        ...existingItem,
        images: existingItem.images || [],
        product_image: existingItem.product_image || ''
      });
      setProductSearch(existingItem.product_code || '');
      setEditingItemIndex(index);
    } else {
      // Default notes text - auto placed but editable
      const defaultNotes = `<p><strong>Deeper Button Tufting</strong>-Deeper Button-Shiny as per sample-Consistent Colour</p>
<p>Tufting Depth needs to be increased for a more defined and Luxurious appearance.</p>
<p><strong>Leather Finish</strong>-Approved ( Hand-Distressed Finish)</p>
<p>Final leather selection and hand-distressed finish have been approved.</p>
<p>Packaging detail to follow.</p>`;

      setCurrentItem({
        id: uuidv4(),
        product_code: '',
        description: '',
        category: '',
        height_cm: 0,
        depth_cm: 0,
        width_cm: 0,
        cbm: 0,
        cbm_auto: true,
        quantity: 1,
        in_house_production: true,
        machine_hall: '',
        leather_code: '',
        leather_image: '',
        finish_code: '',
        finish_image: '',
        color_notes: '',
        leg_color: '',
        wood_finish: '',
        notes: defaultNotes,
        product_image: '',
        images: [],
        reference_images: [],
      });
      setProductSearch('');
      setEditingItemIndex(null);
    }
    setShowProductSuggestions(false);
    setItemDialogOpen(true);
  };

  const handleItemChange = (field, value) => {
    setCurrentItem(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate CBM
      if (updated.cbm_auto && ['height_cm', 'depth_cm', 'width_cm'].includes(field)) {
        updated.cbm = ((updated.height_cm || 0) * (updated.depth_cm || 0) * (updated.width_cm || 0) / 1000000).toFixed(4);
      }
      
      return updated;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];

    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      newImages.push(base64);
    }

    setCurrentItem(prev => {
      const updatedImages = [...prev.images, ...newImages];
      // Auto-set first image as product_image if not already set
      const productImage = prev.product_image || (updatedImages.length > 0 ? updatedImages[0] : '');
      return {
        ...prev,
        images: updatedImages,
        product_image: productImage
      };
    });
  };

  const removeImage = (index) => {
    setCurrentItem(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const saveItem = () => {
    if (!currentItem.product_code) {
      toast.error('Product code is required');
      return;
    }

    // Auto-set product_image from first additional image if not already set
    let itemToSave = { ...currentItem };
    if (!itemToSave.product_image && itemToSave.images && itemToSave.images.length > 0) {
      itemToSave.product_image = itemToSave.images[0];
    }

    setOrder(prev => {
      const newItems = [...prev.items];
      if (editingItemIndex !== null) {
        newItems[editingItemIndex] = itemToSave;
      } else {
        newItems.push(itemToSave);
      }
      return { ...prev, items: newItems };
    });

    setItemDialogOpen(false);
    toast.success(editingItemIndex !== null ? 'Item updated' : 'Item added');
  };

  const deleteItem = (index) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    toast.success('Item removed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="edit-order-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="edit-order-page">
      {/* Header */}
      <div className="page-header">
        <Button 
          variant="ghost" 
          className="mb-4 gap-2"
          onClick={() => navigate(`/orders/${id}`)}
          data-testid="back-btn"
        >
          <ArrowLeft size={18} />
          Back to Order
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title" data-testid="edit-order-title">Edit Order</h1>
            <p className="page-description font-mono">{order.sales_order_ref || 'New Order'}</p>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
            data-testid="save-order-btn"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </div>

      {/* Order Info */}
      <Card className="mb-6" data-testid="order-info-form">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sales Order Reference *</Label>
              <Input
                value={order.sales_order_ref}
                onChange={(e) => handleOrderChange('sales_order_ref', e.target.value)}
                placeholder="SO-2024-001"
                className="font-mono"
                data-testid="sales-order-ref-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Buyer PO Reference</Label>
              <Input
                value={order.buyer_po_ref}
                onChange={(e) => handleOrderChange('buyer_po_ref', e.target.value)}
                placeholder="PO-12345"
                className="font-mono"
                data-testid="buyer-po-ref-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Buyer Name</Label>
              <Input
                value={order.buyer_name}
                onChange={(e) => handleOrderChange('buyer_name', e.target.value)}
                placeholder="Enter buyer name"
                data-testid="buyer-name-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Entry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    data-testid="entry-date-btn"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd-MM-yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Factory Inform Date</Label>
              <Input
                type="date"
                value={order.factory_inform_date || ''}
                onChange={(e) => handleOrderChange('factory_inform_date', e.target.value)}
                data-testid="factory-inform-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Factory / Unit</Label>
              <Select 
                value={order.factory} 
                onValueChange={(value) => handleOrderChange('factory', value)}
              >
                <SelectTrigger data-testid="factory-select">
                  <SelectValue placeholder="Select factory" />
                </SelectTrigger>
                <SelectContent>
                  {factories.map((factory) => (
                    <SelectItem key={factory.id} value={factory.name}>
                      {factory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={order.status} 
                onValueChange={(value) => handleOrderChange('status', value)}
              >
                <SelectTrigger data-testid="status-select">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="In Production">In Production</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card data-testid="items-section">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-xl">Line Items ({order.items.length})</CardTitle>
          <Button 
            onClick={() => openItemDialog()} 
            className="gap-2"
            data-testid="add-item-btn"
          >
            <Plus size={18} />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <div className="empty-state py-12" data-testid="no-items">
              <p className="text-muted-foreground mb-4">No items added yet</p>
              <Button variant="outline" onClick={() => openItemDialog()}>
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3" data-testid="items-list">
              {order.items.map((item, index) => (
                <div 
                  key={item.id || index}
                  className="flex items-center gap-4 p-4 border rounded-sm hover:bg-muted/50 transition-colors"
                  data-testid={`item-card-${index}`}
                >
                  <GripVertical className="text-muted-foreground" size={20} />
                  
                  {/* Show product_image first, then fallback to images[0] */}
                  {(item.product_image || (item.images?.length > 0)) ? (
                    <img 
                      src={item.product_image || item.images[0]} 
                      alt={item.product_code}
                      className="w-16 h-16 object-cover rounded-sm border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-medium">{item.product_code || 'No Code'}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.description || 'No description'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.height_cm}×{item.depth_cm}×{item.width_cm} cm | Qty: {item.quantity}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openItemDialog(index)}
                      data-testid={`edit-item-${index}`}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteItem(index)}
                      data-testid={`delete-item-${index}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Editor Dialog - Only closes on X button or Cancel, not outside click */}
      <Dialog open={itemDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // This is triggered when X button or cancel is clicked
          setItemDialogOpen(false);
          setShowProductSuggestions(false);
          setProductSearch('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={() => setShowProductSuggestions(false)} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingItemIndex !== null ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 relative">
                <Label>Product Code * <span className="text-xs text-muted-foreground">(Search existing)</span></Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    value={productSearch || currentItem.product_code}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProductSearch(value);
                      handleItemChange('product_code', value);
                      setShowProductSuggestions(value.length > 0);
                    }}
                    onFocus={() => setShowProductSuggestions(productSearch.length > 0 || products.length > 0)}
                    placeholder="Type to search products..."
                    className="font-mono pl-9"
                    data-testid="item-product-code"
                  />
                </div>
                
                {/* Product Suggestions Dropdown */}
                {showProductSuggestions && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No products found. You can still add manually.
                      </div>
                    ) : (
                      filteredProducts.slice(0, 10).map((product) => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium text-sm">{product.product_code}</span>
                            {product.cbm > 0 && (
                              <span className="text-xs text-muted-foreground">CBM: {product.cbm}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.description}</p>
                          {product.size && (
                            <p className="text-xs text-muted-foreground">Size: {product.size}</p>
                          )}
                        </div>
                      ))
                    )}
                    {filteredProducts.length > 10 && (
                      <div className="p-2 text-xs text-center text-muted-foreground bg-muted">
                        +{filteredProducts.length - 10} more products...
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Category <span className="text-xs text-muted-foreground">(+ Add new)</span></Label>
                <div className="flex gap-2">
                  <Select 
                    value={currentItem.category || "none"} 
                    onValueChange={async (value) => {
                      if (value === "add-new") {
                        const newCategory = prompt("Enter new category name:");
                        if (newCategory && newCategory.trim()) {
                          try {
                            const response = await categoriesApi.create({ name: newCategory.trim() });
                            setCategories(prev => [...prev, response.data]);
                            handleItemChange('category', newCategory.trim());
                            toast.success(`Category "${newCategory.trim()}" added!`);
                          } catch (err) {
                            toast.error("Failed to add category");
                          }
                        }
                      } else {
                        handleItemChange('category', value === "none" ? "" : value);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="item-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="add-new" className="text-primary font-medium">
                        + Add New Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="99999"
                  value={currentItem.quantity}
                  onChange={(e) => handleItemChange('quantity', parseInt(e.target.value) || 1)}
                  onClick={(e) => e.target.select()}
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                  data-testid="item-quantity"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={currentItem.description}
                onChange={(e) => handleItemChange('description', e.target.value)}
                placeholder="Enter item description"
                rows={2}
                data-testid="item-description"
              />
            </div>

            <Separator />

            {/* Dimensions */}
            <div>
              <h4 className="font-medium mb-3">Dimensions</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={currentItem.height_cm}
                    onChange={(e) => handleItemChange('height_cm', parseFloat(e.target.value) || 0)}
                    data-testid="item-height"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Depth (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={currentItem.depth_cm}
                    onChange={(e) => handleItemChange('depth_cm', parseFloat(e.target.value) || 0)}
                    data-testid="item-depth"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Width (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={currentItem.width_cm}
                    onChange={(e) => handleItemChange('width_cm', parseFloat(e.target.value) || 0)}
                    data-testid="item-width"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    CBM
                    <span className="text-xs text-muted-foreground">
                      {currentItem.cbm_auto ? '(auto)' : '(manual)'}
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      value={currentItem.cbm}
                      onChange={(e) => handleItemChange('cbm', parseFloat(e.target.value) || 0)}
                      disabled={currentItem.cbm_auto}
                      data-testid="item-cbm"
                    />
                    <div className="flex items-center">
                      <Checkbox
                        checked={currentItem.cbm_auto}
                        onCheckedChange={(checked) => handleItemChange('cbm_auto', checked)}
                        data-testid="item-cbm-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Materials */}
            <div>
              <h4 className="font-medium mb-3">Materials & Finish</h4>
              <div className="grid grid-cols-2 gap-6">
                {/* Leather Section */}
                <div className="space-y-3 border rounded-sm p-4 bg-muted/30">
                  <Label className="text-sm font-semibold">Leather / Fabric</Label>
                  <Select 
                    value={currentItem.leather_code || "none"} 
                    onValueChange={(value) => {
                      handleItemChange('leather_code', value === "none" ? "" : value);
                      // Auto-fill image from library
                      const selectedLeather = leatherLibrary.find(l => l.code === value);
                      if (selectedLeather?.image) {
                        handleItemChange('leather_image', selectedLeather.image);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="item-leather">
                      <SelectValue placeholder="Select from library" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {leatherLibrary.map((item) => (
                        <SelectItem key={item.id} value={item.code}>
                          {item.code} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Leather Image Preview/Upload */}
                  <div className="space-y-2">
                    {currentItem.leather_image ? (
                      <div className="relative group">
                        <img 
                          src={currentItem.leather_image} 
                          alt="Leather swatch"
                          className="w-full h-24 object-cover rounded-sm border"
                        />
                        <button
                          type="button"
                          onClick={() => handleItemChange('leather_image', '')}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer border-2 border-dashed rounded-sm p-3 text-center hover:border-accent transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => handleItemChange('leather_image', ev.target.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <Upload className="mx-auto mb-1 text-muted-foreground" size={20} />
                        <p className="text-xs text-muted-foreground">Upload swatch image</p>
                      </label>
                    )}
                  </div>
                </div>

                {/* Finish Section */}
                <div className="space-y-3 border rounded-sm p-4 bg-muted/30">
                  <Label className="text-sm font-semibold">Finish / Coating</Label>
                  <Select 
                    value={currentItem.finish_code || "none"} 
                    onValueChange={(value) => {
                      handleItemChange('finish_code', value === "none" ? "" : value);
                      // Auto-fill image from library
                      const selectedFinish = finishLibrary.find(f => f.code === value);
                      if (selectedFinish?.image) {
                        handleItemChange('finish_image', selectedFinish.image);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="item-finish">
                      <SelectValue placeholder="Select from library" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {finishLibrary.map((item) => (
                        <SelectItem key={item.id} value={item.code}>
                          {item.code} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Finish Image Preview/Upload */}
                  <div className="space-y-2">
                    {currentItem.finish_image ? (
                      <div className="relative group">
                        <img 
                          src={currentItem.finish_image} 
                          alt="Finish swatch"
                          className="w-full h-24 object-cover rounded-sm border"
                        />
                        <button
                          type="button"
                          onClick={() => handleItemChange('finish_image', '')}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer border-2 border-dashed rounded-sm p-3 text-center hover:border-accent transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => handleItemChange('finish_image', ev.target.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <Upload className="mx-auto mb-1 text-muted-foreground" size={20} />
                        <p className="text-xs text-muted-foreground">Upload swatch image</p>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Color & Wood Notes */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Color Notes</Label>
                  <Input
                    value={currentItem.color_notes}
                    onChange={(e) => handleItemChange('color_notes', e.target.value)}
                    placeholder="e.g., Antique brass"
                    data-testid="item-color-notes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wood Finish</Label>
                  <Input
                    value={currentItem.wood_finish}
                    onChange={(e) => handleItemChange('wood_finish', e.target.value)}
                    placeholder="e.g., Natural oak"
                    data-testid="item-wood-finish"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Production */}
            <div>
              <h4 className="font-medium mb-3">Production Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="in_house"
                    checked={currentItem.in_house_production}
                    onCheckedChange={(checked) => handleItemChange('in_house_production', checked)}
                    data-testid="item-in-house"
                  />
                  <Label htmlFor="in_house">In-house Production</Label>
                </div>
                <div className="space-y-2">
                  <Label>Machine Hall / Workshop</Label>
                  <Input
                    value={currentItem.machine_hall}
                    onChange={(e) => handleItemChange('machine_hall', e.target.value)}
                    placeholder="e.g., Hall A"
                    data-testid="item-machine-hall"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes with Auto-text Options */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Notes</Label>
                <Select 
                  onValueChange={(value) => {
                    if (value && value !== "none") {
                      // Append selected template to existing notes
                      const currentNotes = currentItem.notes || '';
                      const separator = currentNotes ? '<br/>' : '';
                      handleItemChange('notes', currentNotes + separator + value);
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder="+ Add auto text" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select template...</SelectItem>
                    <SelectItem value="<ul><li>Make as Last Time</li></ul>">Make as Last Time</SelectItem>
                    <SelectItem value="<ul><li>No Yellow Woods</li></ul>">No Yellow Woods</SelectItem>
                    <SelectItem value="<ul><li>Cancellation not done 45 Days</li></ul>">Cancellation 45 Days</SelectItem>
                    <SelectItem value="<ul><li>Handle with Care - Fragile</li></ul>">Handle with Care</SelectItem>
                    <SelectItem value="<ul><li>Rush Order - Priority</li></ul>">Rush Order Priority</SelectItem>
                    <SelectItem value="<ul><li>Check Quality Before Packing</li></ul>">Check Quality</SelectItem>
                    <SelectItem value="<ul><li>Customer Special Request</li></ul>">Customer Special Request</SelectItem>
                    <SelectItem value="<ul><li>Same as Sample Approved</li></ul>">Same as Sample</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <RichTextEditor
                value={currentItem.notes}
                onChange={(value) => handleItemChange('notes', value)}
                placeholder="Enter notes with formatting or select auto-text above..."
                minHeight="120px"
                data-testid="item-notes"
              />
              <p className="text-xs text-muted-foreground">
                Select auto-text templates above or type custom notes. Use toolbar to format.
              </p>
            </div>

            <Separator />

            {/* Product Image & Additional Images */}
            <div>
              <h4 className="font-medium mb-3">Product Images</h4>
              
              {/* Main Product Image (Auto-filled from catalog) */}
              <div className="mb-4">
                <Label className="text-sm mb-2 block">Main Product Image {currentItem.product_image && <span className="text-green-600 text-xs">(Auto-filled from catalog)</span>}</Label>
                <div className="flex gap-4">
                  {currentItem.product_image ? (
                    <div className="relative group w-40 h-40">
                      <img 
                        src={currentItem.product_image} 
                        alt="Product"
                        className="w-full h-full object-cover rounded-sm border-2 border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleItemChange('product_image', '')}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                        Main Image
                      </div>
                    </div>
                  ) : (
                    <label className="w-40 h-40 border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => handleItemChange('product_image', ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <Upload className="mb-2 text-muted-foreground" size={24} />
                      <p className="text-xs text-muted-foreground text-center px-2">Upload main image</p>
                    </label>
                  )}
                </div>
              </div>

              {/* Additional Product Images */}
              <div className="border-t pt-4">
                <Label className="text-sm mb-2 block">Additional Product Information Images</Label>
                <p className="text-xs text-muted-foreground mb-3">Upload reference images, angle shots, or detail photos</p>
                
                <div className="space-y-4">
                  <label className="image-upload-zone block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="item-image-upload"
                    />
                    <Upload className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-sm text-muted-foreground">
                      Click to upload additional images or drag and drop
                    </p>
                  </label>
                  
                  {currentItem.images.length > 0 && (
                    <div className="flex flex-wrap gap-3" data-testid="item-images-preview">
                      {currentItem.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={img} 
                            alt={`Product ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-sm border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-0.5 text-center">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setItemDialogOpen(false);
                  setShowProductSuggestions(false);
                  setProductSearch('');
                }}
                data-testid="cancel-item-btn"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveItem}
                data-testid="save-item-btn"
              >
                {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
