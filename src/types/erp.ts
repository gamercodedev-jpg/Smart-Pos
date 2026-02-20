// src/types/erp.ts
// TypeScript interfaces corresponding to the erp schema

// A generic user type for creator/updater fields.
// Replace with your actual user type from Supabase auth.
export interface ErpUser {
  id: string; // uuid
  email?: string;
  fullName?: string;
}

// ------------------------------
// Enums from SQL
// ------------------------------

export const UomDimension = {
  MASS: 'mass',
  VOLUME: 'volume',
  COUNT: 'count',
} as const;
export type UomDimension = (typeof UomDimension)[keyof typeof UomDimension];

export const LocationType = {
  STORE: 'store',
  KITCHEN: 'kitchen',
  BAR: 'bar',
  WAREHOUSE: 'warehouse',
  OTHER: 'other',
} as const;
export type LocationType = (typeof LocationType)[keyof typeof LocationType];

export const ItemType = {
  INGREDIENT: 'ingredient',
  MENU_ITEM: 'menu_item',
  INTERMEDIATE: 'intermediate',
  RETAIL: 'retail',
  ASSET: 'asset',
  SERVICE: 'service',
} as const;
export type ItemType = (typeof ItemType)[keyof typeof ItemType];

export const TransferStatus = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  RECEIVED: 'received',
  VOIDED: 'voided',
} as const;
export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

export const JournalType = {
  PURCHASE_RECEIPT: 'purchase_receipt',
  SALE: 'sale',
  RECIPE_CONSUMPTION: 'recipe_consumption',
  PRODUCTION: 'production',
  TRANSFER_ISSUE: 'transfer_issue',
  TRANSFER_RECEIVE: 'transfer_receive',
  ADJUSTMENT: 'adjustment',
  WASTE: 'waste',
  STOCK_COUNT: 'stock_count',
} as const;
export type JournalType = (typeof JournalType)[keyof typeof JournalType];

// ------------------------------
// Base & Audit
// ------------------------------

export interface BaseEntity {
  id: string; // uuid
  createdAt: string; // timestamptz
  createdBy: string; // uuid
}

// ------------------------------
// Organization + Locations
// ------------------------------

export interface Organization extends BaseEntity {
  name: string;
  isActive: boolean;
}

export interface Location extends BaseEntity {
  organizationId: string; // uuid
  code: string;
  name: string;
  locationType: LocationType;
  isActive: boolean;
}

// ------------------------------
// Units of Measure
// ------------------------------

export interface Uom extends BaseEntity {
  code: string;
  name: string;
  dimension: UomDimension;
  isDimensionBase: boolean;
  toDimensionBaseMultiplier: number; // numeric(18,6)
}

// ------------------------------
// Items (SKUs)
// ------------------------------

export interface Item extends BaseEntity {
  organizationId: string; // uuid
  sku: string | null;
  name: string;
  itemType: ItemType;
  baseUomId: string; // uuid
  isStocked: boolean;
  isActive: boolean;
}

// ------------------------------
// Per-item UoM conversions
// ------------------------------

export interface ItemUom extends BaseEntity {
  itemId: string; // uuid
  uomId: string; // uuid
  toItemBaseMultiplier: number; // numeric(18,6)
  isDefaultPurchase: boolean;
  isDefaultIssue: boolean;
  isDefaultSale: boolean;
}

// ------------------------------
// Recipe (BOM)
// ------------------------------

export interface Recipe extends BaseEntity {
  organizationId: string; // uuid
  parentItemId: string; // uuid
  yieldQuantity: number; // numeric(18,6)
  yieldUomId: string; // uuid
  version: number;
  isActive: boolean;
}

export interface RecipeComponent extends BaseEntity {
  recipeId: string; // uuid
  childItemId: string; // uuid
  quantity: number; // numeric(18,6)
  uomId: string; // uuid
  wastePct: number; // numeric(5,2)
  sortOrder: number;
}

// ------------------------------
// Inventory Journals (Immutable Ledger)
// ------------------------------

export interface InventoryJournal extends BaseEntity {
  organizationId: string; // uuid
  journalType: JournalType;
  sourceTable: string | null;
  sourceId: string | null; // uuid
  reference: string | null;
  note: string | null;
  postedAt: string; // timestamptz
  postedBy: string; // uuid
  reversesJournalId: string | null; // uuid
  reversalReason: string | null;
}

export interface InventoryJournalLine extends BaseEntity {
  journalId: string; // uuid
  locationId: string; // uuid
  itemId: string; // uuid
  quantityBase: number; // numeric(18,6)
  unitCost: number | null; // numeric(18,6)
  meta: Record<string, any>; // jsonb
}

// ------------------------------
// Transfers
// ------------------------------

export interface StockTransfer extends BaseEntity {
  organizationId: string; // uuid
  fromLocationId: string; // uuid
  toLocationId: string; // uuid
  status: TransferStatus;
  reference: string | null;
  note: string | null;
  issuedAt: string | null; // timestamptz
  issuedBy: string | null; // uuid
  receivedAt: string | null; // timestamptz
  receivedBy: string | null; // uuid
  voidedAt: string | null; // timestamptz
  voidedBy: string | null; // uuid
  voidReason: string | null;
  issueJournalId: string | null; // uuid
  receiveJournalId: string | null; // uuid
}

export interface StockTransferLine extends BaseEntity {
  transferId: string; // uuid
  itemId: string; // uuid
  issuedQuantity: number | null; // numeric(18,6)
  issuedUomId: string | null; // uuid
  issuedQtyBase: number | null; // numeric(18,6)
  receivedQuantity: number | null; // numeric(18,6)
  receivedUomId: string | null; // uuid
  receivedQtyBase: number | null; // numeric(18,6)
  note: string | null;
}

// ------------------------------
// View Models (Read-only)
// ------------------------------

export interface InventoryOnHand {
  organizationId: string; // uuid
  locationId: string; // uuid
  itemId: string; // uuid
  onHandBase: number; // numeric
}
