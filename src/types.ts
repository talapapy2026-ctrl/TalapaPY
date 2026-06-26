export type Category = 'clasica' | 'simple' | 'extras' | 'salsas' | 'promos' | 'entradas' | 'burgers' | 'lomitos' | 'sandwiches';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  badge?: string;
  imageZoom?: number; // Zoom scale factor (e.g. 1.0 to 3.0)
}

export interface Sale {
  id: string;
  productId: string;
  date: string; // ISO string
  quantity: number;
  total: number;
  mozoName?: string;
  orderType?: 'delivery' | 'pickup' | 'table';
  customerName?: string;
  tableNumber?: string;
}

export interface BannerItem {
  url: string;
  zoom?: number;
  fitMode?: 'cover' | 'contain';
}

export interface HeroData {
  titleWhite: string;
  titleRed: string;
  subtitle: string;
  imageUrl: string;
  banners?: (string | BannerItem)[];
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
  subGroup?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'accepted' | 'ready' | 'completed' | 'cancelled' | 'closed';
  date: string;
  printed: boolean;
  deliveryDetails?: {
    customerName: string;
    phone: string;
    type: 'delivery' | 'pickup';
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

