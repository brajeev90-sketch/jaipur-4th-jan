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
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const [orderRes, previewRes] = await Promise.all([
        ordersApi.getById(id),
        ordersApi.previewHtml(id),
      ]);
      setOrder(orderRes.data);
      setPreviewHtml(previewRes.data.html);
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

  const handleWhatsAppShare = () => {
    const pdfUrl = ordersApi.exportPdf(id);
    const message = `JAIPUR Production Sheet\nOrder: ${order?.sales_order_ref || 'N/A'}\nBuyer: ${order?.buyer_name || 'N/A'}\nItems: ${order?.items?.length || 0}\n\nDownload PDF: ${pdfUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
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
          Back to Order
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title" data-testid="preview-title">Production Sheet Preview</h1>
            <p className="page-description font-mono">{order?.sales_order_ref || 'Order'} • {order?.buyer_name || 'No Buyer'}</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
              onClick={handleWhatsAppShare}
              data-testid="whatsapp-share-btn"
            >
              <Share2 size={18} />
              WhatsApp
            </Button>
            <Button 
              className="gap-2"
              onClick={handleExportPdf}
              data-testid="export-pdf-btn"
            >
              <FileDown size={18} />
              Download PDF
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportPpt}
              data-testid="export-ppt-btn"
            >
              <Download size={18} />
              Download PPT
            </Button>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      {totalPages > 0 && (
        <div className="flex items-center justify-center gap-4 mb-6" data-testid="page-navigation">
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
      <div className="preview-container rounded-sm" data-testid="preview-container">
        {totalPages === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No items to preview</p>
            <Link to={`/orders/${id}/edit`}>
              <Button variant="outline">Add Items</Button>
            </Link>
          </div>
        ) : (
          <div 
            className="preview-paper"
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

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '12px' }}>
      {/* Header with logo and date table */}
      <div className="flex justify-between items-start pb-4 border-b-2 border-[#3d2c1e]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="text-[#3d2c1e]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L8 6H5C3.89 6 3 6.89 3 8V20C3 21.11 3.89 22 5 22H19C20.11 22 21 21.11 21 20V8C21 6.89 20.11 6 19 6H16L12 2ZM12 4.83L14.17 7H9.83L12 4.83ZM12 10C14.21 10 16 11.79 16 14C16 16.21 14.21 18 12 18C9.79 18 8 16.21 8 14C8 11.79 9.79 10 12 10Z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#3d2c1e] tracking-wide">JAIPUR</h1>
            <p className="text-xs text-[#666] italic">A fine wood furniture company</p>
          </div>
        </div>
        
        {/* Date Table */}
        <div className="border border-[#3d2c1e]">
          <table className="text-xs">
            <tbody>
              <tr className="border-b border-[#3d2c1e]">
                <td className="px-3 py-1.5 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">ENTRY DATE</td>
                <td className="px-3 py-1.5 min-w-[100px]">{order.entry_date || '-'}</td>
              </tr>
              <tr className="border-b border-[#3d2c1e]">
                <td className="px-3 py-1.5 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">INFORMED TO FACTORY</td>
                <td className="px-3 py-1.5">{order.factory || '-'}</td>
              </tr>
              <tr className="border-b border-[#3d2c1e]">
                <td className="px-3 py-1.5 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">TD RECEIVED</td>
                <td className="px-3 py-1.5">-</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 bg-[#f5f0eb] font-semibold border-r border-[#3d2c1e]">SAMPLE READY DATE</td>
                <td className="px-3 py-1.5 font-bold">ASAP</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Content Area: Image + Materials + Notes */}
      <div className="flex gap-4 py-4 flex-1">
        {/* Product Image */}
        <div className="w-1/3">
          {item.images?.length > 0 ? (
            <img 
              src={item.images[0]} 
              alt={item.product_code}
              className="w-full h-auto max-h-[280px] object-contain border border-[#ddd] rounded"
            />
          ) : (
            <div className="w-full h-[200px] bg-[#f0f0f0] rounded flex items-center justify-center text-[#888] border border-[#ddd]">
              No Image Available
            </div>
          )}
          
          {/* Additional images if any */}
          {item.images?.length > 1 && (
            <div className="flex gap-2 mt-2">
              {item.images.slice(1, 4).map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`${item.product_code}-${idx + 2}`}
                  className="w-16 h-16 object-cover border border-[#ddd] rounded"
                />
              ))}
            </div>
          )}
        </div>

        {/* Material Swatches */}
        <div className="w-1/3 space-y-3">
          {/* Leather/Fabric Swatch */}
          {(item.leather_code || item.leather_image) && (
            <div className="border border-[#ddd] rounded p-2 bg-[#fafafa]">
              {item.leather_image ? (
                <img 
                  src={item.leather_image} 
                  alt={item.leather_code || 'Leather'}
                  className="w-full h-20 object-cover rounded mb-2"
                />
              ) : (
                <div className="w-full h-20 bg-gradient-to-br from-[#8B4513] to-[#A0522D] rounded mb-2"></div>
              )}
              <div className="text-center">
                <p className="text-xs font-semibold">{item.leather_code || 'Leather'}</p>
              </div>
            </div>
          )}
          
          {/* Finish/Coating Swatch */}
          {(item.finish_code || item.finish_image) && (
            <div className="border border-[#ddd] rounded p-2 bg-[#fafafa]">
              {item.finish_image ? (
                <img 
                  src={item.finish_image} 
                  alt={item.finish_code || 'Finish'}
                  className="w-full h-20 object-cover rounded mb-2"
                />
              ) : (
                <div className="w-full h-20 bg-gradient-to-br from-[#D4A574] to-[#C4956A] rounded mb-2"></div>
              )}
              <div className="text-center">
                <p className="text-xs font-semibold">{item.finish_code || 'Finish'}</p>
              </div>
            </div>
          )}

          {/* Show placeholder if no materials */}
          {!item.leather_code && !item.leather_image && !item.finish_code && !item.finish_image && (
            <div className="border border-dashed border-[#ccc] rounded p-4 text-center text-[#888] text-xs">
              No material swatches
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="w-1/3 border border-[#3d2c1e] rounded">
          <div className="bg-[#3d2c1e] text-white px-3 py-1.5 font-semibold text-xs">
            Notes:
          </div>
          <div className="p-3 text-xs space-y-1">
            {item.notes ? (
              <div dangerouslySetInnerHTML={{ __html: item.notes.replace(/\n/g, '<br/>') }} />
            ) : (
              <ul className="list-disc pl-4 space-y-1">
                {item.category && <li>{item.category}</li>}
                {item.leather_code && <li>Leather: {item.leather_code}</li>}
                {item.finish_code && <li>Finish: {item.finish_code}</li>}
                {item.color_notes && <li>Color: {item.color_notes}</li>}
                {item.wood_finish && <li>Wood: {item.wood_finish}</li>}
                {item.machine_hall && <li>Workshop: {item.machine_hall}</li>}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Table */}
      <div className="border-2 border-[#3d2c1e] mt-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#3d2c1e] text-white">
              <th className="px-3 py-2 text-left border-r border-[#5a4a3a]" rowSpan={2}>ITEM CODE</th>
              <th className="px-3 py-2 text-left border-r border-[#5a4a3a]" rowSpan={2}>DESCRIPTION</th>
              <th className="px-3 py-2 text-center border-r border-[#5a4a3a]" colSpan={3}>SIZE (cm)</th>
              <th className="px-3 py-2 text-center border-r border-[#5a4a3a]" rowSpan={2}>CBM</th>
              <th className="px-3 py-2 text-center" rowSpan={2}>Qty</th>
            </tr>
            <tr className="bg-[#5a4a3a] text-white">
              <th className="px-2 py-1 text-center border-r border-[#6a5a4a]">H</th>
              <th className="px-2 py-1 text-center border-r border-[#6a5a4a]">D</th>
              <th className="px-2 py-1 text-center border-r border-[#6a5a4a]">W</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#3d2c1e]">
              <td className="px-3 py-2 font-mono font-semibold border-r border-[#ddd]">{item.product_code || '-'}</td>
              <td className="px-3 py-2 border-r border-[#ddd]">
                {item.description || '-'}
                {item.color_notes && <span className="text-[#666]"> ({item.color_notes})</span>}
              </td>
              <td className="px-3 py-2 text-center border-r border-[#ddd]">{item.height_cm || 0}</td>
              <td className="px-3 py-2 text-center border-r border-[#ddd]">{item.depth_cm || 0}</td>
              <td className="px-3 py-2 text-center border-r border-[#ddd]">{item.width_cm || 0}</td>
              <td className="px-3 py-2 text-center font-mono border-r border-[#ddd]">{cbm}</td>
              <td className="px-3 py-2 text-center font-bold">{item.quantity || 1}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-[#ddd] flex justify-between items-center text-xs text-[#888]">
        <span>Buyer: {order.buyer_name || 'N/A'} • PO: {order.buyer_po_ref || 'N/A'}</span>
        <span>Page {pageNum} of {totalPages}</span>
      </div>
    </div>
  );
}
