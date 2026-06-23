export type Category = 'clasica' | 'simple' | 'extras' | 'salsas' | 'promos';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  badge?: string;
}

export interface Sale {
  id: string;
  productId: string;
  date: string; // ISO string
  quantity: number;
  total: number;
}

export interface HeroData {
  titleWhite: string;
  titleRed: string;
  subtitle: string;
  imageUrl: string;
}

export interface Mozo {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  assignedTables?: string[];
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

export interface QRWaitOrder {
  id: string;
  mozoId: string;
  mozoName: string;
  tableNumber: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  date: string;
  printed: boolean;
  deliveryDetails?: {
    customerName: string;
    phone: string;
    type: 'delivery' | 'pickup';
    address?: string;
  };
}

