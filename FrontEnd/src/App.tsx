import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ShiftManagementPage from './pages/ShiftManagementPage';
import ShiftOperationsPage from './pages/ShiftOperationsPage.tsx';
import StoresPage from './pages/StoresPage';
import UsersPage from './pages/UsersPage';
import ProductsPage from './pages/ProductsPage';
import PricesPage from './pages/PricesPage';
import TanksPage from './pages/TanksPage';
import PumpsPage from './pages/PumpsPage';
import StoreDetailPage from './pages/StoreDetailPage';
import CustomersPage from './pages/CustomersPage';
import CustomerCreditPage from './pages/CustomerCreditPage';
import DebtReportPage from './pages/DebtReportPage';
import SalesReportPage from './pages/SalesReportPage';
import CashReportPage from './pages/CashReportPage';
import InventoryImportPage from './pages/InventoryImportPage';
import InventoryReportPage from './pages/InventoryReportPage';
import InitialStock from './pages/InitialStock';
import StockReport from './pages/StockReport';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/import"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InventoryImportPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/initial-stock"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InitialStock />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/stock-report"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <StockReport />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/report"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InventoryReportPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shifts"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ShiftManagementPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shifts/:shiftId/operations"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ShiftOperationsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stores"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <StoresPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stores/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <StoreDetailPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UsersPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProductsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/prices"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PricesPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tanks"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TanksPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pumps"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PumpsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CustomersPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/credit"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CustomerCreditPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/debt"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DebtReportPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/sales"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SalesReportPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/cash"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CashReportPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default App;
