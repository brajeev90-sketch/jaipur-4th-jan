import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  Package,
  FileSpreadsheet,
  LogOut,
  Key
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { toast } from 'sonner';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', null, {
        params: {
          current_password: currentPassword,
          new_password: newPassword
        }
      });
      toast.success('Password changed successfully!');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/orders', icon: FileText, label: t('orders') },
    { path: '/orders/new', icon: PlusCircle, label: t('newOrder') },
    { path: '/products', icon: Package, label: t('products') },
    { path: '/quotation', icon: FileSpreadsheet, label: t('quotation'), highlighted: true },
    { path: '/factories', icon: Building2, label: t('factoryUnit') },
    { path: '/leather-library', icon: Palette, label: t('leatherLibrary') },
    { path: '/finish-library', icon: Layers, label: t('finishLibrary') },
    { path: '/template-settings', icon: Settings, label: t('templateSettings') },
  ];

  // Company logo URL
  const logoUrl = "https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg";

  return (
    <div className="flex min-h-screen" data-testid="app-layout">
      {/* Mobile Header - hidden in print */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between print-hidden">
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

      {/* Sidebar - hidden in print */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 sidebar flex flex-col print-hidden
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
                `sidebar-link ${isActive ? 'active' : ''} ${item.highlighted ? 'bg-amber-100 border-l-4 border-amber-500 text-amber-800 font-semibold hover:bg-amber-200' : ''}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.highlighted && (
                <span className="ml-auto text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">NEW</span>
              )}
            </NavLink>
          ))}
        </nav>
        
        {/* Footer with Logout */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>👤 {user?.username || 'Admin'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPasswordDialogOpen(true)}
            className="w-full gap-2"
          >
            <Key size={16} />
            Change Password
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut size={16} />
            Logout
          </Button>
          <div className="text-xs text-muted-foreground text-center">
            {t('version')}
          </div>
        </div>
      </aside>
      
      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to update.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePassword} 
              disabled={changingPassword}
              className="bg-[#3d2c1e] hover:bg-[#5a4a3a]"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
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
