export type UserRole = 'admin' | 'cashier';

export interface User {
  user_id: string;
  username: string;
  password?: string;
  role: UserRole;
  is_active?: boolean;
}

export interface Category {
  category_id: string;
  name: string;
  created_at?: string;
}

export interface Product {
  product_id: number;
  name: string;
  category: string;
  category_id: string;
  price: number;
  is_available: boolean;
  image_url: string | null;
}

export interface Transaction {
  transaction_id: string;
  date: string;
  total_amount: number;
  payment_mode: 'cash' | 'gcash' | 'maya';
  user_id: string;
}

export interface TransactionItem {
  item_id: string;
  transaction_id: string;
  product_id: number;
  quantity: number;
  subtotal: number;
}

export interface Inventory {
  stock_id: number;
  product_id: number;
  quantity: number;
  reorder_level: number;
  par_level: number | null;
}

export interface StockMovement {
  movement_id: number;
  stock_id: number;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  supplier?: string;
}

export type ReorderStatus = 'pending' | 'ordered' | 'received' | 'cancelled';

export interface ReorderRequest {
  request_id: number;
  product_id: number;
  current_stock_snapshot: number;
  reorder_point_snapshot: number;
  par_level_snapshot: number;
  suggested_quantity: number;
  status: ReorderStatus;
  supplier: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}
