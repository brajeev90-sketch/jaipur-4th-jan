import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { 
  ArrowLeft, 
  FileDown, 
  Download,
  ChevronLeft,
  ChevronRight,
  Share2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const [orderRes] = await Promise.all([
        ordersApi.getById(id),
      ]);
      setOrder(orderRes.data);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load preview');
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
      // Generate PDF URL
      const pdfUrl = ordersApi.exportPdf(id);
      
      // Create share message with order details
      const orderRef = order?.sales_order_ref || 'N/A';
      const buyerName = order?.buyer_name || 'N/A';
      const itemCount = order?.items?.length || 0;
      const entryDate = order?.entry_date || 'N/A';
      
      // Create detailed message
      let message = `*JAIPUR Production Sheet*\n\n`;
      message += `📋 *Order:* ${orderRef}\n`;
      message += `👤 *Buyer:* ${buyerName}\n`;
      message += `📅 *Date:* ${entryDate}\n`;
      message += `📦 *Items:* ${itemCount}\n\n`;
      
      // Add item details
      if (order?.items?.length > 0) {
        message += `*Items:*\n`;
        order.items.forEach((item, idx) => {
          message += `${idx + 1}. ${item.product_code} - ${item.description || 'No desc'} (Qty: ${item.quantity})\n`;
        });
        message += `\n`;
      }
      
      message += `📥 *Download PDF:*\n${pdfUrl}`;
      
      // Open WhatsApp with the message
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
      <div className="flex items-center justify-center h-64" data-testid="preview-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const totalPages = order?.items?.length || 0;

  return (
    <div className="animate-fade-in" data-testid="preview-page">
      {/* Header */}
      <div className="page-header">
        <Button 
          variant="ghost" 
          className="mb-4 gap-2"
          onClick={() => navigate(`/orders/${id}`)}
          data-testid="back-btn"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back to Order</span>
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="page-title" data-testid="preview-title">Production Sheet</h1>
            <p className="page-description font-mono text-sm">{order?.sales_order_ref || 'Order'} • {order?.buyer_name || 'No Buyer'}</p>
          </div>
          
          {/* Action Buttons - Responsive */}
          <div className="flex flex-wrap gap-2">
            <Button 
              className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              onClick={handleWhatsAppShare}
              disabled={sharing}
              data-testid="whatsapp-share-btn"
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
              <span className="hidden sm:inline">Download</span> PDF
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 hidden sm:flex"
              onClick={handleExportPpt}
              data-testid="export-ppt-btn"
            >
              <Download size={18} />
              PPT
            </Button>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      {totalPages > 0 && (
        <div className="flex items-center justify-center gap-4 mb-4 sm:mb-6" data-testid="page-navigation">
          <Button 
            variant="outline" 
            size="icon"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
            data-testid="prev-page-btn"
          >
            <ChevronLeft size={18} />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="icon"
            disabled={currentPage === totalPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
            data-testid="next-page-btn"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      )}

      {/* Preview Container */}
      <div className="preview-container rounded-sm overflow-x-auto" data-testid="preview-container">
        {totalPages === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No items to preview</p>
            <Link to={`/orders/${id}/edit`}>
              <Button variant="outline">Add Items</Button>
            </Link>
          </div>
        ) : (
          <div 
            className="preview-paper mx-auto"
            data-testid="preview-paper"
          >
            <PreviewPage 
              order={order} 
              item={order.items[currentPage]} 
              pageNum={currentPage + 1}
              totalPages={totalPages}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPage({ order, item, pageNum, totalPages }) {
  const cbm = item.cbm_auto 
    ? ((item.height_cm || 0) * (item.depth_cm || 0) * (item.width_cm || 0) / 1000000).toFixed(2)
    : item.cbm;

  // Get the product image (from product_image field or images array)
  const productImage = item.product_image || (item.images?.length > 0 ? item.images[0] : null);

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '12px' }}>
      {/* Header: Logo LEFT, Info Table RIGHT */}
      <div className="flex justify-between items-start pb-4 border-b-2 border-[#3d2c1e]">
        {/* Logo - Left Side */}
        <div className="flex items-center gap-3">
          <div className="text-[#3d2c1e]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L8 6H5C3.89 6 3 6.89 3 8V20C3 21.11 3.89 22 5 22H19C20.11 22 21 21.11 21 20V8C21 6.89 20.11 6 19 6H16L12 2ZM12 4.83L14.17 7H9.83L12 4.83ZM12 10C14.21 10 16 11.79 16 14C16 16.21 14.21 18 12 18C9.79 18 8 16.21 8 14C8 11.79 9.79 10 12 10Z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3d2c1e] tracking-wide">JAIPUR</h1>
            <p className="text-xs text-[#666] italic">A fine wood furniture company</p>
          </div>
        </div>
        
        {/* Info Table - Right Side (with Factory Inform Date) */}
        <div className="border border-[#3d2c1e] text-[10px] sm:text-xs">
          <table>
            <tbody>
              <tr className="border-b border-[#3d2c1e]">
                <td className="px-2 sm:px-3 py-1 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">ENTRY DATE</td>
                <td className="px-2 sm:px-3 py-1 min-w-[120px]">{order.entry_date || '-'}</td>
              </tr>
              <tr className="border-b border-[#3d2c1e]">
                <td className="px-2 sm:px-3 py-1 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">FACTORY INFORM</td>
                <td className="px-2 sm:px-3 py-1">{order.factory_inform_date || order.entry_date || '-'}</td>
              </tr>
              <tr className="border-b border-[#3d2c1e]">
                <td className="px-2 sm:px-3 py-1 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">FACTORY</td>
                <td className="px-2 sm:px-3 py-1">{order.factory || '-'}</td>
              </tr>
              <tr className="border-b border-[#3d2c1e]">
                <td className="px-2 sm:px-3 py-1 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">SALES REF</td>
                <td className="px-2 sm:px-3 py-1 font-mono">{order.sales_order_ref || '-'}</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-3 py-1 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">BUYER PO</td>
                <td className="px-2 sm:px-3 py-1 font-mono">{order.buyer_po_ref || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Section: 75% Product Image + 25% Material Swatches */}
      <div className="flex gap-3 py-2">
        {/* Product Image - 75% width */}
        <div className="w-3/4">
          {productImage ? (
            <div className="border border-[#ddd] rounded p-2 bg-white flex items-center justify-center">
              <img 
                src={productImage} 
                alt={item.product_code}
                className="max-w-full max-h-[180px] object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-[150px] bg-[#f8f8f8] rounded flex items-center justify-center text-[#888] border border-[#ddd]">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-1 text-[#ccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">No Image Available</span>
              </div>
            </div>
          )}
          
          {/* Additional reference images if any */}
          {item.reference_images?.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {item.reference_images.slice(0, 4).map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`Reference ${idx + 1}`}
                  className="w-14 h-14 object-cover border border-[#ddd] rounded flex-shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        {/* Material Swatches - 25% width */}
        <div className="w-1/4 flex flex-col gap-1">
          {/* Leather/Fabric Swatch */}
          {(item.leather_code || item.leather_image) && (
            <div className="border border-[#ddd] rounded p-1.5 bg-[#fafafa]">
              {item.leather_image ? (
                <img 
                  src={item.leather_image} 
                  alt={item.leather_code || 'Leather'}
                  className="w-full h-14 object-cover rounded mb-1"
                />
              ) : (
                <div className="w-full h-14 bg-gradient-to-br from-[#8B4513] to-[#A0522D] rounded mb-1"></div>
              )}
              <div className="text-center">
                <p className="text-[8px] text-[#666] uppercase">Leather</p>
                <p className="text-[9px] font-semibold">{item.leather_code || '-'}</p>
              </div>
            </div>
          )}
          
          {/* Finish/Coating Swatch */}
          {(item.finish_code || item.finish_image) && (
            <div className="border border-[#ddd] rounded p-1.5 bg-[#fafafa]">
              {item.finish_image ? (
                <img 
                  src={item.finish_image} 
                  alt={item.finish_code || 'Finish'}
                  className="w-full h-14 object-cover rounded mb-1"
                />
              ) : (
                <div className="w-full h-14 bg-gradient-to-br from-[#D4A574] to-[#C4956A] rounded mb-1"></div>
              )}
              <div className="text-center">
                <p className="text-[8px] text-[#666] uppercase">Finish</p>
                <p className="text-[9px] font-semibold">{item.finish_code || '-'}</p>
              </div>
            </div>
          )}

          {/* Show placeholder if no materials */}
          {!item.leather_code && !item.leather_image && !item.finish_code && !item.finish_image && (
            <div className="border border-dashed border-[#ccc] rounded p-2 text-center text-[#888] text-[9px] h-full flex items-center justify-center">
              No material swatches
            </div>
          )}
        </div>
      </div>

      {/* Notes Section - 100% width */}
      <div className="w-full border border-[#3d2c1e] rounded mb-2">
        <div className="bg-[#3d2c1e] text-white px-2 py-1 font-semibold text-[10px]">
          Notes:
        </div>
        <div className="p-2 text-[10px] min-h-[40px]">
          {item.notes ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: item.notes }} 
            />
          ) : (
            <div className="text-[#888] space-y-0.5">
              {item.category && <p>• Category: {item.category}</p>}
              {item.leather_code && <p>• Leather: {item.leather_code}</p>}
              {item.finish_code && <p>• Finish: {item.finish_code}</p>}
              {item.color_notes && <p>• Color Notes: {item.color_notes}</p>}
              {item.wood_finish && <p>• Wood Finish: {item.wood_finish}</p>}
              {item.machine_hall && <p>• Workshop: {item.machine_hall}</p>}
              {!item.category && !item.leather_code && !item.finish_code && !item.color_notes && !item.wood_finish && !item.machine_hall && (
                <p className="italic">No notes added</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Details Table - Bottom */}
      <div className="border-2 border-[#3d2c1e] mt-auto overflow-x-auto">
        <table className="w-full text-[10px] sm:text-xs min-w-[500px]">
          <thead>
            <tr className="bg-[#3d2c1e] text-white">
              <th className="px-2 sm:px-3 py-2 text-left border-r border-[#5a4a3a]" rowSpan={2}>ITEM CODE</th>
              <th className="px-2 sm:px-3 py-2 text-left border-r border-[#5a4a3a]" rowSpan={2}>DESCRIPTION</th>
              <th className="px-2 sm:px-3 py-2 text-center border-r border-[#5a4a3a]" colSpan={3}>SIZE (cm)</th>
              <th className="px-2 sm:px-3 py-2 text-center border-r border-[#5a4a3a]" rowSpan={2}>CBM</th>
              <th className="px-2 sm:px-3 py-2 text-center" rowSpan={2}>Qty</th>
            </tr>
            <tr className="bg-[#5a4a3a] text-white">
              <th className="px-1 sm:px-2 py-1 text-center border-r border-[#6a5a4a]">H</th>
              <th className="px-1 sm:px-2 py-1 text-center border-r border-[#6a5a4a]">D</th>
              <th className="px-1 sm:px-2 py-1 text-center border-r border-[#6a5a4a]">W</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#3d2c1e]">
              <td className="px-2 sm:px-3 py-2 font-mono font-semibold border-r border-[#ddd]">{item.product_code || '-'}</td>
              <td className="px-2 sm:px-3 py-2 border-r border-[#ddd]">
                {item.description || '-'}
                {item.color_notes && <span className="text-[#666]"> ({item.color_notes})</span>}
              </td>
              <td className="px-2 sm:px-3 py-2 text-center border-r border-[#ddd]">{item.height_cm || 0}</td>
              <td className="px-2 sm:px-3 py-2 text-center border-r border-[#ddd]">{item.depth_cm || 0}</td>
              <td className="px-2 sm:px-3 py-2 text-center border-r border-[#ddd]">{item.width_cm || 0}</td>
              <td className="px-2 sm:px-3 py-2 text-center font-mono border-r border-[#ddd]">{cbm}</td>
              <td className="px-2 sm:px-3 py-2 text-center font-bold">{item.quantity || 1}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-[#ddd] flex justify-between items-center text-[10px] text-[#888]">
        <span>Buyer: {order.buyer_name || 'N/A'} • PO: {order.buyer_po_ref || 'N/A'}</span>
        <span>Page {pageNum} of {totalPages}</span>
      </div>
    </div>
  );
}
