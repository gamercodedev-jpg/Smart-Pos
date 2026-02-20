export type BranchId = string;
export type LocationId = string;
export type StockItemId = string;
export type SupplierId = string;
export type RecipeId = string;
export type MenuItemId = string;

export type UnitOfMeasure = 'g' | 'kg' | 'ml' | 'l' | 'each';

export type StockItem = {
  id: StockItemId;
  name: string;
  uom: UnitOfMeasure;
};

export type Branch = {
  id: BranchId;
  name: string;
};

export type Location = {
  id: LocationId;
  branchId: BranchId;
  name: string;
};

export type Supplier = {
  id: SupplierId;
  name: string;
};

export type PurchaseLot = {
  id: string;
  branchId: BranchId;
  stockItemId: StockItemId;
  supplierId: SupplierId;
  receivedAt: string; // ISO
  qty: number; // in StockItem.uom
  unitCost: number; // currency/unit
};

export type RecipeComponent = {
  stockItemId: StockItemId;
  qty: number; // in StockItem.uom
};

export type Recipe = {
  id: RecipeId;
  menuItemId: MenuItemId;
  name: string;
  components: RecipeComponent[];
};

export type CostTiers = {
  lowest: number;
  highest: number;
  weightedAvg: number;
  latest: number;
};

export type SaleSimulation = {
  menuItemId: MenuItemId;
  qty: number;
  sellingPriceEach: number;
  cogsEach: number;
  gpEach: number;
  gpPercent: number;
  deductions: Array<{ stockItemId: StockItemId; qty: number }>;
  costBreakdown: Array<{ stockItemId: StockItemId; qty: number; unitCost: number; lineCost: number }>;
};

export type TransferLine = {
  stockItemId: StockItemId;
  qty: number;
};

export type TransferStatus = 'draft' | 'issued' | 'received';

export type StockTransfer = {
  id: string;
  fromLocationId: LocationId;
  toLocationId: LocationId;
  createdAt: string;
  status: TransferStatus;
  lines: TransferLine[];
  issuedAt?: string;
  receivedAt?: string;
};

export type GaapStateV1 = {
  version: 1;
  balances: Record<LocationId, Record<StockItemId, number>>;
  purchaseLots: PurchaseLot[];
  transfers: StockTransfer[];
};
