import { Table, Order, POSCategory, POSMenuItem, TableSection, CashUpSession, Shift } from '@/types/pos';

// Table Sections
export const tableSections: TableSection[] = [
  {
    id: 'main',
    name: 'Main Floor',
    tables: [
      { id: 't1', number: 1, seats: 4, status: 'available' },
      { id: 't2', number: 2, seats: 4, status: 'occupied', currentOrderId: 'ord-001' },
      { id: 't3', number: 3, seats: 6, status: 'available' },
      { id: 't4', number: 4, seats: 2, status: 'dirty' },
      { id: 't5', number: 5, seats: 4, status: 'available' },
      { id: 't6', number: 6, seats: 8, status: 'reserved' },
    ],
  },
  {
    id: 'patio',
    name: 'Patio',
    tables: [
      { id: 't7', number: 7, seats: 4, status: 'available' },
      { id: 't8', number: 8, seats: 4, status: 'occupied', currentOrderId: 'ord-002' },
      { id: 't9', number: 9, seats: 6, status: 'available' },
      { id: 't10', number: 10, seats: 4, status: 'available' },
    ],
  },
  {
    id: 'bar',
    name: 'Bar Area',
    tables: [
      { id: 't11', number: 11, seats: 2, status: 'available' },
      { id: 't12', number: 12, seats: 2, status: 'occupied', currentOrderId: 'ord-003' },
    ],
  },
];

// All tables flat
export const tables: Table[] = tableSections.flatMap(s => s.tables);

// POS Categories
export const posCategories: POSCategory[] = [
  { id: 'breads', name: 'Breads', color: 'bg-amber-500', sortOrder: 1 },
  { id: 'pies', name: 'Pies & Pastry', color: 'bg-orange-500', sortOrder: 2 },
  { id: 'grills', name: 'Burgers & Grills', color: 'bg-red-500', sortOrder: 3 },
  { id: 'nshima', name: 'Nshima & Rice', color: 'bg-yellow-600', sortOrder: 4 },
  { id: 'sides', name: 'Sides', color: 'bg-green-500', sortOrder: 5 },
  { id: 'beverages', name: 'Beverages', color: 'bg-blue-500', sortOrder: 6 },
  { id: 'desserts', name: 'Desserts', color: 'bg-pink-500', sortOrder: 7 },
  { id: 'coffee', name: 'Hot Drinks', color: 'bg-amber-700', sortOrder: 8 },
];

