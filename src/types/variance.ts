// src/types/variance.ts

export interface Ingredient {
  id: string;
  name: string;
  unit: 'kg' | 'liters' | 'each';
  costPerUnit: number;
}

export interface RecipeComponent {
  ingredientId: string;
  quantity: number; // in base unit of the ingredient
}

export interface MenuItem {
  id: string;
  name: string;
  recipe: RecipeComponent[];
}

export interface Sale {
  menuItemId: string;
  quantitySold: number;
}

export interface TheoreticalUsage {
  [ingredientId: string]: number; // total quantity used
}

export interface ActualUsage {
  [ingredientId: string]: number; // total quantity used
}

export interface Variance {
  ingredientId: string;
  ingredientName: string;
  theoretical: number;
  actual: number;
  variance: number;
  financialLoss: number; // The "K-Value"
  unit: string;
}

export type LossLeaderReport = Variance[];
