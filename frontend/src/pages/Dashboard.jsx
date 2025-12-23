import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FileText, 
  Clock, 
  Factory, 
  CheckCircle,
  PlusCircle,
  ArrowRight
} from 'lucide-react';

const statusColors = {
  'Draft': 'bg-yellow-100 text-yellow-800',
  'Submitted': 'bg-blue-100 text-blue-800',
  'In Production': 'bg-purple-100 text-purple-800',
  'Done': 'bg-green-100 text-green-800',
};

export default function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    total_orders: 0,
    draft_orders: 0,
    in_production: 0,
    completed: 0,
    recent_orders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statsRes = await dashboardApi.getStats();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="page-title" data-testid="dashboard-title">{t('dashboardTitle')}</h1>
          <p className="page-description">{t('dashboardDesc')}</p>
        </div>
        <Link to="/orders/new">
          <Button className="gap-2 w-full sm:w-auto" data-testid="create-order-btn">
            <PlusCircle size={18} />
            {t('newOrder')}
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid mb-8" data-testid="stats-grid">
        <Card className="stat-card" data-testid="stat-total">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-sm bg-primary/10">
                <FileText className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalOrders')}</p>
                <p className="text-2xl font-semibold">{stats.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-draft">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-sm bg-yellow-100">
                <Clock className="text-yellow-700" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('drafts')}</p>
                <p className="text-2xl font-semibold">{stats.draft_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-production">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-sm bg-purple-100">
                <Factory className="text-purple-700" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('inProduction')}</p>
                <p className="text-2xl font-semibold">{stats.in_production}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-completed">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-sm bg-green-100">
                <CheckCircle className="text-green-700" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('completed')}</p>
                <p className="text-2xl font-semibold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card data-testid="recent-orders-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-xl">{t('recentOrders')}</CardTitle>
          <Link to="/orders">
            <Button variant="ghost" size="sm" className="gap-1">
              {t('viewAll')} <ArrowRight size={16} />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recent_orders.length === 0 ? (
            <div className="empty-state py-8" data-testid="empty-orders">
              <FileText className="empty-state-icon mx-auto" size={40} />
              <p className="text-muted-foreground">{t('noOrdersYet')}</p>
              <Link to="/orders/new">
                <Button variant="outline" className="mt-4">
                  {t('createFirstOrder')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3" data-testid="orders-list">
              {stats.recent_orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-sm border border-border hover:bg-muted/50 transition-colors"
                  data-testid={`order-item-${order.id}`}
                >
                  <div>
                    <p className="font-medium font-mono text-sm">
                      {order.sales_order_ref || 'No Ref'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.buyer_name || 'No Buyer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[order.status] || 'bg-gray-100'} text-xs`}>
                      {order.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {order.items?.length || 0} {t('items')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
