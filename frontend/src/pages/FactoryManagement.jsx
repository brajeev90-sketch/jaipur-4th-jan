import { useState, useEffect } from 'react';
import { factoriesApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Badge } from '../components/ui/badge';
import { Building2, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

export default function FactoryManagement() {
  const { t } = useLanguage();
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [factoryToDelete, setFactoryToDelete] = useState(null);
  const [editingFactory, setEditingFactory] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '' });

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async () => {
    try {
      const response = await factoriesApi.getAll();
      setFactories(response.data);
    } catch (error) {
      console.error('Error loading factories:', error);
      toast.error('Failed to load factories');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (factory = null) => {
    if (factory) {
      setFormData({ code: factory.code, name: factory.name });
      setEditingFactory(factory);
    } else {
      setFormData({ code: '', name: '' });
      setEditingFactory(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Code and Name are required');
      return;
    }

    try {
      if (editingFactory) {
        // For now, delete and recreate (simple approach)
        await factoriesApi.delete(editingFactory.id);
        const response = await factoriesApi.create(formData);
        setFactories(factories.map(f => f.id === editingFactory.id ? response.data : f));
        toast.success('Factory updated successfully');
      } else {
        const response = await factoriesApi.create(formData);
        setFactories([...factories, response.data]);
        toast.success('Factory added successfully');
      }
      setDialogOpen(false);
      setFormData({ code: '', name: '' });
      setEditingFactory(null);
      loadFactories(); // Reload to get fresh data
    } catch (error) {
      console.error('Error saving factory:', error);
      toast.error('Failed to save factory');
    }
  };

  const handleDelete = async () => {
    if (!factoryToDelete) return;

    try {
      await factoriesApi.delete(factoryToDelete.id);
      setFactories(factories.filter(f => f.id !== factoryToDelete.id));
      toast.success('Factory deleted successfully');
    } catch (error) {
      console.error('Error deleting factory:', error);
      toast.error('Failed to delete factory');
    } finally {
      setDeleteDialogOpen(false);
      setFactoryToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="factory-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="factory-management-page">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3" data-testid="factory-title">
            <Building2 size={28} />
            {t('factoryManagementTitle')}
          </h1>
          <p className="page-description">{t('factoryManagementDesc')}</p>
        </div>
        <Button 
          className="gap-2 w-full sm:w-auto" 
          onClick={() => openDialog()}
          data-testid="add-factory-btn"
        >
          <Plus size={18} />
          {t('addFactory')}
        </Button>
      </div>

      {/* Factories Grid */}
      {factories.length === 0 ? (
        <Card data-testid="empty-factories">
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground mb-4">{t('noFactoriesYet')}</p>
            <Button variant="outline" onClick={() => openDialog()}>
              {t('addFirstFactory')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="factories-grid">
          {factories.map((factory) => (
            <Card 
              key={factory.id} 
              className="card-hover"
              data-testid={`factory-card-${factory.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-sm bg-primary/10">
                      <Building2 className="text-primary" size={24} />
                    </div>
                    <div>
                      <Badge variant="outline" className="font-mono text-base mb-1">
                        {factory.code}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{factory.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openDialog(factory)}
                      data-testid={`edit-factory-${factory.id}`}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setFactoryToDelete(factory);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`delete-factory-${factory.id}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Factory Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingFactory ? t('editFactory') : t('addNewFactory')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('factoryCode')}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SAE"
                className="font-mono text-lg"
                maxLength={5}
                data-testid="factory-code-input"
              />
              <p className="text-xs text-muted-foreground">{t('factoryCodeDesc')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('factoryName')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Shekhawati Art Exports"
                data-testid="factory-name-input"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit} data-testid="save-factory-btn">
                {editingFactory ? t('update') : t('add')} {t('factory')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteFactory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteFactoryConfirm')} "{factoryToDelete?.code} - {factoryToDelete?.name}"? 
              {t('cannotUndo')}
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
    </div>
  );
}
