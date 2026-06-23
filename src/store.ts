import type { Product, Sale, HeroData, Mozo, QRWaitOrder } from './types';
import { FIREBASE_URL as CONFIG_FIREBASE_URL } from './config';

const defaultProducts: Product[] = [
  {
    id: '1',
    title: 'Combo Cheeseburger',
    description: 'Doble Carne, Cheddar, Cebollita, Ketchup & Mayonesa.',
    price: 43000,
    category: 'clasica',
    imageUrl: '/cheeseburger.png'
  },
  {
    id: '2',
    title: 'Combo American',
    description: 'Doble Carne, Cheddar, Tomate, Lechuga, Cebolla, Pepinillo & Salsa Mil Islas.',
    price: 45000,
    category: 'clasica',
    imageUrl: '/american_burger.png'
  },
  {
    id: '3',
    title: 'Papa Mediana',
    description: 'Papas Fritas Corte Fino.',
    price: 8000,
    category: 'extras',
    imageUrl: '/french_fries.png'
  },
  {
    id: '4',
    title: 'Salsa Cheddar',
    description: 'Cheddar Derretido.',
    price: 5000,
    category: 'salsas',
    imageUrl: '/french_fries.png'
  }
];

const defaultHero: HeroData = {
  titleWhite: 'Auténtica',
  titleRed: 'Smash Burger',
  subtitle: 'CALIDAD PREMIUM',
  imageUrl: '/hero_model.png'
};

// Getters and Setters
export const getProducts = (): Product[] => {
  const stored = localStorage.getItem('talapa_products_v2');
  return stored ? JSON.parse(stored) : defaultProducts;
};

export const getHeroData = (): HeroData => {
  const stored = localStorage.getItem('talapa_hero_v2');
  return stored ? JSON.parse(stored) : defaultHero;
};

export const getSales = (): Sale[] => {
  const stored = localStorage.getItem('talapa_sales');
  return stored ? JSON.parse(stored) : [];
};

export const getEditMode = (): boolean => {
  return localStorage.getItem('talapa_edit_mode') === 'true';
};

export const getMozos = (): Mozo[] => {
  const stored = localStorage.getItem('talapa_mozos');
  return stored ? JSON.parse(stored) : [];
};

export const getQROrders = (): QRWaitOrder[] => {
  const stored = localStorage.getItem('talapa_qr_orders');
  return stored ? JSON.parse(stored) : [];
};

// Sync engine variables
let isPushing = false;
let pushPending = false;

export const getFirebaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_FIREBASE_URL as string | undefined;
  if (envUrl) return envUrl.trim().replace(/\/$/, '');
  
  const configUrl = CONFIG_FIREBASE_URL as string;
  if (configUrl) return configUrl.trim().replace(/\/$/, '');
  
  return '';
};

