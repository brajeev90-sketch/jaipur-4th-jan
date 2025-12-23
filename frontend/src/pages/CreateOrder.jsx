import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi, factoriesApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

export default function CreateOrder() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [factories, setFactories] = useState([]);
  const [entryDate, setEntryDate] = useState(new Date());
  const [factoryInformDate, setFactoryInformDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    sales_order_ref: '',
    buyer_po_ref: '',
    buyer_name: '',
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    factory_inform_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'Draft',
    factory: '',
    items: [],
  });

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async () => {
    try {
      const response = await factoriesApi.getAll();
      setFactories(response.data);
    } catch (error) {
      console.error('Error loading factories:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEntryDateChange = (selectedDate) => {
    if (selectedDate) {
      setEntryDate(selectedDate);
      handleInputChange('entry_date', format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleFactoryInformDateChange = (selectedDate) => {
    if (selectedDate) {
      setFactoryInformDate(selectedDate);
      handleInputChange('factory_inform_date', format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.sales_order_ref) {
      toast.error(t('salesRefRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await ordersApi.create(formData);
      toast.success(t('orderCreated'));
      navigate(`/orders/${response.data.id}/edit`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(t('failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl" data-testid="create-order-page">
      {/* Header */}
      <div className="page-header">
        <Button 
          variant="ghost" 
          className="mb-4 gap-2"
          onClick={() => navigate('/orders')}
          data-testid="back-btn"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">{t('backToOrders')}</span>
        </Button>
        <h1 className="page-title" data-testid="create-order-title">{t('createOrderTitle')}</h1>
        <p className="page-description">{t('createOrderDesc')}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card data-testid="order-form-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl">{t('orderInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sales_order_ref">{t('salesOrderRefLabel')}</Label>
                <Input
                  id="sales_order_ref"
                  value={formData.sales_order_ref}
                  onChange={(e) => handleInputChange('sales_order_ref', e.target.value)}
                  placeholder="SO-2024-001"
                  className="font-mono"
                  data-testid="sales-order-ref-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer_po_ref">{t('buyerPORefLabel')}</Label>
                <Input
                  id="buyer_po_ref"
                  value={formData.buyer_po_ref}
                  onChange={(e) => handleInputChange('buyer_po_ref', e.target.value)}
                  placeholder="PO-12345"
                  className="font-mono"
                  data-testid="buyer-po-ref-input"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyer_name">{t('buyerNameLabel')}</Label>
                <Input
                  id="buyer_name"
                  value={formData.buyer_name}
                  onChange={(e) => handleInputChange('buyer_name', e.target.value)}
                  placeholder="Enter buyer name"
                  data-testid="buyer-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('entryDateLabel')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !entryDate && "text-muted-foreground"
                      )}
                      data-testid="entry-date-btn"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {entryDate ? format(entryDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={entryDate}
                      onSelect={handleEntryDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 3 - Factory & Factory Inform Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('factoryLabel')}</Label>
                <Select 
                  value={formData.factory} 
                  onValueChange={(value) => handleInputChange('factory', value)}
                >
                  <SelectTrigger data-testid="factory-select">
                    <SelectValue placeholder={t('selectFactory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {factories.map((factory) => (
                      <SelectItem key={factory.id} value={`${factory.code} - ${factory.name}`}>
                        <span className="font-mono">{factory.code}</span> - {factory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Factory Inform Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !factoryInformDate && "text-muted-foreground"
                      )}
                      data-testid="factory-inform-date-btn"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {factoryInformDate ? format(factoryInformDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={factoryInformDate}
                      onSelect={handleFactoryInformDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/orders')}
                className="w-full sm:w-auto"
                data-testid="cancel-btn"
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="gap-2 w-full sm:w-auto"
                data-testid="create-order-submit-btn"
              >
                <Save size={18} />
                {loading ? t('creating') : t('createOrderBtn')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
