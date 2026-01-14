import { useState, useEffect, useRef, useCallback } from 'react';
import { productsApi, categoriesApi, templatesApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit, 
  Search,
  Upload,
  Download,
  Image as ImageIcon,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

export default function Products() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [formData, setFormData] = useState({
    product_code: '',
    description: '',
    category: '',
    size: '',
    height_cm: 0,
    depth_cm: 0,
    width_cm: 0,
    cbm: 0,
    fob_price_usd: 0,
    fob_price_gbp: 0,
    warehouse_price_1: 0,
    warehouse_price_2: 0,
    image: '',
    images: []
  });
  const fileInputRef = useRef(null);
  const fileInputRef2 = useRef(null);
  const excelInputRef = useRef(null);
  const [imageIndices, setImageIndices] = useState({}); // Track current image index for each product
  const [loadedImages, setLoadedImages] = useState({}); // Cache for lazy-loaded images
  const [loadingImages, setLoadingImages] = useState({}); // Track which products are loading images
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 12;

  useEffect(() => {
    loadData();
  }, []);

  // Reset to page 1 when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  // Filter products (needed before useEffect)
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Load all images for current page products at once
  useEffect(() => {
    const loadPageImages = async () => {
      // Get products for current page that need images loaded
      const productsToLoad = paginatedProducts.filter(
        p => productHasImages(p) && !loadedImages[p.id] && !loadingImages[p.id] && !p.image
      );
      
      if (productsToLoad.length === 0) return;
      
      // Mark all as loading
      const loadingUpdate = {};
      productsToLoad.forEach(p => { loadingUpdate[p.id] = true; });
      setLoadingImages(prev => ({ ...prev, ...loadingUpdate }));
      
      // Load all images in parallel
      const results = await Promise.allSettled(
        productsToLoad.map(async (product) => {
          try {
            const res = await productsApi.getImages(product.id);
            return {
              id: product.id,
              image: res.data.image || '',
              images: res.data.images || []
            };
          } catch (error) {
            console.error(`Error loading images for ${product.id}:`, error);
            return { id: product.id, image: '', images: [] };
          }
        })
      );
      
      // Update loaded images
      const imagesUpdate = {};
      const loadingClear = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { id, image, images } = result.value;
          imagesUpdate[id] = { image, images };
          loadingClear[id] = false;
        }
      });
      
      setLoadedImages(prev => ({ ...prev, ...imagesUpdate }));
      setLoadingImages(prev => ({ ...prev, ...loadingClear }));
    };
    
    if (paginatedProducts.length > 0) {
      loadPageImages();
    }
  }, [currentPage, products.length, searchTerm, categoryFilter]); // Re-run when page or filters change

  const loadData = async () => {
    try {
      const productsRes = await productsApi.getAll();
      setProducts(productsRes.data);
      // Categories API might not exist, handle gracefully
      try {
        const categoriesRes = await categoriesApi.getAll();
        setCategories(categoriesRes.data || []);
      } catch {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error(t('invalidFileType'));
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const response = await productsApi.uploadExcel(file);
      setUploadResult(response.data);
      toast.success(`${response.data.created} ${t('productsImported')}`);
      loadData(); // Reload products
    } catch (error) {
      console.error('Error uploading Excel:', error);
      toast.error(t('uploadFailed'));
      setUploadResult({ error: error.message });
    } finally {
      setUploading(false);
      // Reset file input
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    }
  };

  const openDialog = async (product = null) => {
    if (product) {
      // Start with basic data immediately
      setFormData({
        product_code: product.product_code || '',
        description: product.description || '',
        category: product.category || '',
        size: product.size || '',
        height_cm: product.height_cm || 0,
        depth_cm: product.depth_cm || 0,
        width_cm: product.width_cm || 0,
        cbm: product.cbm || 0,
        fob_price_usd: product.fob_price_usd || 0,
        fob_price_gbp: product.fob_price_gbp || 0,
        warehouse_price_1: product.warehouse_price_1 || 0,
        warehouse_price_2: product.warehouse_price_2 || 0,
        image: product.image || '',
        images: product.images || []
      });
      setEditingProduct(product);
      setDialogOpen(true);
      
      // Lazy load images if not already loaded (lite mode)
      if ((product.has_image || product.has_image_2) && !product.image) {
        try {
          const imagesRes = await productsApi.getImages(product.id);
          setFormData(prev => ({
            ...prev,
            image: imagesRes.data.image || '',
            images: imagesRes.data.images || []
          }));
        } catch (error) {
          console.error('Error loading product images:', error);
        }
      }
    } else {
      setFormData({
        product_code: '',
        description: '',
        category: '',
        size: '',
        height_cm: 0,
        depth_cm: 0,
        width_cm: 0,
        cbm: 0,
        fob_price_usd: 0,
        fob_price_gbp: 0,
        warehouse_price_1: 0,
        warehouse_price_2: 0,
        image: '',
        images: []
      });
      setEditingProduct(null);
      setDialogOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!formData.product_code) {
      toast.error(t('productCodeRequired'));
      return;
    }

    // Check for duplicate product code (only for new products)
    if (!editingProduct) {
      const existingProduct = products.find(
        p => p.product_code.toLowerCase() === formData.product_code.toLowerCase()
      );
      if (existingProduct) {
        toast.error(`Product code "${formData.product_code}" already exists!`);
        return;
      }
    }

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
        toast.success(t('productUpdated'));
      } else {
        await productsApi.create(formData);
        toast.success(t('productAdded'));
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(t('failedToSave'));
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      await productsApi.delete(productToDelete.id);
      setProducts(products.filter(p => p.id !== productToDelete.id));
      toast.success(t('productDeleted'));
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(t('failedToDelete'));
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleImageUpload = (e, imageNumber = 1) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (imageNumber === 1) {
          setFormData(prev => ({ ...prev, image: reader.result }));
        } else {
          // Second image goes into images array
          setFormData(prev => ({ ...prev, images: [reader.result] }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Get all images for a product (combine image + images array, with lazy loading support)
  const getProductImages = (product) => {
    // Check if we have cached images for this product
    const cached = loadedImages[product.id];
    if (cached) {
      const allImages = [];
      if (cached.image) allImages.push(cached.image);
      if (cached.images && cached.images.length > 0) {
        allImages.push(...cached.images);
      }
      return allImages;
    }
    
    // Use direct product images if available
    const allImages = [];
    if (product.image) allImages.push(product.image);
    if (product.images && product.images.length > 0) {
      allImages.push(...product.images);
    }
    return allImages;
  };

  // Check if product has images (works in lite mode)
  const productHasImages = (product) => {
    return product.has_image || product.has_image_2 || product.image || (product.images && product.images.length > 0);
  };

  // Lazy load images for a product (manual - on hover/click)
  const loadProductImages = async (productId) => {
    if (loadedImages[productId] || loadingImages[productId]) return;
    
    setLoadingImages(prev => ({ ...prev, [productId]: true }));
    try {
      const res = await productsApi.getImages(productId);
      setLoadedImages(prev => ({
        ...prev,
        [productId]: {
          image: res.data.image || '',
          images: res.data.images || []
        }
      }));
    } catch (error) {
      console.error('Error loading product images:', error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Navigate product images
  const navigateProductImage = (productId, direction) => {
    setImageIndices(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p.id === productId);
      const images = getProductImages(product);
      const maxIndex = images.length - 1;
      
      let newIndex;
      if (direction === 'next') {
        newIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
      }
      
      return { ...prev, [productId]: newIndex };
    });
  };

  const calculateCBM = () => {
    const { height_cm, depth_cm, width_cm } = formData;
    if (height_cm && depth_cm && width_cm) {
      const cbm = (height_cm * depth_cm * width_cm) / 1000000;
      setFormData({ ...formData, cbm: parseFloat(cbm.toFixed(3)) });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="products-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="products-page">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3" data-testid="products-title">
            <Package size={28} />
            {t('productsTitle')}
          </h1>
          <p className="page-description">{t('productsDesc')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            className="gap-2 flex-1 sm:flex-none" 
            onClick={() => setUploadDialogOpen(true)}
            data-testid="bulk-upload-btn"
          >
            <FileSpreadsheet size={18} />
            {t('bulkUpload')}
          </Button>
          <Button 
            className="gap-2 flex-1 sm:flex-none" 
            onClick={() => openDialog()}
            data-testid="add-product-btn"
          >
            <Plus size={18} />
            {t('addProduct')}
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder={t('searchProducts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="category-filter">
                <SelectValue placeholder={t('allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card data-testid="empty-products">
          <CardContent className="py-12 text-center">
            <Package className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground mb-4">{t('noProductsYet')}</p>
            <Button variant="outline" onClick={() => openDialog()}>
              {t('addFirstProduct')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="products-grid">
          {paginatedProducts.map((product) => (
            <Card 
              key={product.id} 
              className="card-hover overflow-hidden"
              data-testid={`product-card-${product.id}`}
            >
              {/* Product Image with Navigation */}
              <div className="aspect-square bg-muted relative group">
                {(() => {
                  const images = getProductImages(product);
                  const currentIndex = imageIndices[product.id] || 0;
                  const currentImage = images[currentIndex];
                  const hasImageFlag = productHasImages(product);
                  const isLoading = loadingImages[product.id];
                  
                  return (
                    <>
                      {currentImage ? (
                        <img 
                          src={currentImage} 
                          alt={product.description}
                          className="w-full h-full object-contain bg-white"
                        />
                      ) : isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Loader2 className="text-primary/60 animate-spin" size={32} />
                          <span className="text-xs text-muted-foreground mt-2">Loading...</span>
                        </div>
                      ) : hasImageFlag ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Loader2 className="text-primary/40" size={32} />
                          <span className="text-xs text-muted-foreground mt-2">Loading image...</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="text-muted-foreground" size={48} />
                        </div>
                      )}
                      
                      {/* Navigation Arrows - Show only if multiple images loaded */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateProductImage(product.id, 'prev');
                            }}
                            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`product-prev-image-${product.id}`}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateProductImage(product.id, 'next');
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`product-next-image-${product.id}`}
                          >
                            <ChevronRight size={18} />
                          </button>
                          
                          {/* Image indicator dots */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {images.map((_, idx) => (
                              <div 
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
                {product.category && (
                  <Badge className="absolute top-2 left-2 text-xs">
                    {categories.find(c => c.id === product.category)?.name || product.category}
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="font-mono text-sm">
                      {product.product_code}
                    </Badge>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openDialog(product)}
                        data-testid={`edit-product-${product.id}`}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setProductToDelete(product);
                          setDeleteDialogOpen(true);
                        }}
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium line-clamp-2">{product.description}</p>
                  
                  {product.size && (
                    <p className="text-xs text-muted-foreground">{t('size')}: {product.size}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {product.height_cm}×{product.depth_cm}×{product.width_cm} cm
                    </span>
                    {product.cbm > 0 && (
                      <span>CBM: {product.cbm}</span>
                    )}
                  </div>
                  
                  {(product.fob_price_usd > 0 || product.fob_price_gbp > 0) && (
                    <div className="flex gap-2 text-xs font-medium pt-2 border-t">
                      {product.fob_price_usd > 0 && (
                        <span className="text-green-600">${product.fob_price_usd}</span>
                      )}
                      {product.fob_price_gbp > 0 && (
                        <span className="text-blue-600">£{product.fob_price_gbp}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              data-testid="prev-page-btn"
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(page)}
                  data-testid={`page-${page}-btn`}
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              data-testid="next-page-btn"
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
        </>
      )}

      {/* Stats */}
      <div className="mt-6 text-sm text-muted-foreground text-center">
        {t('showing')} {paginatedProducts.length} {t('of')} {filteredProducts.length} {t('productsLabel')}
        {filteredProducts.length !== products.length && (
          <span> (filtered from {products.length} total)</span>
        )}
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingProduct ? t('editProduct') : t('addNewProduct')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('productCode')} *</Label>
                <Input
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., KRL-2-180CM"
                  className="font-mono"
                  data-testid="product-code-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('category')}</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={async (value) => {
                    if (value === "add-new") {
                      const newCategory = prompt("Enter new category name:");
                      if (newCategory && newCategory.trim()) {
                        try {
                          const response = await categoriesApi.create({ name: newCategory.trim() });
                          setCategories(prev => [...prev, response.data]);
                          setFormData({ ...formData, category: response.data.id });
                          toast.success(`Category "${newCategory.trim()}" added!`);
                        } catch (err) {
                          toast.error("Failed to add category");
                        }
                      }
                    } else {
                      setFormData({ ...formData, category: value });
                    }
                  }}
                >
                  <SelectTrigger data-testid="product-category-select">
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                    <SelectItem value="add-new" className="text-primary font-medium">
                      + Add New Category
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Kerela Artificial Edge Spider Leg Dining Table"
                data-testid="product-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('size')}</Label>
              <Input
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="e.g., 180*90 cm"
                data-testid="product-size-input"
              />
            </div>

            {/* Dimensions */}
            <div>
              <Label className="mb-2 block">{t('dimensions')}</Label>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('heightCm')}</Label>
                  <Input
                    type="number"
                    value={formData.height_cm || ''}
                    onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || 0 })}
                    onBlur={calculateCBM}
                    data-testid="product-height-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('depthCm')}</Label>
                  <Input
                    type="number"
                    value={formData.depth_cm || ''}
                    onChange={(e) => setFormData({ ...formData, depth_cm: parseFloat(e.target.value) || 0 })}
                    onBlur={calculateCBM}
                    data-testid="product-depth-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('widthCm')}</Label>
                  <Input
                    type="number"
                    value={formData.width_cm || ''}
                    onChange={(e) => setFormData({ ...formData, width_cm: parseFloat(e.target.value) || 0 })}
                    onBlur={calculateCBM}
                    data-testid="product-width-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CBM</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.cbm || ''}
                    onChange={(e) => setFormData({ ...formData, cbm: parseFloat(e.target.value) || 0 })}
                    data-testid="product-cbm-input"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <Label className="mb-2 block">{t('pricing')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">FOB $ (USD)</Label>
                  <Input
                    type="number"
                    value={formData.fob_price_usd || ''}
                    onChange={(e) => setFormData({ ...formData, fob_price_usd: parseFloat(e.target.value) || 0 })}
                    data-testid="product-fob-usd-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">FOB £ (GBP)</Label>
                  <Input
                    type="number"
                    value={formData.fob_price_gbp || ''}
                    onChange={(e) => setFormData({ ...formData, fob_price_gbp: parseFloat(e.target.value) || 0 })}
                    data-testid="product-fob-gbp-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('warehousePrice')} 1</Label>
                  <Input
                    type="number"
                    value={formData.warehouse_price_1 || ''}
                    onChange={(e) => setFormData({ ...formData, warehouse_price_1: parseFloat(e.target.value) || 0 })}
                    data-testid="product-warehouse1-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('warehousePrice')} 2</Label>
                  <Input
                    type="number"
                    value={formData.warehouse_price_2 || ''}
                    onChange={(e) => setFormData({ ...formData, warehouse_price_2: parseFloat(e.target.value) || 0 })}
                    data-testid="product-warehouse2-input"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload - Two Images */}
            <div className="space-y-2">
              <Label>{t('productImage')} (Max 2 images)</Label>
              <div className="flex gap-4 flex-wrap">
                {/* Image 1 - Main Image */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Image 1 (Main)</span>
                  {formData.image ? (
                    <div className="relative w-32 h-32 border rounded-sm overflow-hidden">
                      <img src={formData.image} alt="Product" className="w-full h-full object-contain" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setFormData({ ...formData, image: '' })}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="w-32 h-32 border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={24} className="text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">{t('upload')}</span>
                    </div>
                  )}
                </div>
                
                {/* Image 2 - Second Image */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Image 2</span>
                  {formData.images && formData.images[0] ? (
                    <div className="relative w-32 h-32 border rounded-sm overflow-hidden">
                      <img src={formData.images[0]} alt="Product 2" className="w-full h-full object-contain" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setFormData({ ...formData, images: [] })}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="w-32 h-32 border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef2.current?.click()}
                    >
                      <Upload size={24} className="text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">{t('upload')}</span>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 1)}
                />
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 2)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit} data-testid="save-product-btn">
                {editingProduct ? t('update') : t('add')} {t('product')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProduct')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteProductConfirm')} &quot;{productToDelete?.product_code}&quot;? {t('cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <FileSpreadsheet size={24} />
              {t('bulkUploadProducts')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Download Sample */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">{t('downloadSampleFirst')}</p>
                <p className="text-xs text-blue-600">{t('downloadSampleDesc')}</p>
              </div>
              <a href={templatesApi.productsSample()} download>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download size={16} />
                  {t('downloadSample')}
                </Button>
              </a>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">{t('excelFormat')}</h4>
              <p className="text-xs text-muted-foreground">{t('excelFormatDesc')}</p>
              <div className="text-xs text-muted-foreground mt-2">
                <p className="font-medium mb-1">{t('supportedColumns')}:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Product Code / Item Code</li>
                  <li>Description</li>
                  <li>Size</li>
                  <li>H (Height), D (Depth), W (Width)</li>
                  <li>CBM</li>
                  <li>FOB India Price $ / FOB India Price £</li>
                  <li>Warehouse Price £700 / £2000</li>
                  <li>Photo Link ({t('imageUrlNote')})</li>
                </ul>
              </div>
            </div>

            {/* Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                uploading ? 'bg-muted border-muted-foreground/30' : 'hover:bg-muted/50 hover:border-primary/50'
              }`}
              onClick={() => !uploading && excelInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="loading-spinner mb-2"></div>
                  <p className="text-sm text-muted-foreground">{t('uploadingProducts')}</p>
                </div>
              ) : (
                <>
                  <Upload size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">{t('clickToUpload')}</p>
                  <p className="text-xs text-muted-foreground">{t('supportedFormat')}: .xlsx, .xls</p>
                </>
              )}
            </div>
            
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelUpload}
            />

            {/* Upload Result */}
            {uploadResult && !uploadResult.error && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">{t('uploadSuccess')}</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p>✓ {uploadResult.created} {t('productsCreated')}</p>
                  {uploadResult.skipped > 0 && (
                    <p>⊘ {uploadResult.skipped} {t('rowsSkipped')}</p>
                  )}
                </div>
                {uploadResult.products && uploadResult.products.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-600 mb-2">{t('importedProducts')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {uploadResult.products.slice(0, 10).map((p, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {p.product_code}
                        </Badge>
                      ))}
                      {uploadResult.products.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{uploadResult.products.length - 10} {t('more')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadResult?.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-1">{t('uploadError')}</h4>
                <p className="text-sm text-red-700">{uploadResult.error}</p>
              </div>
            )}

            {uploadResult?.errors && uploadResult.errors.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-1">{t('warnings')}</h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {uploadResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setUploadDialogOpen(false);
                setUploadResult(null);
              }}>
                {t('close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
