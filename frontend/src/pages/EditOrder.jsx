import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi, factoriesApi, categoriesApi, leatherApi, finishApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  GripVertical
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
  const [date, setDate] = useState(new Date());
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  
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
      const [orderRes, factoriesRes, categoriesRes, leatherRes, finishRes] = await Promise.all([
        ordersApi.getById(id),
        factoriesApi.getAll(),
        categoriesApi.getAll(),
        leatherApi.getAll(),
        finishApi.getAll(),
      ]);
      
      setOrder(orderRes.data);
      setFactories(factoriesRes.data);
      setCategories(categoriesRes.data);
      setLeatherLibrary(leatherRes.data);
      setFinishLibrary(finishRes.data);
      
      if (orderRes.data.entry_date) {
        setDate(new Date(orderRes.data.entry_date));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = (field, value) => {
    setOrder(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (selectedDate) => {
    setDate(selectedDate);
    handleOrderChange('entry_date', format(selectedDate, 'yyyy-MM-dd'));
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
      setCurrentItem({ ...order.items[index] });
      setEditingItemIndex(index);
    } else {
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
        notes: '',
        images: [],
        reference_images: [],
      });
      setEditingItemIndex(null);
    }
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

    setCurrentItem(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
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

    setOrder(prev => {
      const newItems = [...prev.items];
      if (editingItemIndex !== null) {
        newItems[editingItemIndex] = currentItem;
      } else {
        newItems.push(currentItem);
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

          <div className="grid grid-cols-3 gap-4">
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
                    {date ? format(date, "PPP") : "Pick a date"}
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
                  
                  {item.images?.length > 0 ? (
                    <img 
                      src={item.images[0]} 
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

      {/* Item Editor Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingItemIndex !== null ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Product Code *</Label>
                <Input
                  value={currentItem.product_code}
                  onChange={(e) => handleItemChange('product_code', e.target.value)}
                  placeholder="PRD-001"
                  className="font-mono"
                  data-testid="item-product-code"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={currentItem.category || "none"} 
                  onValueChange={(value) => handleItemChange('category', value === "none" ? "" : value)}
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
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) => handleItemChange('quantity', parseInt(e.target.value) || 1)}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leather Code</Label>
                  <Select 
                    value={currentItem.leather_code || "none"} 
                    onValueChange={(value) => handleItemChange('leather_code', value === "none" ? "" : value)}
                  >
                    <SelectTrigger data-testid="item-leather">
                      <SelectValue placeholder="Select leather" />
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
                </div>
                <div className="space-y-2">
                  <Label>Finish Code</Label>
                  <Select 
                    value={currentItem.finish_code || "none"} 
                    onValueChange={(value) => handleItemChange('finish_code', value === "none" ? "" : value)}
                  >
                    <SelectTrigger data-testid="item-finish">
                      <SelectValue placeholder="Select finish" />
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
                </div>
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

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={currentItem.notes}
                onChange={(e) => handleItemChange('notes', e.target.value)}
                placeholder="Enter notes (use • for bullet points)"
                rows={4}
                className="min-h-[120px]"
                data-testid="item-notes"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Use • for bullet points, **text** for bold
              </p>
            </div>

            <Separator />

            {/* Images */}
            <div>
              <h4 className="font-medium mb-3">Product Images</h4>
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
                    Click to upload images or drag and drop
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
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`remove-image-${idx}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setItemDialogOpen(false)}
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
