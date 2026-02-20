import Dexie, { Table } from "dexie";
import { Transaction } from "@/types/Transaction";

export class OfflineVault extends Dexie {
  sales!: Table<Transaction, string>;
  constructor() {
    super("OfflineVault");
    this.version(1).stores({
      sales: "id, tenant_id, branch_id, staff_id, created_at",
    });
  }
}
export const offlineVault = new OfflineVault();
