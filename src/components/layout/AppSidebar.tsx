import { useSyncExternalStore } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ClipboardCheck,
  ChefHat,
  Boxes,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Factory,
  MonitorSmartphone,
  Grid3X3,
  Calculator,
  UtensilsCrossed,
  Receipt,
  QrCode,
  Wand2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { getFeatureFlagsSnapshot, subscribeFeatureFlags } from '@/lib/featureFlagsStore';

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, permission: 'viewDashboard' as const },
];

const posItems = [
  { title: 'POS Terminal', url: '/pos/terminal', icon: MonitorSmartphone, permission: 'accessPOS' as const },
  { title: 'POS Menu', url: '/pos/menu', icon: Receipt, permission: 'manageSettings' as const },
  { title: 'Table QR Codes', url: '/pos/table-qr', icon: QrCode, permission: 'accessPOS' as const },
  { title: 'Tables', url: '/pos/tables', icon: Grid3X3, permission: 'accessPOS' as const },
  { title: 'Cash Up', url: '/pos/cash-up', icon: Calculator, permission: 'performCashUp' as const },
  { title: 'Kitchen Display', url: '/pos/kitchen', icon: UtensilsCrossed, permission: 'accessPOS' as const },
];

const inventoryItems = [
  { title: 'Stock Items', url: '/inventory/items', icon: Package, permission: 'viewInventory' as const },
  { title: 'Stock Issues', url: '/inventory/issues', icon: ArrowRightLeft, permission: 'createStockIssues' as const },
  { title: 'Stock Take', url: '/inventory/stock-take', icon: ClipboardCheck, permission: 'performStockTake' as const },
  { title: 'Mthunzi-Smart', url: '/inventory/gaap', icon: Calculator, permission: 'viewInventory' as const },
  { title: 'Transfers (QR)', url: '/inventory/transfers-qr', icon: QrCode, permission: 'viewInventory' as const },
];

const manufacturingItems = [
  { title: 'Recipes', url: '/manufacturing/recipes', icon: ChefHat, permission: 'viewRecipes' as const },
  { title: 'Batch Production', url: '/manufacturing/production', icon: Boxes, permission: 'recordBatchProduction' as const },
];

const operationsItems = [
  { title: 'Purchases (GRV)', url: '/purchases', icon: ShoppingCart, permission: 'viewPurchases' as const },
  { title: 'Staff', url: '/staff', icon: Users, permission: 'viewStaff' as const },
];

const reportItems = [
  { title: 'All Reports', url: '/reports', icon: BarChart3, permission: 'viewReports' as const },
];

const intelligenceItems = [
  // Owner-only for now (owner is the only role with `manageSettings`).
  { title: 'Intelligence', url: '/intelligence', icon: Wand2, permission: 'manageSettings' as const },
];

const toolsItems = [
  { title: 'Tax Engine', url: '/tax-demo', icon: Calculator, permission: 'viewReports' as const },
  { title: 'Audit Dashboard', url: '/audit-dashboard', icon: BarChart3, permission: 'viewReports' as const },
  { title: 'Security', url: '/security-demo', icon: MonitorSmartphone, permission: 'viewReports' as const },
  { title: 'Variance', url: '/variance-demo', icon: BarChart3, permission: 'viewReports' as const },
  { title: 'ZRA Invoice', url: '/zra-invoice-demo', icon: Receipt, permission: 'viewReports' as const },
  { title: 'Report Share', url: '/report-share-demo', icon: BarChart3, permission: 'viewReports' as const },
  { title: 'Receipts', url: '/receipt-demo', icon: Receipt, permission: 'viewReports' as const },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { hasPermission } = useAuth();
  const { settings } = useBranding();
  const flags = useSyncExternalStore(subscribeFeatureFlags, getFeatureFlagsSnapshot, getFeatureFlagsSnapshot);
  const intelligenceEnabled = Boolean(flags.flags.intelligenceWorkspace);
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  type NavItemType = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; permission: keyof import('@/types/auth').RolePermissions };

  const NavItem = ({ item }: { item: NavItemType }) => {
    if (!hasPermission(item.permission)) return null;
    
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink 
            to={item.url} 
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isActive(item.url) 
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const hasAnyPermission = (items: NavItemType[]) => {
    return items.some(item => hasPermission(item.permission));
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {settings.logoDataUrl ? (
            <img
              src={settings.logoDataUrl}
              alt={settings.appName}
              className="h-8 w-8 rounded-lg object-cover border border-sidebar-border bg-sidebar-primary"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Factory className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div>
              <h2 className="font-bold text-sidebar-foreground">{settings.appName}</h2>
              <p className="text-xs text-sidebar-foreground/60">{settings.tagline ?? 'Back Office + POS'}</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-4">
        {/* Main */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* POS */}
        {hasAnyPermission(posItems) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 px-3">Point of Sale</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {posItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Inventory */}
        {hasAnyPermission(inventoryItems) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 px-3">Inventory</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {inventoryItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Manufacturing */}
        {hasAnyPermission(manufacturingItems) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 px-3">Manufacturing</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {manufacturingItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Operations */}
        {hasAnyPermission(operationsItems) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 px-3">Operations</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {operationsItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Reports */}
        {hasAnyPermission(reportItems) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 px-3">Reports</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {reportItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Intelligence */}
        {intelligenceEnabled && hasAnyPermission(intelligenceItems) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 px-3">Intelligence</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {intelligenceItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tools */}
        {hasAnyPermission(toolsItems) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 px-3">Tools</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {toolsItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/settings')}>
              <NavLink 
                to="/settings" 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive('/settings') 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
