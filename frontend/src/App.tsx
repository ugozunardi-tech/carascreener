import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import PortfolioDashboard from './pages/PortfolioDashboard';
import NetworkGraph from './pages/NetworkGraph';
import Layout from './components/Layout/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="portfolio/:id" element={<PortfolioDashboard />} />
          <Route path="network" element={<NetworkGraph />} />
          <Route path="stock/:symbol" element={<StockDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
