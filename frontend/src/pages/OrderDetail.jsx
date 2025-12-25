import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  ArrowLeft, 
  Edit, 
  FileDown, 
  FileText, 
  Eye,
  Download,
  Share2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  'Draft': 'bg-yellow-100 text-yellow-800',
  'Submitted': 'bg-blue-100 text-blue-800',
  'In Production': 'bg-purple-100 text-purple-800',
  'Done': 'bg-green-100 text-green-800',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await ordersApi.getById(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    window.open(ordersApi.exportPdf(id), '_blank');
    toast.success('PDF download started');
  };

  const handleExportPpt = () => {
    window.open(ordersApi.exportPpt(id), '_blank');
    toast.success('PPT download started');
  };

  const handleWhatsAppShare = async () => {
    setSharing(true);
    try {
      const pdfUrl = ordersApi.exportPdf(id);
      
      let message = `*JAIPUR Production Sheet*\n\n`;
      message += `📋 *Order:* ${order?.sales_order_ref || 'N/A'}\n`;
      message += `👤 *Buyer:* ${order?.buyer_name || 'N/A'}\n`;
      message += `📅 *Date:* ${order?.entry_date || 'N/A'}\n`;
      message += `📦 *Items:* ${order?.items?.length || 0}\n\n`;
      
      if (order?.items?.length > 0) {
        message += `*Items:*\n`;
        order.items.forEach((item, idx) => {
          message += `${idx + 1}. ${item.product_code} - ${item.description || 'No desc'} (Qty: ${item.quantity})\n`;
        });
        message += `\n`;
      }
      
      message += `📥 *Download PDF:*\n${pdfUrl}`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('Opening WhatsApp...');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="order-detail-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty-state" data-testid="order-not-found">
        <FileText className="empty-state-icon mx-auto" />
        <p>Order not found</p>
        <Link to="/orders">
          <Button variant="outline" className="mt-4">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="order-detail-page">
      {/* Header */}
      <div className="page-header">
        <Button 
          variant="ghost" 
          className="mb-4 gap-2"
          onClick={() => navigate('/orders')}
          data-testid="back-btn"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back to Orders</span>
        </Button>
        
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="page-title font-mono text-lg sm:text-2xl" data-testid="order-ref">
                {order.sales_order_ref || 'Untitled Order'}
              </h1>
              <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                {order.status}
              </Badge>
            </div>
            <p className="page-description text-sm">
              Buyer: {order.buyer_name || 'N/A'} | PO: {order.buyer_po_ref || 'N/A'}
            </p>
          </div>
          
          {/* Action Buttons - Responsive */}
          <div className="flex flex-wrap gap-2">
            <Link to={`/orders/${id}/preview`} className="flex-1 sm:flex-none">
              <Button variant="outline" className="gap-2 w-full sm:w-auto" data-testid="preview-btn">
                <Eye size={18} />
                <span>Preview</span>
              </Button>
            </Link>
            <Button 
              className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              onClick={handleWhatsAppShare}
              disabled={sharing}
              data-testid="whatsapp-btn"
            >
              {sharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
              <span>WhatsApp</span>
            </Button>
            <Button 
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
              onClick={handleExportPdf}
              data-testid="export-pdf-btn"
            >
              <FileDown size={18} />
              <span>PDF</span>
            </Button>
            <Link to={`/orders/${id}/edit`} className="flex-1 sm:flex-none">
              <Button variant="secondary" className="gap-2 w-full sm:w-auto" data-testid="edit-btn">
                <Edit size={18} />
                <span>Edit</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Order Info */}
      <Card className="mb-6" data-testid="order-info-card">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Entry Date</p>
              <p className="font-medium">{order.entry_date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Factory</p>
              <p className="font-medium">{order.factory || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="font-medium">{order.items?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card data-testid="items-card">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(!order.items || order.items.length === 0) ? (
            <div className="empty-state" data-testid="no-items">
              <FileText className="empty-state-icon mx-auto" />
              <p>No items in this order</p>
              <Link to={`/orders/${id}/edit`}>
                <Button variant="outline" className="mt-4">Add Items</Button>
              </Link>
            </div>
          ) : (
            <Table data-testid="items-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">H (cm)</TableHead>
                  <TableHead className="text-center">D (cm)</TableHead>
                  <TableHead className="text-center">W (cm)</TableHead>
                  <TableHead className="text-center">CBM</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Images</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => {
                  const cbm = item.cbm_auto 
                    ? ((item.height_cm || 0) * (item.depth_cm || 0) * (item.width_cm || 0) / 1000000).toFixed(4)
                    : item.cbm;
                  
                  return (
                    <TableRow key={item.id || index} data-testid={`item-row-${index}`}>
                      <TableCell className="font-mono font-medium">
                        {item.product_code || '-'}
                      </TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell className="text-center">{item.height_cm || 0}</TableCell>
                      <TableCell className="text-center">{item.depth_cm || 0}</TableCell>
                      <TableCell className="text-center">{item.width_cm || 0}</TableCell>
                      <TableCell className="text-center font-mono">{cbm}</TableCell>
                      <TableCell className="text-center">{item.quantity || 1}</TableCell>
                      <TableCell>
                        {item.images?.length > 0 ? (
                          <span className="text-sm text-muted-foreground">
                            {item.images.length} image(s)
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
