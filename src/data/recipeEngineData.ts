import type { RecipeMapV1 } from '@/lib/recipeEngine';

// Links POS MenuItem.id -> inventory deduction recipe (GAAP-style)
// Qty units must match the stock item's UOM in gaapMockData.
export const recipeMap: RecipeMapV1 = {
  // Double Cheeseburger (uses the Advanced GAAP mock stock items)
  'menu-double-cheeseburger': {
    menuItemId: 'menu-double-cheeseburger',
    components: [
      { stockItemId: 'beef-patty-150g', qty: 2 },
      { stockItemId: 'cheese-slice', qty: 2 },
      { stockItemId: 'burger-bun', qty: 1 },
      { stockItemId: 'sauce', qty: 10 },
      { stockItemId: 'pickles', qty: 3 },
    ],
  },

  // Platter example (Prompt 1)
  // 500g Pork, 300g Chicken, 200g Fries
  'menu-platter': {
    menuItemId: 'menu-platter',
    components: [
      { stockItemId: 'pork', qty: 500 },
      { stockItemId: 'chicken', qty: 300 },
      { stockItemId: 'fries', qty: 200 },
    ],
  },
};
