import type { Branch, Location, StockItem, Supplier, Recipe, PurchaseLot } from '@/types/gaap';

export const branches: Branch[] = [
  { id: 'ndola', name: 'Ndola (Main)' },
  { id: 'kitwe', name: 'Kitwe (Branch)' },
  { id: 'lusaka', name: 'Lusaka (Branch)' },
];

export const locations: Location[] = [
  { id: 'ndola-main-store', branchId: 'ndola', name: 'Main Store' },
  { id: 'ndola-bar-store', branchId: 'ndola', name: 'Bar Store' },
  { id: 'kitwe-main-store', branchId: 'kitwe', name: 'Main Store' },
  { id: 'kitwe-bar-store', branchId: 'kitwe', name: 'Bar Store' },
  { id: 'lusaka-main-store', branchId: 'lusaka', name: 'Main Store' },
];

export const suppliers: Supplier[] = [
  { id: 'sup-beefA', name: 'Ndola Beef Co.' },
  { id: 'sup-beefB', name: 'Copperbelt Meats' },
  { id: 'sup-beefC', name: 'Premium Ranch ("expensive")' },
  { id: 'sup-bakery', name: 'City Bakery' },
  { id: 'sup-dairy', name: 'DairyBest' },
  { id: 'sup-grocer', name: 'Wholesale Grocer' },
];

export const stockItems: StockItem[] = [
  { id: 'beef-patty-150g', name: 'Beef Patty 150g', uom: 'each' },
  { id: 'cheese-slice', name: 'Cheese Slice', uom: 'each' },
  { id: 'burger-bun', name: 'Burger Bun', uom: 'each' },
  { id: 'sauce', name: 'Sauce', uom: 'g' },
  { id: 'pickles', name: 'Pickles', uom: 'each' },
  { id: 'pork', name: 'Pork (prep)', uom: 'g' },
  { id: 'chicken', name: 'Chicken (prep)', uom: 'g' },
  { id: 'fries', name: 'Fries (prep)', uom: 'g' },
  { id: 'sugar', name: 'Sugar', uom: 'kg' },
];

export const recipes: Recipe[] = [
  {
    id: 'rcp-double-cheese',
    menuItemId: 'menu-double-cheeseburger',
    name: 'Double Cheeseburger',
    components: [
      { stockItemId: 'beef-patty-150g', qty: 2 },
      { stockItemId: 'cheese-slice', qty: 2 },
      { stockItemId: 'burger-bun', qty: 1 },
      { stockItemId: 'sauce', qty: 10 },
      { stockItemId: 'pickles', qty: 3 },
    ],
  },
  {
    id: 'rcp-cheeseburger',
    menuItemId: 'menu-cheeseburger',
    name: 'Cheeseburger',
    components: [
      { stockItemId: 'beef-patty-150g', qty: 1 },
      { stockItemId: 'cheese-slice', qty: 1 },
      { stockItemId: 'burger-bun', qty: 1 },
      { stockItemId: 'sauce', qty: 8 },
      { stockItemId: 'pickles', qty: 2 },
    ],
  },
  {
    id: 'rcp-chicken-burger',
    menuItemId: 'menu-chicken-burger',
    name: 'Chicken Burger',
    components: [
      { stockItemId: 'chicken', qty: 180 },
      { stockItemId: 'burger-bun', qty: 1 },
      { stockItemId: 'sauce', qty: 10 },
      { stockItemId: 'pickles', qty: 2 },
    ],
  },
  {
    id: 'rcp-platter',
    menuItemId: 'menu-platter',
    name: 'Platter (Pork+Chicken+Fries)',
    components: [
      { stockItemId: 'pork', qty: 250 },
      { stockItemId: 'chicken', qty: 220 },
      { stockItemId: 'fries', qty: 300 },
      { stockItemId: 'sauce', qty: 15 },
    ],
  },
];

const isoDaysAgo = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