export const pushToServer = async () => {
  if (isPushing) {
    pushPending = true;
    return;
  }
  isPushing = true;
  pushPending = false;
  try {
    const data = {
      products: getProducts(),
      heroData: getHeroData(),
      sales: getSales(),
      editMode: getEditMode(),
      mozos: getMozos(),
      qrOrders: getQROrders()
    };
    
    const firebaseUrl = getFirebaseUrl();
    if (firebaseUrl) {
      await fetch(`${firebaseUrl}/.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  } catch (err) {
    console.error('Error pushing data to server:', err);
  } finally {
    isPushing = false;
    if (pushPending) {
      pushToServer();
    }
  }
};

export const pullFromServer = async () => {
  if (isPushing || pushPending) return;
  try {
    const firebaseUrl = getFirebaseUrl();
    let data: any = null;
    
    if (firebaseUrl) {
      const res = await fetch(`${firebaseUrl}/.json`);
      if (!res.ok) return;
      data = await res.json();
    } else {
      const res = await fetch('/api/data');
      if (!res.ok) return;
      data = await res.json();
    }
    
    if (!data) return; // Firebase DB root could be null if empty
    
    if (isPushing || pushPending) return;
    
    // Check if server database is empty/fresh (no mozos or sales registered on backend)
    const isServerFresh = 
      (!data.mozos || data.mozos.length === 0) && 
      (!data.qrOrders || data.qrOrders.length === 0) &&
      (!data.sales || data.sales.length === 0);
      
    // Check if client already has existing offline data
    const localMozos = getMozos();
    const localOrders = getQROrders();
    const localSales = getSales();
    const hasClientData = localMozos.length > 0 || localOrders.length > 0 || localSales.length > 0;
    
    if (isServerFresh && hasClientData) {
      // Server is fresh but this client has existing data (e.g. PC Admin), upload it!
      await pushToServer();
      return;
    }
    
    let changed = false;
    
    const setKeyIfChanged = (key: string, newValue: string) => {
      if (localStorage.getItem(key) !== newValue) {
        localStorage.setItem(key, newValue);
        changed = true;
      }
    };
    
    if (data.products) setKeyIfChanged('talapa_products_v2', JSON.stringify(data.products));
    if (data.heroData) setKeyIfChanged('talapa_hero_v2', JSON.stringify(data.heroData));
    if (data.sales) setKeyIfChanged('talapa_sales', JSON.stringify(data.sales));
    if (data.mozos) setKeyIfChanged('talapa_mozos', JSON.stringify(data.mozos));
    if (data.qrOrders) setKeyIfChanged('talapa_qr_orders', JSON.stringify(data.qrOrders));
    if (data.editMode !== undefined) setKeyIfChanged('talapa_edit_mode', data.editMode ? 'true' : 'false');
    
    if (changed) {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.error('Error pulling data from server:', err);
  }
};

// Start background syncing
if (typeof window !== 'undefined') {
  pullFromServer();
  setInterval(pullFromServer, 2000);
}

// Writers and modifiers
export const saveProducts = (products: Product[]) => {
  localStorage.setItem('talapa_products_v2', JSON.stringify(products));
  pushToServer();
};

export const saveHeroData = (data: HeroData) => {
  localStorage.setItem('talapa_hero_v2', JSON.stringify(data));
  pushToServer();
};

export const addSale = (sale: Sale) => {
  const sales = getSales();
  sales.push(sale);
  localStorage.setItem('talapa_sales', JSON.stringify(sales));
  pushToServer();
};

export const setEditMode = (status: boolean) => {
  localStorage.setItem('talapa_edit_mode', status ? 'true' : 'false');
  pushToServer();
};

// Mozos Storage
export const saveMozos = (mozos: Mozo[]) => {
  localStorage.setItem('talapa_mozos', JSON.stringify(mozos));
  pushToServer();
};

export const addMozo = (mozo: Mozo) => {
  const mozos = getMozos();
  mozos.push(mozo);
  saveMozos(mozos);
};

export const deleteMozo = (id: string) => {
  const mozos = getMozos();
  const filtered = mozos.filter(m => m.id !== id);
  saveMozos(filtered);
};

// QR Orders Storage
export const saveQROrders = (orders: QRWaitOrder[]) => {
  localStorage.setItem('talapa_qr_orders', JSON.stringify(orders));
  window.dispatchEvent(new Event('storage'));
  pushToServer();
};

export const addQROrder = (order: QRWaitOrder) => {
  const orders = getQROrders();
  orders.push(order);
  saveQROrders(orders);
};

export const updateQROrderStatus = (id: string, status: QRWaitOrder['status']) => {
  const orders = getQROrders();
  const updated = orders.map(o => o.id === id ? { ...o, status } : o);
  saveQROrders(updated);
};

export const markOrderAsPrinted = (id: string) => {
  const orders = getQROrders();
  const updated = orders.map(o => o.id === id ? { ...o, printed: true } : o);
  saveQROrders(updated);
};
