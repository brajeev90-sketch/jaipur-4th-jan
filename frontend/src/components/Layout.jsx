import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Palette, 
  Settings,
  Layers,
  Menu,
  X,
  Globe,
  Building2,
  Package
} from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/orders', icon: FileText, label: t('orders') },
    { path: '/orders/new', icon: PlusCircle, label: t('newOrder') },
    { path: '/products', icon: Package, label: t('products') },
    { path: '/factories', icon: Building2, label: t('factoryUnit') },
    { path: '/leather-library', icon: Palette, label: t('leatherLibrary') },
    { path: '/finish-library', icon: Layers, label: t('finishLibrary') },
    { path: '/template-settings', icon: Settings, label: t('templateSettings') },
  ];

  // Company logo URL
  const logoUrl = "https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg";

  return (
    <div className="flex min-h-screen" data-testid="app-layout">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu size={24} />
          </Button>
          <img 
            src={logoUrl} 
            alt="JAIPUR" 
            className="h-10 w-auto object-contain"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="gap-2"
          data-testid="mobile-lang-switch"
        >
          <Globe size={16} />
          {language === 'en' ? 'हिं' : 'EN'}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 sidebar flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex-1">
            <img 
              src={logoUrl} 
              alt="JAIPUR - A fine wood furniture company" 
              className="h-16 w-auto object-contain"
              data-testid="logo"
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        
        {/* Language Switcher - Desktop */}
        <div className="hidden lg:block px-4 py-3 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="w-full gap-2 justify-center"
            data-testid="desktop-lang-switch"
          >
            <Globe size={16} />
            {language === 'en' ? 'हिंदी में देखें' : 'View in English'}
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1" data-testid="nav-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          {t('version')}
        </div>
      </aside>
      
      {/* Main Content */}
      <main 
        className="flex-1 p-4 lg:p-8 overflow-auto pt-16 lg:pt-8" 
        data-testid="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
