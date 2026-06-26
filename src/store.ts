import type { Product, Sale, HeroData, Mozo, QRWaitOrder } from './types';
import { FIREBASE_URL as CONFIG_FIREBASE_URL } from './config';

const defaultProducts: Product[] = [
  {
    id: 'e1',
    title: 'Papas Fritas (Personal)',
    description: 'Porción individual de papas fritas corte fino.',
    price: 10000,
    category: 'entradas',
    imageUrl: 'Captura de pantalla 2026-06-25 141253.jpg'
  },
  {
    id: 'e2',
    title: 'Papas Fritas (Familiar)',
    description: 'Porción familiar para compartir de papas fritas corte fino.',
    price: 15000,
    category: 'entradas',
    imageUrl: 'Captura de pantalla 2026-06-25 141253.jpg'
  },
  {
    id: 'e3',
    title: 'Papas Fritas c/ Cheddar y Bacon',
    description: 'Papas fritas con cheddar derretido y panceta crocante.',
    price: 22000,
    category: 'entradas',
    imageUrl: 'Captura de pantalla 2026-06-25 141312.jpg'
  },
  {
    id: 'e4',
    title: 'Aros de Cebolla',
    description: 'Aros de cebolla crujientes y dorados.',
    price: 24000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  {
    id: 'e5',
    title: 'Bastones de Mozzarella',
    description: 'Bastones de queso mozzarella rebozados y fritos.',
    price: 25000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  {
    id: 'e6',
    title: 'Alitas de Pollo Frito',
    description: 'Crujientes alitas de pollo frito de la casa.',
    price: 40000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  {
    id: 'e7',
    title: 'Croquetas de Carne',
    description: 'Croquetas de carne sabrosas y crocantes.',
    price: 24000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  {
    id: 'e8',
    title: 'Picada Completa',
    description: 'Mix de milanesitas de pollo y carne, bastones de mozzarella, papas fritas, aros de cebolla, croquetas.',
    price: 70000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  {
    id: 'e9',
    title: 'Picada p/ 2 Personas',
    description: 'Milanesitas de pollo y carne acompañadas de papas fritas.',
    price: 45000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  {
    id: 'e10',
    title: 'Romanitas de Pollo',
    description: 'Romanitas de pechuga de pollo crocantes.',
    price: 40000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  {
    id: 'e11',
    title: 'Chicharrón',
    description: 'Porción de chicharrón tradicional de la casa.',
    price: 40000,
    category: 'entradas',
    imageUrl: 'french_fries.png'
  },
  // Burgers
  {
    id: 'b1',
    title: 'Burger Kids',
    description: 'Pan de papa, mayo casera, carne, queso cheddar.',
    price: 15000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140807.jpg'
  },
  {
    id: 'b2',
    title: 'Burger Simple',
    description: 'Pan de papa, mayo casera, carne, queso cheddar, lechuga, tomate, huevo.',
    price: 22000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140829.jpg'
  },
  {
    id: 'b3',
    title: 'Burger Full Doble',
    description: 'Pan brioche, mayo casera, doble carne, doble queso cheddar.',
    price: 25000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140730.jpg'
  },
  {
    id: 'b4',
    title: 'Burger Fit',
    description: 'Envuelto con lechuga repollada, carne, tomate, huevo.',
    price: 25000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140938.jpg'
  },
  {
    id: 'b5',
    title: 'Burger Full Doble + Bacon',
    description: 'Pan brioche, mayo casera, doble carne, doble queso cheddar, doble bacon.',
    price: 28000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140750.jpg'
  },
  {
    id: 'b6',
    title: 'Burger Doble de la Casa',
    description: 'Pan brioche, mayo casera, doble carne, doble queso cheddar, doble bacon, tomate, lechuga, huevo.',
    price: 30000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140914.jpg'
  },
  {
    id: 'b7',
    title: 'Burger Full Doble de la Casa',
    description: 'Pan brioche, mayo casera, doble carne, doble queso cheddar, doble bacon, tomate, lechuga, huevo, pepinillo, cebolla morada.',
    price: 32000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140637.jpg'
  },
  {
    id: 'b8',
    title: 'Burger Full Triple + Bacon',
    description: 'Pan brioche, mayo casera, triple carne, triple queso cheddar, triple bacon.',
    price: 35000,
    category: 'burgers',
    imageUrl: 'Captura de pantalla 2026-06-25 140750.jpg'
  },
  // Lomitos
  {
    id: 'l1',
    title: 'Lomito Árabe de Pollo/Carne/Mixto',
    description: 'Pan árabe, mayo casera, pollo, carne o mixto, repollo, tomate, huevo.',
    price: 26000,
    category: 'lomitos',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  {
    id: 'l2',
    title: 'Lomito Árabe Especial',
    description: 'Pan árabe, mayo casera, carne, pollo o mixto, repollo, tomate, huevo, queso mozzarella, bacon.',
    price: 29000,
    category: 'lomitos',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  {
    id: 'l3',
    title: 'Lomito Árabe de la Casa',
    description: 'Pan árabe, mayo casera, carne, pollo o mixto, repollo, tomate, huevo, queso mozzarella, queso catupiry, choclo, bacon.',
    price: 32000,
    category: 'lomitos',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  {
    id: 'l4',
    title: 'Lomito Árabe Vegetariano',
    description: 'Pan árabe, mayo casera, repollo, lechuga repollada, tomate, huevo, queso mozzarella.',
    price: 26000,
    category: 'lomitos',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  // Sandwiches de Lomito
  {
    id: 's1',
    title: 'Sándwich de Lomito de Pollo Mixteado',
    description: 'Pan, pollo, bacon, queso.',
    price: 25000,
    category: 'sandwiches',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  {
    id: 's2',
    title: 'Sándwich de Lomito Completo',
    description: 'Pan, mayo casera, carne o pollo, tomate, lechuga, jamón, queso, huevo.',
    price: 27000,
    category: 'sandwiches',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  {
    id: 's3',
    title: 'Sándwich de Lomito de la Casa',
    description: 'Pan, mayo casera, carne o pollo, tomate, lechuga, jamón, queso, huevo, bacon, cebolla.',
    price: 31000,
    category: 'sandwiches',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  {
    id: 's4',
    title: 'Sándwich de Lomito Doble',
    description: 'Pan árabe, mayo casera, carne o pollo, repollo, lechuga repollada, tomate, huevo, queso mozzarella.',
    price: 35000,
    category: 'sandwiches',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  },
  {
    id: 's5',
    title: 'Lomito al Plato',
    description: 'Carne o pollo, jamón, queso, lechuga, tomate, huevo.',
    price: 27000,
    category: 'sandwiches',
    imageUrl: 'Captura de pantalla 2026-06-25 143439.jpg'
  }
];

const defaultHero: HeroData = {
  titleWhite: 'Auténtica',
  titleRed: 'Smash Burger',
  subtitle: 'CALIDAD PREMIUM',
  imageUrl: 'hero_model.png'
};

// Getters and Setters
export const getProducts = (): Product[] => {
  const stored = localStorage.getItem('talapa_products_v2');
  if (stored) {
    const parsed = JSON.parse(stored) as Product[];
    if (parsed.length <= 4 || parsed.some(p => p.id === '1' || p.id === '2')) {
      localStorage.setItem('talapa_products_v2', JSON.stringify(defaultProducts));
      setTimeout(() => pushToServer(), 500);
      return defaultProducts;
    }
    return parsed;
  }
  return defaultProducts;
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
let lastWriteTime = 0;

export const getFirebaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_FIREBASE_URL as string | undefined;
  if (envUrl) return envUrl.trim().replace(/\/$/, '');
  
  const configUrl = CONFIG_FIREBASE_URL as string;
  if (configUrl) return configUrl.trim().replace(/\/$/, '');
  
  return '';
};

export const pushToServer = async () => {
  lastWriteTime = Date.now();
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
  if (Date.now() - lastWriteTime < 10000) {
    // Evitar sobreescribir con datos desactualizados del servidor justo después de escribir localmente
    return;
  }
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
