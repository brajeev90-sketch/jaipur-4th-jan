import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrdersList from "./pages/OrdersList";
import CreateOrder from "./pages/CreateOrder";
import OrderDetail from "./pages/OrderDetail";
import EditOrder from "./pages/EditOrder";
import OrderPreview from "./pages/OrderPreview";
import LeatherLibrary from "./pages/LeatherLibrary";
import FinishLibrary from "./pages/FinishLibrary";
import TemplateSettings from "./pages/TemplateSettings";
import FactoryManagement from "./pages/FactoryManagement";
import Products from "./pages/Products";
import Quotation from "./pages/Quotation";

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <div className="App" data-testid="app-root">
          <BrowserRouter>
            <Routes>
              {/* Public route - Login */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes - require authentication */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="orders/new" element={<CreateOrder />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="orders/:id/edit" element={<EditOrder />} />
                <Route path="orders/:id/preview" element={<OrderPreview />} />
                <Route path="products" element={<Products />} />
                <Route path="quotation" element={<Quotation />} />
                <Route path="factories" element={<FactoryManagement />} />
                <Route path="leather-library" element={<LeatherLibrary />} />
                <Route path="finish-library" element={<FinishLibrary />} />
                <Route path="template-settings" element={<TemplateSettings />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