// POS Menu Items
export const posMenuItems: POSMenuItem[] = [
  // Breads
  { id: 'pm1', code: '57', name: 'Budget Bread', categoryId: 'breads', price: 23, cost: 11.41, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm2', code: '1002', name: 'Bravo Premium Bread', categoryId: 'breads', price: 25, cost: 11.72, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm3', code: '1003', name: 'Brown Bread', categoryId: 'breads', price: 28, cost: 13.50, image: '/menu/placeholder-burger.svg', isAvailable: true },
  
  // Pies & Pastry
  { id: 'pm4', code: '55', name: 'Beef Samoosa', categoryId: 'pies', price: 18, cost: 9.21, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm5', code: '118', name: 'Beef Pie', categoryId: 'pies', price: 40, cost: 18.40, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm6', code: '119', name: 'Chicken Pie', categoryId: 'pies', price: 40, cost: 17.80, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm7', code: '120', name: 'Veggie Pie', categoryId: 'pies', price: 35, cost: 14.20, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm8', code: '121', name: 'Sausage Roll', categoryId: 'pies', price: 25, cost: 10.50, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  
  // Burgers & Grills
  { id: 'pm9', code: '52', name: 'T-Bone & Chips', categoryId: 'grills', price: 175, cost: 86.24, image: '/menu/placeholder-burger.svg', modifierGroups: ['cook-level', 'sides-choice', 'extras'], isAvailable: true },
  { id: 'pm10', code: '53', name: 'Beef Burger', categoryId: 'grills', price: 85, cost: 35.60, image: '/menu/placeholder-burger.svg', modifierGroups: ['cook-level', 'extras'], isAvailable: true },
  { id: 'pm11', code: '54', name: 'Chicken Burger', categoryId: 'grills', price: 75, cost: 30.20, image: '/menu/placeholder-burger.svg', modifierGroups: ['extras'], isAvailable: true },
  { id: 'menu-platter', code: 'PLT1', name: 'Platter (Pork+Chicken+Fries)', categoryId: 'grills', price: 160, cost: 70.00, image: '/menu/placeholder-burger.svg', modifierGroups: ['sides-choice', 'extras'], isAvailable: true },
  { id: 'pm12', code: '56', name: 'Grilled Chicken', categoryId: 'grills', price: 120, cost: 52.40, image: '/menu/placeholder-burger.svg', modifierGroups: ['extras'], isAvailable: true },
  { id: 'pm13', code: '58', name: 'Fish & Chips', categoryId: 'grills', price: 95, cost: 42.30, image: '/menu/placeholder-burger.svg', modifierGroups: ['sides-choice', 'extras'], isAvailable: true },
  
  // Nshima & Rice
  { id: 'pm14', code: '109', name: 'Nshima + T-bone', categoryId: 'nshima', price: 180, cost: 94.44, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm15', code: '110', name: 'Nshima + Chicken', categoryId: 'nshima', price: 120, cost: 58.20, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm16', code: '111', name: 'Nshima + Fish', categoryId: 'nshima', price: 100, cost: 45.80, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm17', code: '112', name: 'Rice + Beef Stew', categoryId: 'nshima', price: 95, cost: 42.50, image: '/menu/placeholder-burger.svg', isAvailable: true },
  
  // Sides
  { id: 'pm18', code: '200', name: 'Chips', categoryId: 'sides', price: 35, cost: 12.40, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm19', code: '201', name: 'Coleslaw', categoryId: 'sides', price: 25, cost: 8.50, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm20', code: '202', name: 'Side Salad', categoryId: 'sides', price: 30, cost: 10.20, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm21', code: '203', name: 'Vegetables', categoryId: 'sides', price: 25, cost: 9.80, image: '/menu/placeholder-burger.svg', isAvailable: true },
  
  // Beverages
  { id: 'pm22', code: '1206', name: 'Coke 500ml', categoryId: 'beverages', price: 15, cost: 8.98, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  { id: 'pm23', code: '1209', name: 'Fanta Orange 500ml', categoryId: 'beverages', price: 15, cost: 8.98, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  { id: 'pm24', code: '286', name: 'Fresh Up 500ml', categoryId: 'beverages', price: 12, cost: 6.47, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  { id: 'pm25', code: '189', name: 'Vatra 750ml', categoryId: 'beverages', price: 10, cost: 4.10, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  { id: 'pm26', code: '300', name: 'Still Water 500ml', categoryId: 'beverages', price: 8, cost: 3.20, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  
  // Hot Drinks
  { id: 'pm27', code: '603', name: 'Cappuccino', categoryId: 'coffee', price: 60, cost: 26.59, image: '/menu/placeholder-drink.svg', isAvailable: true },
  { id: 'pm28', code: '604', name: 'Americano', categoryId: 'coffee', price: 45, cost: 18.50, image: '/menu/placeholder-drink.svg', isAvailable: true },
  { id: 'pm29', code: '605', name: 'Latte', categoryId: 'coffee', price: 55, cost: 24.20, image: '/menu/placeholder-drink.svg', isAvailable: true },
  { id: 'pm30', code: '606', name: 'Tea', categoryId: 'coffee', price: 25, cost: 8.40, image: '/menu/placeholder-drink.svg', isAvailable: true },
  
  // Desserts
  { id: 'pm31', code: '700', name: 'Soft Serve', categoryId: 'desserts', price: 25, cost: 8.20, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm32', code: '701', name: 'Cake Slice', categoryId: 'desserts', price: 45, cost: 18.50, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm33', code: '702', name: 'Doughnut', categoryId: 'desserts', price: 15, cost: 5.80, image: '/menu/placeholder-dessert.svg', isAvailable: true },

  // More Breads
  { id: 'pm34', code: '1004', name: 'Garlic Bread', categoryId: 'breads', price: 30, cost: 14.00, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm35', code: '1005', name: 'Toasted Sandwich', categoryId: 'breads', price: 45, cost: 21.00, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm36', code: '1006', name: 'French Toast', categoryId: 'breads', price: 55, cost: 26.00, image: '/menu/placeholder-burger.svg', isAvailable: true },

  // More Pies & Pastry
  { id: 'pm37', code: '122', name: 'Chicken Samoosa', categoryId: 'pies', price: 18, cost: 9.00, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm38', code: '123', name: 'Steak Pie', categoryId: 'pies', price: 45, cost: 20.50, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm39', code: '124', name: 'Vegetable Samosa', categoryId: 'pies', price: 16, cost: 7.80, image: '/menu/placeholder-dessert.svg', isAvailable: true },

  // More Burgers & Grills
  { id: 'pm40', code: '59', name: 'Double Cheeseburger', categoryId: 'grills', price: 120, cost: 58.37, image: '/menu/placeholder-burger.svg', modifierGroups: ['cook-level', 'extras'], isAvailable: true, trackInventory: false },
  { id: 'pm41', code: '60', name: 'BBQ Chicken Wings (6pc)', categoryId: 'grills', price: 95, cost: 44.00, image: '/menu/placeholder-burger.svg', modifierGroups: ['extras'], isAvailable: true },
  { id: 'pm42', code: '61', name: 'Pork Ribs (Half)', categoryId: 'grills', price: 160, cost: 78.00, image: '/menu/placeholder-burger.svg', modifierGroups: ['sides-choice', 'extras'], isAvailable: true },
  { id: 'pm43', code: '62', name: 'Beef Sausage & Chips', categoryId: 'grills', price: 75, cost: 33.00, image: '/menu/placeholder-burger.svg', modifierGroups: ['sides-choice', 'extras'], isAvailable: true },

  // More Nshima & Rice
  { id: 'pm44', code: '113', name: 'Nshima + Beef Stew', categoryId: 'nshima', price: 110, cost: 52.00, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm45', code: '114', name: 'Rice + Chicken Stew', categoryId: 'nshima', price: 105, cost: 49.00, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm46', code: '115', name: 'Rice + Veg Stew', categoryId: 'nshima', price: 75, cost: 32.00, image: '/menu/placeholder-burger.svg', isAvailable: true },

  // More Sides
  { id: 'pm47', code: '204', name: 'Onion Rings', categoryId: 'sides', price: 40, cost: 16.50, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm48', code: '205', name: 'Mashed Potatoes', categoryId: 'sides', price: 35, cost: 14.50, image: '/menu/placeholder-burger.svg', isAvailable: true },
  { id: 'pm49', code: '206', name: 'Rice Portion', categoryId: 'sides', price: 20, cost: 7.50, image: '/menu/placeholder-burger.svg', isAvailable: true },

  // More Beverages
  { id: 'pm50', code: '1210', name: 'Sprite 500ml', categoryId: 'beverages', price: 15, cost: 8.98, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  { id: 'pm51', code: '1211', name: 'Pepsi 500ml', categoryId: 'beverages', price: 15, cost: 8.98, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  { id: 'pm52', code: '310', name: 'Iced Tea 500ml', categoryId: 'beverages', price: 18, cost: 9.50, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },
  { id: 'pm53', code: '311', name: 'Mango Juice 500ml', categoryId: 'beverages', price: 20, cost: 10.20, image: '/menu/placeholder-drink.svg', modifierGroups: ['drink-ice'], isAvailable: true },

  // More Hot Drinks
  { id: 'pm54', code: '607', name: 'Hot Chocolate', categoryId: 'coffee', price: 55, cost: 23.00, image: '/menu/placeholder-drink.svg', isAvailable: true },
  { id: 'pm55', code: '608', name: 'Espresso', categoryId: 'coffee', price: 35, cost: 14.00, image: '/menu/placeholder-drink.svg', isAvailable: true },

  // More Desserts
  { id: 'pm56', code: '703', name: 'Brownie', categoryId: 'desserts', price: 35, cost: 14.00, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm57', code: '704', name: 'Fruit Salad', categoryId: 'desserts', price: 30, cost: 12.00, image: '/menu/placeholder-dessert.svg', isAvailable: true },
  { id: 'pm58', code: '705', name: 'Ice Cream Scoop', categoryId: 'desserts', price: 20, cost: 7.00, image: '/menu/placeholder-dessert.svg', isAvailable: true },
];

// Sample Open Orders
export const openOrders: Order[] = [
  {
    id: 'ord-001',
    orderNo: 1554,
    tableId: 't2',
    tableNo: 2,
    orderType: 'eat_in',
    status: 'sent',
    staffId: '3',
    staffName: 'jannifer c',
    items: [
      { id: 'oi1', menuItemId: 'pm9', menuItemCode: '52', menuItemName: 'T-Bone & Chips', quantity: 2, unitPrice: 175, unitCost: 86.24, total: 350, isVoided: false, sentToKitchen: true },
      { id: 'oi2', menuItemId: 'pm22', menuItemCode: '1206', menuItemName: 'Coke 500ml', quantity: 2, unitPrice: 15, unitCost: 8.98, total: 30, isVoided: false, sentToKitchen: true },
    ],
    subtotal: 380,
    discountAmount: 0,
    discountPercent: 0,
    tax: 49.66,
    total: 380,
    totalCost: 190.44,
    grossProfit: 189.56,
    gpPercent: 49.88,
    createdAt: '2025-01-27T12:30:00',
    sentAt: '2025-01-27T12:32:00',
  },
  {
    id: 'ord-002',
    orderNo: 1555,
    tableId: 't8',
    tableNo: 8,
    orderType: 'eat_in',
    status: 'open',
    staffId: '4',
    staffName: 'charles-driv',
    items: [
      { id: 'oi3', menuItemId: 'pm14', menuItemCode: '109', menuItemName: 'Nshima + T-bone', quantity: 1, unitPrice: 180, unitCost: 94.44, total: 180, isVoided: false, sentToKitchen: false },
    ],
    subtotal: 180,
    discountAmount: 0,
    discountPercent: 0,
    tax: 23.52,
    total: 180,
    totalCost: 94.44,
    grossProfit: 85.56,
    gpPercent: 47.53,
    createdAt: '2025-01-27T13:15:00',
  },
  {
    id: 'ord-003',
    orderNo: 1556,
    tableId: 't12',
    tableNo: 12,
    orderType: 'eat_in',
    status: 'served',
    staffId: '3',
    staffName: 'jannifer c',
    items: [
      { id: 'oi4', menuItemId: 'pm27', menuItemCode: '603', menuItemName: 'Cappuccino', quantity: 2, unitPrice: 60, unitCost: 26.59, total: 120, isVoided: false, sentToKitchen: true },
      { id: 'oi5', menuItemId: 'pm32', menuItemCode: '701', menuItemName: 'Cake Slice', quantity: 2, unitPrice: 45, unitCost: 18.50, total: 90, isVoided: false, sentToKitchen: true },
    ],
    subtotal: 210,
    discountAmount: 0,
    discountPercent: 0,
    tax: 27.44,
    total: 210,
    totalCost: 90.18,
    grossProfit: 119.82,
    gpPercent: 57.06,
    createdAt: '2025-01-27T14:00:00',
    sentAt: '2025-01-27T14:02:00',
  },
];

// Current Shift (Demo)
export const currentShift: Shift = {
  id: 'shift-001',
  staffId: '3',
  staffName: 'jannifer c',
  startTime: '2025-01-27T08:00:00',
  startingCash: 500,
  isActive: true,
  drnFrom: 1554,
};

// Sample Cash Up Sessions
export const cashUpSessions: CashUpSession[] = [
  {
    id: 'cu-001',
    shiftId: 'shift-prev',
    staffId: '3',
    staffName: 'jannifer c',
    date: '2025-01-26',
    drnFrom: 1540,
    drnTo: 1553,
    totalSales: 11415,
    cashSales: 9200,
    cardSales: 1815,
    chequeSales: 0,
    accountSales: 400,
    nonBankSales: 0,
    openingCash: 500,
    cashReceived: 9200,
    payouts: 1200,
    tips: 350,
    expectedCash: 8500, // 500 + 9200 - 1200
    actualCash: 8480,
    shortageOverage: -20,
    bankableCash: 8130, // 8480 - 350
    status: 'approved',
    approvedBy: 'John K Mumba',
  },
];
