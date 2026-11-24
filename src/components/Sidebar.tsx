import React from 'react';
import {
  Activity,
  ArrowLeftRight,
  Bookmark,
  Briefcase,
  CandlestickChart,
  ChevronLeft,
  ChevronRight,
  Compass,
  Gauge,
  Globe,
  History,
  Layers,
  LayoutDashboard,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { NavPage } from '../types/navigation';

interface SidebarProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: NavPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'markets', label: 'Markets', icon: Globe },
  { id: 'explorer', label: 'Stocks', icon: Compass },
  { id: 'analysis', label: 'Stock Analysis', icon: CandlestickChart },
  { id: 'indicators', label: 'Technical Indicators', icon: Gauge },
  { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
  { id: 'trade', label: 'Paper Trading', icon: ArrowLeftRight },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'holdings', label: 'Holdings', icon: Layers },
  { id: 'history', label: 'Trade History', icon: History },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function BrandLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="7"
          className="fill-slate-900 stroke-slate-300 dark:fill-[#162033] dark:stroke-[#263247]"
          strokeWidth="1.5"
        />
        <path
          d="M8 21L13.5 15.5L17.5 18.5L24 10"
          stroke="#16C784"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 10H24V14"
          stroke="#16C784"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!collapsed && (
        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
          StockSense
        </span>
      )}
    </div>
  );
}

export function Sidebar({
  activePage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (page: NavPage) => {
    onSelectPage(page);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden"
        />
      )}

      <aside
        aria-label="Primary sidebar navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-[#263247] dark:bg-[#111827] lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-16' : 'w-56'}`}
      >
        <div
          className={`flex h-14 items-center border-b border-slate-200 px-3.5 dark:border-[#263247] ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16C784]"
            title="StockSense Dashboard"
          >
            <BrandLogo collapsed={collapsed} />
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#162033] dark:hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16C784] ${
                  collapsed ? 'justify-center' : 'gap-2.5'
                } ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-[#162033] dark:text-white dark:ring-1 dark:ring-[#263247]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#162033]/60 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? 'text-[#16C784]'
                      : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden border-t border-slate-200 p-2.5 dark:border-[#263247] lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full items-center rounded-lg px-2.5 py-2 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#162033] dark:hover:text-white ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!collapsed && <span>Collapse</span>}
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

// Keep unused Activity import check clean if needed
void Activity;
