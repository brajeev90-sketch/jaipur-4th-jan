import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  PlusCircle, 
  Search, 
  FileText,
  Trash2,
  Eye,
  Edit
} from 'lucide-react';

// Helper function to format date as DD-MM-YYYY
const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};
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
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

const statusColors = {
  'Draft': 'bg-yellow-100 text-yellow-800',
  'Submitted': 'bg-blue-100 text-blue-800',
  'In Production': 'bg-purple-100 text-purple-800',
  'Done': 'bg-green-100 text-green-800',
};

export default function OrdersList() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ordersApi.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    
    try {
      await ordersApi.delete(orderToDelete.id);
      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      toast.success(t('orderDeleted'));
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(t('failedToDelete'));
    } finally {
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.sales_order_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_po_ref?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="orders-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="orders-list-page">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="page-title" data-testid="orders-title">{t('ordersTitle')}</h1>
          <p className="page-description">{t('ordersDesc')}</p>
        </div>
        <Link to="/orders/new">
          <Button className="gap-2 w-full sm:w-auto" data-testid="new-order-btn">
            <PlusCircle size={18} />
            {t('newOrder')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6" data-testid="filters-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="status-filter">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="Draft">{t('statusDraft')}</SelectItem>
                <SelectItem value="Submitted">{t('statusSubmitted')}</SelectItem>
                <SelectItem value="In Production">{t('statusInProduction')}</SelectItem>
                <SelectItem value="Done">{t('statusDone')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card data-testid="orders-table-card">
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="empty-state" data-testid="empty-orders">
              <FileText className="empty-state-icon mx-auto" />
              <p className="mb-4">{t('noOrdersFound')}</p>
              <Link to="/orders/new">
                <Button variant="outline">{t('createNewOrder')}</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="orders-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('salesOrderRef')}</TableHead>
                    <TableHead>{t('buyer')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('buyerPO')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('entryDate')}</TableHead>
                    <TableHead>{t('items')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                      <TableCell className="font-mono font-medium">
                        {order.sales_order_ref || '-'}
                      </TableCell>
                      <TableCell>{order.buyer_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">
                        {order.buyer_po_ref || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDateDDMMYYYY(order.entry_date)}</TableCell>
                      <TableCell>{order.items?.length || 0}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link to={`/orders/${order.id}`}>
                            <Button variant="ghost" size="icon" data-testid={`view-order-${order.id}`}>
                              <Eye size={16} />
                            </Button>
                          </Link>
                          <Link to={`/orders/${order.id}/edit`}>
                            <Button variant="ghost" size="icon" data-testid={`edit-order-${order.id}`}>
                              <Edit size={16} />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setOrderToDelete(order);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-order-${order.id}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteOrderConfirm')} "{orderToDelete?.sales_order_ref}"? {t('cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
