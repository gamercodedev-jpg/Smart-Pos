export interface Transaction {
  id: string;
  tenant_id: string;
  branch_id: string;
  staff_id: string;
  amount: number;
  created_at: string;
  // ...other fields
}