export const purchaseLots: PurchaseLot[] = [
  // Ndola beef (three suppliers)
  { id: 'lot-ndola-beefA-1', branchId: 'ndola', stockItemId: 'beef-patty-150g', supplierId: 'sup-beefA', receivedAt: isoDaysAgo(10), qty: 300, unitCost: 18.5 },
  { id: 'lot-ndola-beefB-1', branchId: 'ndola', stockItemId: 'beef-patty-150g', supplierId: 'sup-beefB', receivedAt: isoDaysAgo(6), qty: 200, unitCost: 19.75 },
  { id: 'lot-ndola-beefC-1', branchId: 'ndola', stockItemId: 'beef-patty-150g', supplierId: 'sup-beefC', receivedAt: isoDaysAgo(1), qty: 150, unitCost: 24.9 },

  // Kitwe beef
  { id: 'lot-kitwe-beefA-1', branchId: 'kitwe', stockItemId: 'beef-patty-150g', supplierId: 'sup-beefA', receivedAt: isoDaysAgo(8), qty: 180, unitCost: 19.1 },
  { id: 'lot-kitwe-beefB-1', branchId: 'kitwe', stockItemId: 'beef-patty-150g', supplierId: 'sup-beefB', receivedAt: isoDaysAgo(2), qty: 220, unitCost: 20.4 },

  // Lusaka beef
  { id: 'lot-lusaka-beefB-1', branchId: 'lusaka', stockItemId: 'beef-patty-150g', supplierId: 'sup-beefB', receivedAt: isoDaysAgo(4), qty: 260, unitCost: 21.3 },

  // Common ingredients
  { id: 'lot-buns-1', branchId: 'ndola', stockItemId: 'burger-bun', supplierId: 'sup-bakery', receivedAt: isoDaysAgo(2), qty: 400, unitCost: 3.2 },
  { id: 'lot-cheese-1', branchId: 'ndola', stockItemId: 'cheese-slice', supplierId: 'sup-dairy', receivedAt: isoDaysAgo(5), qty: 500, unitCost: 2.1 },
  { id: 'lot-pickles-1', branchId: 'ndola', stockItemId: 'pickles', supplierId: 'sup-grocer', receivedAt: isoDaysAgo(7), qty: 600, unitCost: 0.35 },
  { id: 'lot-sauce-1', branchId: 'ndola', stockItemId: 'sauce', supplierId: 'sup-grocer', receivedAt: isoDaysAgo(3), qty: 5000, unitCost: 0.012 },

  // Sugar for transfer demo
  { id: 'lot-sugar-1', branchId: 'ndola', stockItemId: 'sugar', supplierId: 'sup-grocer', receivedAt: isoDaysAgo(5), qty: 100, unitCost: 28.0 },

  // Platter components (grams)
  { id: 'lot-pork-1', branchId: 'ndola', stockItemId: 'pork', supplierId: 'sup-grocer', receivedAt: isoDaysAgo(2), qty: 250000, unitCost: 0.055 },
  { id: 'lot-chicken-1', branchId: 'ndola', stockItemId: 'chicken', supplierId: 'sup-grocer', receivedAt: isoDaysAgo(2), qty: 220000, unitCost: 0.048 },
  { id: 'lot-fries-1', branchId: 'ndola', stockItemId: 'fries', supplierId: 'sup-grocer', receivedAt: isoDaysAgo(2), qty: 180000, unitCost: 0.018 },
];

export const initialBalances: Record<string, Record<string, number>> = {
  'ndola-main-store': {
    'beef-patty-150g': 420,
    'cheese-slice': 350,
    'burger-bun': 300,
    sauce: 2600,
    pickles: 480,
    pork: 120000,
    chicken: 90000,
    fries: 80000,
    sugar: 60,
  },
  'ndola-bar-store': {
    sugar: 8,
  },
  'kitwe-main-store': {
    'beef-patty-150g': 120,
  },
  'kitwe-bar-store': {
    sugar: 6,
  },
  'lusaka-main-store': {
    'beef-patty-150g': 160,
  },
};

export const demoMenu = [
  { id: 'menu-double-cheeseburger', name: 'Double Cheeseburger', sellingPrice: 120 },
  { id: 'menu-cheeseburger', name: 'Cheeseburger', sellingPrice: 95 },
  { id: 'menu-chicken-burger', name: 'Chicken Burger', sellingPrice: 85 },
  { id: 'menu-platter', name: 'Platter (Pork+Chicken+Fries)', sellingPrice: 160 },
  { id: 'menu-burger-fries', name: 'Burger + Fries Combo', sellingPrice: 140 },
  { id: 'menu-t-bone-chips', name: 'T-Bone & Chips', sellingPrice: 175 },
  { id: 'menu-fish-chips', name: 'Fish & Chips', sellingPrice: 95 },
  { id: 'menu-nshima-chicken', name: 'Nshima + Chicken', sellingPrice: 120 },
  { id: 'menu-nshima-beef', name: 'Nshima + Beef Stew', sellingPrice: 110 },
  { id: 'menu-chips', name: 'Chips', sellingPrice: 35 },
  { id: 'menu-coleslaw', name: 'Coleslaw', sellingPrice: 25 },
  { id: 'menu-coke-500', name: 'Coke 500ml', sellingPrice: 15 },
  { id: 'menu-fanta-500', name: 'Fanta Orange 500ml', sellingPrice: 15 },
  { id: 'menu-water-500', name: 'Still Water 500ml', sellingPrice: 8 },
  { id: 'menu-cappuccino', name: 'Cappuccino', sellingPrice: 60 },
  { id: 'menu-tea', name: 'Tea', sellingPrice: 25 },
  { id: 'menu-cake-slice', name: 'Cake Slice', sellingPrice: 45 },
  { id: 'menu-doughnut', name: 'Doughnut', sellingPrice: 15 },
] as const;
