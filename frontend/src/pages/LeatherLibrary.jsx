import { useState, useEffect, useRef } from 'react';
import { leatherApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Plus, Edit, Trash2, Upload, X, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '../contexts/LanguageContext';

export default function LeatherLibrary() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const excelInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    color: '',
    image: '',
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await leatherApi.getAll();
      setItems(response.data);
    } catch (error) {
      console.error('Error loading leather library:', error);
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (item = null) => {
    if (item) {
      setFormData({
        code: item.code,
        name: item.name,
        description: item.description || '',
        color: item.color || '',
        image: item.image || '',
      });
      setEditingItem(item);
    } else {
      setFormData({ code: '', name: '', description: '', color: '', image: '' });
      setEditingItem(null);
    }
    setDialogOpen(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setFormData(prev => ({ ...prev, image: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error(t('invalidFileType'));
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const response = await leatherApi.uploadExcel(file);
      setUploadResult(response.data);
      toast.success(`${response.data.created} ${t('itemsImported')}`);
      loadItems();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error(t('uploadFailed'));
      setUploadResult({ error: error.message });
    } finally {
      setUploading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast.error(t('codeNameRequired'));
      return;
    }
    try {
      if (editingItem) {
        await leatherApi.update(editingItem.id, { ...formData, id: editingItem.id, created_at: editingItem.created_at });
        setItems(items.map(i => i.id === editingItem.id ? { ...i, ...formData } : i));
        toast.success(t('itemUpdated'));
      } else {
        const newItem = { ...formData, id: uuidv4(), created_at: new Date().toISOString() };
        await leatherApi.create(newItem);
        setItems([...items, newItem]);
        toast.success(t('itemCreated'));
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(t('failedToSave'));
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await leatherApi.delete(itemToDelete.id);
      setItems(items.filter(i => i.id !== itemToDelete.id));
      toast.success(t('itemDeleted'));
    } catch (error) {
      toast.error(t('failedToDelete'));
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="loading-spinner"></div></div>;
  }

  return (
    <div className="animate-fade-in" data-testid="leather-library-page">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="page-title" data-testid="leather-title">{t('leatherLibrary')}</h1>
          <p className="page-description">{t('leatherLibraryDesc')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => setUploadDialogOpen(true)} data-testid="bulk-upload-btn">
            <FileSpreadsheet size={18} />
            {t('bulkUpload')}
          </Button>
          <Button className="gap-2 flex-1 sm:flex-none" onClick={() => openDialog()} data-testid="add-leather-btn">
            <Plus size={18} />
            {t('addLeather')}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">{t('noLeatherYet')}</p>
          <Button variant="outline" onClick={() => openDialog()}>{t('addFirstLeather')}</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="card-hover overflow-hidden">
              {item.image ? (
                <div className="h-40 overflow-hidden"><img src={item.image} alt={item.name} className="w-full h-full object-cover" /></div>
              ) : (
                <div className="h-40 flex items-center justify-center" style={{ backgroundColor: item.color || '#8B4513' }}>
                  <span className="text-4xl font-serif font-bold text-white/80">{item.code.charAt(0)}</span>
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono font-medium">{item.code}</p>
                    <p className="text-sm text-muted-foreground">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit size={16} /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }}><Trash2 size={16} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">{editingItem ? t('editLeather') : t('addNewLeather')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('code')} *</Label>
                <Input value={formData.code} onChange={(e) => handleInputChange('code', e.target.value)} placeholder="LTH-001" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>{t('color')}</Label>
                <Input type="color" value={formData.color || '#8B4513'} onChange={(e) => handleInputChange('color', e.target.value)} className="h-10 p-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('name')} *</Label>
              <Input value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Full Grain Tan" />
            </div>
            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Describe..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t('image')}</Label>
              {formData.image ? (
                <div className="relative">
                  <img src={formData.image} alt="Preview" className="w-full h-32 object-cover rounded-sm border" />
                  <button onClick={() => setFormData(prev => ({ ...prev, image: '' }))} className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1"><X size={14} /></button>
                </div>
              ) : (
                <label className="image-upload-zone block cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
                  <p className="text-xs text-muted-foreground">{t('clickToUpload')}</p>
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSubmit}>{editingItem ? t('update') : t('create')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteItemConfirm')} "{itemToDelete?.name}"? {t('cannotUndo')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-serif text-xl flex items-center gap-2"><FileSpreadsheet size={24} />{t('bulkUploadLeather')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">{t('excelFormat')}</h4>
              <p className="text-xs text-muted-foreground">{t('excelFormatDescLibrary')}</p>
              <div className="text-xs text-muted-foreground mt-2">
                <p className="font-medium mb-1">{t('supportedColumns')}:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Code / Leather Code</li>
                  <li>Name / Leather Name</li>
                  <li>Description</li>
                  <li>Color</li>
                  <li>Image Link / Photo Link</li>
                </ul>
              </div>
            </div>
            <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${uploading ? 'bg-muted' : 'hover:bg-muted/50'}`} onClick={() => !uploading && excelInputRef.current?.click()}>
              {uploading ? (
                <div className="flex flex-col items-center"><div className="loading-spinner mb-2"></div><p className="text-sm text-muted-foreground">{t('uploadingItems')}</p></div>
              ) : (
                <><Upload size={40} className="mx-auto text-muted-foreground mb-3" /><p className="text-sm font-medium mb-1">{t('clickToUpload')}</p><p className="text-xs text-muted-foreground">{t('supportedFormat')}: .xlsx, .xls</p></>
              )}
            </div>
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
            {uploadResult && !uploadResult.error && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">{t('uploadSuccess')}</h4>
                <p className="text-sm text-green-700">✓ {uploadResult.created} {t('itemsCreated')}</p>
                {uploadResult.items?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="flex flex-wrap gap-1">
                      {uploadResult.items.slice(0, 10).map((p, idx) => <Badge key={idx} variant="secondary" className="text-xs">{p.code}</Badge>)}
                      {uploadResult.items.length > 10 && <Badge variant="outline" className="text-xs">+{uploadResult.items.length - 10} {t('more')}</Badge>}
                    </div>
                  </div>
                )}
              </div>
            )}
            {uploadResult?.error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg"><h4 className="font-medium text-red-800 mb-1">{t('uploadError')}</h4><p className="text-sm text-red-700">{uploadResult.error}</p></div>}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setUploadResult(null); }}>{t('close')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
