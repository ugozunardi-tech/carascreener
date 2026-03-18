import { useState, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import PortfolioSidebar from '../Portfolio/PortfolioSidebar';
import CreatePortfolioModal from '../Portfolio/CreatePortfolioModal';
import { usePortfolioList } from '../../hooks/usePortfolios';
import { NODES } from '../../data/connections';

export default function Layout() {
  const { portfolios, createPortfolio, deletePortfolio, updatePortfolio } = usePortfolioList();
  const [showCreate, setShowCreate] = useState(false);
  const location = useLocation();
  const isDetailPage = location.pathname.startsWith('/stock/');

  // Top 20 most important graph nodes for news monitoring
  const watchedSymbols = useMemo(() =>
    [...NODES]
      .filter(n => n.portfolio !== 'extended')
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20)
      .map(n => n.id),
    []
  );

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header watchedSymbols={watchedSymbols} />
      <div className="flex flex-1 overflow-hidden">
        {!isDetailPage && (
          <PortfolioSidebar
            portfolios={portfolios}
            onCreateClick={() => setShowCreate(true)}
            onDelete={deletePortfolio}
            onRename={(id, name, color) => updatePortfolio(id, { name, color })}
          />
        )}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      {showCreate && (
        <CreatePortfolioModal
          onClose={() => setShowCreate(false)}
          onCreate={createPortfolio}
        />
      )}
    </div>
  );
}
