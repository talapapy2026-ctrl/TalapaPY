import React, { useState, useEffect } from 'react';
import type { Product, HeroData, QRWaitOrder, OrderItem, Mozo } from '../types';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getProducts, getHeroData, getEditMode, saveProducts, getMozos, addQROrder, getQROrders, saveHeroData } from '../store';
import { ShoppingBag, Plus, Minus, Trash2, X, Check, Edit, Upload } from 'lucide-react';
const formatImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    return `./${url.substring(1)}`;
  }
  return `./${url}`;
};

const compressImage = (file: File, maxWidth = 1200, maxHeight = 900, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface CartItem {
  id: string; // unique combination of product id + customizations
  product: Product;
  quantity: number;
  removedIngredients: string[];
  addedExtras: { name: string; price: number }[];
  customizedPrice: number;
  customizedTitle: string;
}

const getRemovableIngredients = (product: Product): string[] => {
  const desc = product.description.toLowerCase();
  const list: string[] = [];
  if (desc.includes('huevo')) list.push('Huevo');
  if (desc.includes('tomate')) list.push('Tomate');
  if (desc.includes('lechuga')) list.push('Lechuga');
  if (desc.includes('cebolla') || desc.includes('cebollita')) list.push('Cebolla');
  if (desc.includes('pepinillo') || desc.includes('pepinillos')) list.push('Pepinillos');
  if (desc.includes('bacon') || desc.includes('tocino')) list.push('Bacon');
  if (desc.includes('cheddar')) list.push('Queso Cheddar');
  if (desc.includes('catupiry')) list.push('Queso Catupiry');
  if (desc.includes('choclo')) list.push('Choclo');
  if (desc.includes('repollo')) list.push('Repollo');
  if (desc.includes('jamón') || desc.includes('jamon')) list.push('Jamón');

  // Fallbacks based on category if empty
  if (list.length === 0) {
    if (product.category === 'burgers' || product.category === 'clasica') {
      return ['Huevo', 'Lechuga', 'Tomate', 'Cebolla', 'Pepinillos', 'Bacon'];
    } else if (product.category === 'lomitos') {
      return ['Huevo', 'Tomate', 'Repollo', 'Bacon', 'Choclo'];
    } else if (product.category === 'sandwiches') {
      return ['Huevo', 'Tomate', 'Lechuga', 'Jamón', 'Bacon'];
    }
  }
  return list;
};

export const Landing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [hero, setHero] = useState<HeroData>(getHeroData());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingHero, setEditingHero] = useState<HeroData | null>(null);

  // Banner Carousel States
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const ResolvedBanners = (hero.banners || ['BANNER1.png', 'BANNER2.jpg', 'BANNER3.jpg']).map(b => {
    if (typeof b === 'string') {
      return { url: b, zoom: 1, fitMode: 'cover' as const };
    }
    return { url: b.url, zoom: b.zoom || 1, fitMode: b.fitMode || ('cover' as const) };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % ResolvedBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [ResolvedBanners.length]);

  // QR and Cart States
  const mozoIdParam = searchParams.get('mozoId') || '';
  const mesaParam = searchParams.get('mesa') || '';
  const [mozoName, setMozoName] = useState('');
  const [loggedMozo, setLoggedMozo] = useState<Mozo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(mesaParam);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);

  // Logout Mozo PIN Modal states
  const [showLogoutPinModal, setShowLogoutPinModal] = useState(false);
  const [logoutPinInput, setLogoutPinInput] = useState('');
  const [logoutPinError, setLogoutPinError] = useState('');

  // Customization States
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedRemovedIngredients, setSelectedRemovedIngredients] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<{ name: string; price: number }[]>([]);
  const [selectedMeatOption, setSelectedMeatOption] = useState<'Carne' | 'Pollo' | 'Mixto' | null>(null);

  // Delivery States - Securely enforce delivery/takeout mode for external clients
  const hasTableSession = !!mozoIdParam || !!mesaParam || !!localStorage.getItem('talapa_logged_mozo_id');
  const deliveryMode = !hasTableSession;
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [subGroupName, setSubGroupName] = useState('');
  const [subGroupSelectMode, setSubGroupSelectMode] = useState<'select' | 'new'>('select');

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);

  const requestGeoLocation = () => {
    if (!navigator.geolocation) {
      alert("Su navegador no soporta geolocalización.");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        setGettingLocation(false);
        alert("No se pudo obtener su ubicación. Por favor active el GPS de su dispositivo y dé permisos.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (deliveryMode && deliveryType === 'delivery') {
      requestGeoLocation();
    }
  }, [deliveryType, deliveryMode]);

  // Find active sub-groups for the current table to show in a dropdown
  const getActiveSubGroupsForTable = (): string[] => {
    if (!tableNumber) return [];
    try {
      const activeOrders = getQROrders().filter(o => 
        o.tableNumber.toLowerCase() === tableNumber.toLowerCase() && 
        o.status !== 'closed' && 
        o.status !== 'cancelled'
      );
      const groups = new Set<string>();
      activeOrders.forEach(o => {
        if (o.subGroup && o.subGroup.trim()) {
          groups.add(o.subGroup.trim());
        }
      });
      return Array.from(groups);
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  useEffect(() => {
    setProducts(getProducts());
    setIsEditMode(getEditMode());
    
    // Resolve sub-group parameter if present in query string
    const subGroup = searchParams.get('subGroup') || '';
    setSubGroupName(subGroup);
    if (subGroup) {
      setSubGroupSelectMode('new');
    } else {
      setSubGroupSelectMode('select');
    }

    const resolveMozoSession = () => {
      const mozosList = getMozos();
      if (mozoIdParam) {
        const matchedMozo = mozosList.find(m => m.id === mozoIdParam);
        if (matchedMozo) {
          setMozoName(matchedMozo.name);
        } else {
          setMozoName('Mozo Asignado');
        }
      } else {
        const loggedMozoId = localStorage.getItem('talapa_logged_mozo_id');
        if (loggedMozoId) {
          const matchedMozo = mozosList.find(m => m.id === loggedMozoId);
          if (matchedMozo) {
            setLoggedMozo(matchedMozo);
            setMozoName(matchedMozo.name);
          } else {
            setLoggedMozo(null);
            setMozoName('');
          }
        } else {
          setLoggedMozo(null);
          setMozoName('');
        }
      }
    };

    resolveMozoSession();

    const handleStorage = () => {
      setIsEditMode(getEditMode());
      setProducts(getProducts());
      setHero(getHeroData());
      resolveMozoSession();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [mozoIdParam, searchParams]);

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const newProducts = products.map(p => p.id === editingProduct.id ? editingProduct : p);
    setProducts(newProducts);
    saveProducts(newProducts);
    setEditingProduct(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.7);
        if (editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl: compressed, imageZoom: 1 });
        }
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  const renderProductCard = (product: Product) => {
    const hasImage = !!product.imageUrl;
    return (
      <div key={product.id} className="editable-element" style={{ display: 'flex', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.06)', transition: 'transform 0.3s' }}>
        {isEditMode && <button className="edit-badge" onClick={() => handleEditClick(product)}>Editar</button>}
        {hasImage && (
          <div style={{ width: '40%', minWidth: '120px', overflow: 'hidden' }}>
            <img 
              src={formatImageUrl(product.imageUrl)} 
              alt={product.title} 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                transform: `scale(${product.imageZoom || 1})`,
                transition: 'transform 0.2s'
              }} 
            />
          </div>
        )}
        <div style={{ padding: '20px', width: hasImage ? '60%' : '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={!hasImage ? { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '10px' } : undefined}>
            <h3 style={{ marginBottom: '5px', fontSize: '1.3rem', color: '#111' }}>{product.title}</h3>
            <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.3', margin: 0 }}>{product.description}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: hasImage ? '0px' : 'auto' }}>
            <div className="text-red" style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'Oswald' }}>
              Gs. {product.price.toLocaleString()}
            </div>
            <button 
              onClick={() => addToCart(product)}
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.9rem', borderRadius: '6px', display: 'flex', gap: '5px', alignItems: 'center' }}
            >
              <Plus size={14} /> Pedir
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Cart operations
  const addToCart = (product: Product) => {
    handleOpenCustomizer(product);
  };

  const handleOpenCustomizer = (product: Product) => {
    const desc = (product.description || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const hasMeat = desc.includes('carne o pollo') || title.includes('carne o pollo') || desc.includes('mixto') || title.includes('mixto') || title.includes('mixteado');

    setSelectedMeatOption(hasMeat ? 'Carne' : null);
    setCustomizingProduct(product);
    setSelectedRemovedIngredients([]);
    setSelectedExtras([]);
  };

  const addCustomizedToCart = (
    product: Product,
    removed: string[],
    extras: { name: string; price: number }[]
  ) => {
    let titleParts = [product.title];
    if (selectedMeatOption) {
      titleParts.push(`(${selectedMeatOption})`);
    }
    if (removed.length > 0) {
      titleParts.push(`(Sin ${removed.join(', ')})`);
    }
    if (extras.length > 0) {
      titleParts.push(`(+ ${extras.map(e => e.name).join(', + ')})`);
    }
    const customizedTitle = titleParts.join(' ');

    const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
    const customizedPrice = product.price + extrasTotal;

    const removedKey = [...removed].sort().join(',');
    const extrasKey = extras.map(e => e.name).sort().join(',');
    const cartItemId = `${product.id}-${selectedMeatOption || ''}-${removedKey}-${extrasKey}`;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === cartItemId);
      if (existing) {
        return prevCart.map(item =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, {
        id: cartItemId,
        product,
        quantity: 1,
        removedIngredients: removed,
        addedExtras: extras,
        customizedPrice,
        customizedTitle
      }];
    });
    setCustomizingProduct(null);
    setSelectedMeatOption(null);
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + change;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!deliveryMode) {
      if (!tableNumber) {
        alert('Por favor ingrese el número de mesa.');
        return;
      }
    } else {
      if (!customerName || !phone) {
        alert('Por favor ingrese su nombre y número de teléfono.');
        return;
      }
      if (deliveryType === 'delivery' && !deliveryAddress) {
        alert('Por favor ingrese su dirección de entrega.');
        return;
      }
    }

    let formattedPhone = phone;
    if (deliveryMode && phone) {
      let cleaned = phone.replace(/\D/g, ''); // keep only digits
      if (cleaned.startsWith('595')) {
        formattedPhone = '+' + cleaned;
      } else {
        if (cleaned.startsWith('0')) {
          cleaned = cleaned.substring(1);
        }
        formattedPhone = '+595' + cleaned;
      }
    }

    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      title: item.customizedTitle,
      price: item.customizedPrice,
      quantity: item.quantity
    }));

    const total = cartTotal;

    const orderMozoId = deliveryMode ? 'online' : (mozoIdParam || loggedMozo?.id || 'direct');
    const orderMozoName = deliveryMode ? 'CLIENTE (ONLINE)' : (mozoName || loggedMozo?.name || 'Ninguno');
    const finalTableNumber = deliveryMode ? (deliveryType === 'delivery' ? 'DELIVERY' : 'RETIRO') : tableNumber;

    const newOrder: QRWaitOrder = {
      id: Date.now().toString(),
      mozoId: orderMozoId,
      mozoName: orderMozoName,
      tableNumber: finalTableNumber,
      subGroup: !deliveryMode && subGroupName.trim() ? subGroupName.trim() : undefined,
      items: orderItems,
      total: total,
      status: 'pending',
      date: new Date().toISOString(),
      printed: false,
      ...(deliveryMode ? {
        deliveryDetails: {
          customerName,
          phone: formattedPhone,
          type: deliveryType,
          address: deliveryType === 'delivery' ? deliveryAddress : undefined,
          latitude: deliveryType === 'delivery' && latitude ? latitude : undefined,
          longitude: deliveryType === 'delivery' && longitude ? longitude : undefined
        }
      } : {})
    };

    addQROrder(newOrder);

    // Launch WhatsApp message if in deliveryMode (Online Customer)
    if (deliveryMode) {
      let msg = `*🍔 TALAPA BURGER - NUEVO PEDIDO 🍔*\n\n`;
      msg += `*Cliente:* ${customerName}\n`;
      msg += `*Teléfono:* ${formattedPhone}\n`;
      msg += `*Tipo:* ${deliveryType === 'delivery' ? '🛵 Delivery' : '🥡 Retiro Local'}\n`;
      if (deliveryType === 'delivery') {
        msg += `*Dirección:* ${deliveryAddress}\n`;
      }
      msg += `\n*--- DETALLE DEL PEDIDO ---*\n`;
      cart.forEach(item => {
        msg += `• ${item.quantity}x ${item.customizedTitle} (Gs. ${item.customizedPrice.toLocaleString()}) = Gs. ${(item.customizedPrice * item.quantity).toLocaleString()}\n`;
      });
      msg += `\n*TOTAL A PAGAR: Gs. ${total.toLocaleString()}*\n\n`;
      msg += `¡Muchas gracias!`;

      const waUrl = `https://wa.me/595981874120?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    }

    setCart([]);
    setSubGroupName('');
    setIsCartOpen(false);
    setOrderSentSuccess(true);
    setTimeout(() => {
      setOrderSentSuccess(false);
    }, 4000);
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.customizedPrice * item.quantity, 0);

  const entradas = products.filter(p => p.category === 'entradas');
  const burgers = products.filter(p => p.category === 'burgers' || p.category === 'clasica');
  const lomitos = products.filter(p => p.category === 'lomitos');
  const sandwiches = products.filter(p => p.category === 'sandwiches');

  return (
    <div style={{ 
      position: 'relative', 
      minHeight: '100vh', 
      paddingBottom: '80px',
      backgroundImage: `url("${formatImageUrl('FONDO DE MEN.jpg')}")`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Floating Header Container */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        {/* Top Banner indicating QR Mozo & Mesa details */}
        {mozoIdParam && (
          <div style={{
            background: 'linear-gradient(90deg, #ffc107, #ff9800)',
            color: '#111',
            padding: '10px 20px',
            textAlign: 'center',
            fontFamily: 'Oswald',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#da251d', animation: 'pulse 1.5s infinite' }}></span>
            MESA {tableNumber || 'S/N'} — ATENDIDO POR: {mozoName.toUpperCase()}
          </div>
        )}

        {/* Mozo Direct Logged session top bar */}
        {!mozoIdParam && loggedMozo && (
          <div style={{
            background: 'linear-gradient(90deg, #2e7d32, #1b5e20)',
            color: '#fff',
            padding: '10px 20px',
            textAlign: 'center',
            fontFamily: 'Oswald',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary-yellow)', animation: 'pulse 1.5s infinite' }}></span>
            SESIÓN MOZO: {loggedMozo.name.toUpperCase()} (TOMA DE PEDIDOS DIRECTA)
            <button 
              onClick={(e) => {
                e.preventDefault();
                setLogoutPinInput('');
                setLogoutPinError('');
                setShowLogoutPinModal(true);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '0.8rem',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        )}

        <nav style={{ 
          background: 'rgba(0, 0, 0, 0.22)', 
          backdropFilter: 'blur(5px)',
          padding: '10px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src={formatImageUrl('LOGO.png')} alt="Palapa Logo" style={{ width: '65px', height: '65px', borderRadius: '50%', border: '2px solid white', objectFit: 'cover' }} />
            <div style={{ color: 'white', fontFamily: 'Oswald', fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '1.5px' }}>PALAPA FOOD</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {mozoIdParam && (
              <Link to={`/mozo?mozoId=${mozoIdParam}`} style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.9rem', border: '1px solid white', padding: '5px 10px', borderRadius: '4px' }}>
                Portal Mozo
              </Link>
            )}
            {!mozoIdParam && loggedMozo && (
              <button 
                onClick={() => {
                  const pin = window.prompt("Ingrese su PIN de acceso para ver sus pedidos:");
                  if (pin === null) return; // User cancelled
                  if (pin === loggedMozo.code) {
                    navigate(`/mozo?mozoId=${loggedMozo.id}`);
                  } else {
                    alert("PIN incorrecto");
                  }
                }}
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  opacity: 0.8,
                  fontSize: '0.9rem',
                  border: '1px solid white',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Ver mis pedidos
              </button>
            )}
            {!loggedMozo && !mozoIdParam && (
              <Link to="/login" style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.4)', padding: '5px 10px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}>Ingresar Usuario</Link>
            )}
          </div>
        </nav>
      </div>

      <div className="hero" style={{ height: '70vh', minHeight: '500px', position: 'relative', overflow: 'hidden' }}>
        {ResolvedBanners.map((b, index) => (
          <div
            key={b.url}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${formatImageUrl(b.url)})`,
              backgroundSize: b.fitMode || 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#111',
              opacity: index === currentBannerIndex ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
              transform: `scale(${b.zoom || 1})`,
              zIndex: 1
            }}
          />
        ))}
        <div className="hero-overlay" style={{ zIndex: 2, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
        
        {isEditMode && (
          <button 
            onClick={() => setEditingHero(hero)}
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              zIndex: 15,
              background: 'var(--secondary-yellow)',
              color: 'black',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              fontFamily: 'Oswald',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Edit size={16} /> Editar Banner
          </button>
        )}

        <div className="hero-content" style={{ zIndex: 3, position: 'relative', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', padding: '0 20px 80px 20px' }}>
          <h1 style={{ fontSize: '3rem', fontFamily: 'Oswald', color: 'white', textTransform: 'uppercase', margin: '0 0 10px 0', textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
            {hero.titleWhite} <span style={{ color: 'var(--primary-red)' }}>{hero.titleRed}</span>
          </h1>
          <p style={{ color: 'white', fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>{hero.subtitle}</p>
        </div>
        {/* Indicators */}
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 4 }}>
          {ResolvedBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBannerIndex(index)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentBannerIndex ? 'var(--secondary-yellow)' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
            />
          ))}
        </div>
      </div>

      <div id="menu" className="container" style={{ padding: '40px 20px' }}>
        {/* Smash Burgers Section */}
        {burgers.length > 0 && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--primary-red)', fontSize: '2.5rem', borderBottom: '3px solid var(--primary-red)', paddingBottom: '10px', display: 'inline-block', left: '50%', transform: 'translateX(-50%)', position: 'relative' }}>Smash Burgers</h2>
            <div className="grid grid-cols-2" style={{ marginTop: '20px', gap: '20px' }}>
              {burgers.map(renderProductCard)}
            </div>
          </>
        )}

        {/* Lomitos Árabes Section */}
        {lomitos.length > 0 && (
          <>
            <h2 style={{ textAlign: 'center', margin: '60px auto 30px', color: 'var(--secondary-yellow)', fontSize: '2.5rem', borderBottom: '3px solid var(--secondary-yellow)', paddingBottom: '10px', display: 'inline-block', left: '50%', transform: 'translateX(-50%)', position: 'relative' }}>Lomitos Árabes</h2>
            <div className="grid grid-cols-2" style={{ marginTop: '20px', gap: '20px' }}>
              {lomitos.map(renderProductCard)}
            </div>
          </>
        )}

        {/* Sándwiches de Lomito Section */}
        {sandwiches.length > 0 && (
          <>
            <h2 style={{ textAlign: 'center', margin: '60px auto 30px', color: '#111', fontSize: '2.5rem', borderBottom: '3px solid #111', paddingBottom: '10px', display: 'inline-block', left: '50%', transform: 'translateX(-50%)', position: 'relative' }}>Sándwiches de Lomito</h2>
            <div className="grid grid-cols-2" style={{ marginTop: '20px', gap: '20px' }}>
              {sandwiches.map(renderProductCard)}
            </div>
          </>
        )}

        {/* Entradas Section */}
        {entradas.length > 0 && (
          <>
            <h2 style={{ textAlign: 'center', margin: '60px auto 30px', color: 'var(--primary-red)', fontSize: '2.5rem', borderBottom: '3px solid var(--primary-red)', paddingBottom: '10px', display: 'inline-block', left: '50%', transform: 'translateX(-50%)', position: 'relative' }}>Entradas</h2>
            <div className="grid grid-cols-2" style={{ marginTop: '20px', gap: '20px' }}>
              {entradas.map(renderProductCard)}
            </div>
          </>
        )}
      </div>

      {/* Footer / Contact info (Vero's Nails Premium Style) */}
      <footer style={{ 
        background: '#050505', 
        borderTop: '1px solid rgba(218, 37, 29, 0.2)', 
        padding: '60px 24px', 
        textAlign: 'center',
        marginTop: '80px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Logo & Branding */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
            <img 
              src={formatImageUrl('LOGO.png')} 
              alt="Palapa Food" 
              style={{ width: '85px', height: '85px', borderRadius: '50%', border: '1px solid rgba(218, 37, 29, 0.4)', objectFit: 'cover', marginBottom: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} 
            />
            <span style={{ 
              fontFamily: '"Playfair Display", serif', 
              fontSize: '28px', 
              letterSpacing: '3px', 
              color: 'white',
              fontWeight: '900',
              textTransform: 'uppercase'
            }}>
              PALAPA FOOD
            </span>
          </div>

          <p style={{ 
            color: '#999999', 
            fontSize: '14px', 
            marginBottom: '28px',
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            letterSpacing: '1px'
          }}>
            “𝕊𝕖 𝕓𝕦𝕖𝕟𝕠, 𝕤𝕒𝕓𝕖 𝕞𝕖𝕛𝕠𝕣” · Somos PetFriendly 🐾
          </p>

          <p style={{ color: '#999999', fontSize: '13px', marginBottom: '32px', lineHeight: '1.6', letterSpacing: '0.5px' }}>
            Martes a Domingo: 17:00 a 01:00 AM<br/>
            Barrio San Pablo, Asunción, Paraguay
          </p>

          {/* Social Icons (Circular) */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
            {/* Instagram */}
            <a 
              href="https://www.instagram.com/palapa.food/?hl=es-la" 
              target="_blank" 
              rel="noreferrer"
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '1px solid rgba(218, 37, 29, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary-red)', textDecoration: 'none',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-red)'; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-red)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>

            {/* WhatsApp */}
            <a 
              href="https://wa.me/595984323400" 
              target="_blank" 
              rel="noreferrer"
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '1px solid rgba(218, 37, 29, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary-red)', textDecoration: 'none',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-red)'; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-red)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </a>

            {/* Maps */}
            <a 
              href="https://maps.app.goo.gl/3QQuRMLV5Dd1cYoA9" 
              target="_blank" 
              rel="noreferrer"
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '1px solid rgba(218, 37, 29, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary-red)', textDecoration: 'none',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-red)'; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-red)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </a>
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            &copy; {new Date().getFullYear()} Palapa Food. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Floating Shopping Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        style={{
          position: 'fixed',
          bottom: '25px',
          right: '25px',
          width: '65px',
          height: '65px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-red)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 20px rgba(218, 37, 29, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          transition: 'transform 0.2s ease-in-out'
        }}
        className="btn-floating"
      >
        <ShoppingBag size={28} />
        {cartItemsCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: 'var(--secondary-yellow)',
            color: 'var(--text-dark)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            fontFamily: 'Oswald'
          }}>
            {cartItemsCount}
          </span>
        )}
      </button>

      {/* Success Notification Modal */}
      {orderSentSuccess && (
        <div style={{
          position: 'fixed',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#2e7d32',
          color: 'white',
          padding: '16px 30px',
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 1100,
          animation: 'fadeInDown 0.4s ease-out',
          fontFamily: 'Inter',
          fontWeight: '600'
        }}>
          <div style={{ background: 'white', borderRadius: '50%', padding: '4px', display: 'flex' }}>
            <Check size={18} color="#2e7d32" strokeWidth={3} />
          </div>
          <div>
            <div style={{ fontSize: '1rem' }}>¡Pedido Recibido con éxito!</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'normal' }}>Tu mozo y la cocina ya están trabajando en él.</div>
          </div>
        </div>
      )}

      {/* Cart Sidebar/Modal Drawer (Glassmorphic & Premium) */}
      {isCartOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '450px',
              height: '100%',
              backgroundColor: '#fff',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--primary-red)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={24} />
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'white' }}>Mi Pedido</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                  <img src={formatImageUrl("/french_fries.png")} style={{ width: '80px', opacity: 0.5, marginBottom: '20px' }} />
                  <h3>Tu carrito está vacío</h3>
                  <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>Agrega exquisitos combos clásicos o acompañamientos de nuestro menú.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      padding: '15px 0',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <img 
                      src={formatImageUrl(item.product.imageUrl)} 
                      alt={item.product.title} 
                      style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', color: '#111', margin: '0 0 5px 0', fontWeight: 'bold' }}>{item.customizedTitle}</h4>
                      <div className="text-red" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Gs. {item.customizedPrice.toLocaleString()}
                      </div>
                    </div>
                    {/* Quantity selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f5f5f5', padding: '5px', borderRadius: '20px' }}>
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', minWidth: '15px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {/* Delete button */}
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', display: 'flex', padding: '5px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions Form */}
            {cart.length > 0 && (
              <div style={{ padding: '20px', borderTop: '1px solid #eee', background: '#fafafa' }}>
                <form onSubmit={handlePlaceOrder}>

                  {!deliveryMode ? (
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ fontSize: '0.9rem', color: '#333' }}>Mesa del Pedido</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ej. Mesa 4"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        disabled={!!mesaParam} // Lock if preset by QR URL
                        required
                        style={{ 
                          fontWeight: 'bold', 
                          fontSize: '1.1rem',
                          color: !!mesaParam ? '#777' : '#000',
                          backgroundColor: !!mesaParam ? '#eef2f3' : '#fff'
                        }}
                      />
                      {!!mesaParam && (
                        <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '3px', display: 'block' }}>
                          * La mesa se completó automáticamente a través del código QR.
                        </span>
                      )}
                      
                      {/* Sub-grupo / Identificación de cuenta opcional */}
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ fontSize: '0.9rem', color: '#333', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                          ¿Quién realiza el pedido? (Opcional)
                        </label>
                        {(() => {
                          const activeGroups = getActiveSubGroupsForTable();
                          if (activeGroups.length === 0) {
                            return (
                              <>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="Ej: Pareja 1, Juan..."
                                  value={subGroupName}
                                  onChange={(e) => setSubGroupName(e.target.value)}
                                  style={{ fontSize: '1rem', padding: '8px 12px' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '3px', display: 'block' }}>
                                  Permite dividir la cuenta e identificar qué consumió cada pareja o persona de la mesa.
                                </span>
                              </>
                            );
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {subGroupSelectMode === 'select' ? (
                                <select
                                  className="form-control"
                                  value={subGroupName}
                                  onChange={(e) => {
                                    if (e.target.value === '__new__') {
                                      setSubGroupSelectMode('new');
                                      setSubGroupName('');
                                    } else {
                                      setSubGroupName(e.target.value);
                                    }
                                  }}
                                  style={{ fontSize: '1rem', padding: '8px 12px', height: 'auto', WebkitAppearance: 'menulist' }}
                                >
                                  <option value="">-- Consumo General / Cuenta Consolidada --</option>
                                  {activeGroups.map(g => (
                                    <option key={g} value={g}>Unirse a la cuenta de: {g.toUpperCase()}</option>
                                  ))}
                                  <option value="__new__" style={{ fontWeight: 'bold', color: 'var(--primary-red)' }}>+ Crear nueva cuenta / pareja...</option>
                                </select>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                      type="text" 
                                      className="form-control" 
                                      placeholder="Ej: Pareja 2, Luis..."
                                      value={subGroupName}
                                      onChange={(e) => setSubGroupName(e.target.value)}
                                      style={{ fontSize: '1rem', padding: '8px 12px', flex: 1 }}
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSubGroupSelectMode('select');
                                        setSubGroupName('');
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        background: '#f1f5f9',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      Volver
                                    </button>
                                  </div>
                                </div>
                              )}
                              <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>
                                Selecciona una cuenta existente o crea una nueva para que no se mezclen los consumos de la mesa.
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Customer Name */}
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.9rem', color: '#333', fontWeight: 'bold' }}>Nombre y Apellido</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Tu nombre completo"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                          style={{ fontWeight: 'bold', fontSize: '1rem' }}
                        />
                      </div>
                      
                      {/* Phone */}
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.9rem', color: '#333', fontWeight: 'bold' }}>Número de Teléfono</label>
                        <input 
                          type="tel" 
                          className="form-control" 
                          placeholder="Ej: 0981123456"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          style={{ fontWeight: 'bold', fontSize: '1rem' }}
                        />
                      </div>

                      {/* Type of service: Delivery or Pickup */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <label style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          textAlign: 'center',
                          backgroundColor: deliveryType === 'delivery' ? '#fff0f0' : '#fff',
                          borderColor: deliveryType === 'delivery' ? '#da251d' : '#ddd',
                          color: deliveryType === 'delivery' ? '#da251d' : '#555',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}>
                          <input 
                            type="radio" 
                            name="deliveryType" 
                            checked={deliveryType === 'delivery'} 
                            onChange={() => setDeliveryType('delivery')}
                            style={{ display: 'none' }}
                          />
                          🛵 Delivery
                        </label>
                        
                        <label style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          textAlign: 'center',
                          backgroundColor: deliveryType === 'pickup' ? '#fff0f0' : '#fff',
                          borderColor: deliveryType === 'pickup' ? '#da251d' : '#ddd',
                          color: deliveryType === 'pickup' ? '#da251d' : '#555',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}>
                          <input 
                            type="radio" 
                            name="deliveryType" 
                            checked={deliveryType === 'pickup'} 
                            onChange={() => setDeliveryType('pickup')}
                            style={{ display: 'none' }}
                          />
                          🥡 Retirar local
                        </label>
                      </div>

                      {/* Delivery Address */}
                      {deliveryType === 'delivery' && (
                        <>
                          <div style={{ 
                            background: '#eef2f3', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            marginBottom: '15px', 
                            border: '1px solid #d1d5db',
                            textAlign: 'center' 
                          }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '6px' }}>
                              📍 Coordenadas de Entrega:
                            </div>
                            {latitude && longitude ? (
                              <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold' }}>
                                {gettingLocation ? 'Obteniendo GPS...' : 'Ubicación GPS no obtenida'}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={requestGeoLocation}
                              disabled={gettingLocation}
                              style={{
                                marginTop: '8px',
                                padding: '6px 12px',
                                background: 'var(--primary-red)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              {latitude && longitude ? 'Actualizar Ubicación' : '📍 Dar Permiso de Ubicación'}
                            </button>
                          </div>

                          <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontSize: '0.9rem', color: '#333', fontWeight: 'bold' }}>Dirección de Entrega</label>
                            <textarea 
                              className="form-control" 
                              placeholder="Calle, número de casa, referencias..."
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              required
                              style={{ fontSize: '0.95rem', height: '60px', resize: 'none' }}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {mozoIdParam && (
                    <div style={{ marginBottom: '15px', padding: '8px 12px', background: '#fff9db', border: '1px solid #ffe3e3', borderRadius: '8px', fontSize: '0.85rem', color: '#d9480f', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d9480f' }}></span>
                      Tu pedido se enviará al mozo: <strong>{mozoName}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ fontWeight: 'bold', color: '#333' }}>Total a pagar:</span>
                    <span className="text-red" style={{ fontSize: '1.6rem', fontWeight: 'bold', fontFamily: 'Oswald' }}>
                      Gs. {cartTotal.toLocaleString()}
                    </span>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '15px', borderRadius: '8px', fontSize: '1.2rem' }}
                  >
                    Confirmar y Enviar Comanda
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customizer Modal */}
      {customizingProduct && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.2)', animation: 'fadeInDown 0.3s ease-out', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Header / Product Image & Name */}
            <div style={{ position: 'relative', height: '160px', overflow: 'hidden', background: '#f5f5f5' }}>
              <img src={formatImageUrl(customizingProduct.imageUrl)} alt={customizingProduct.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))' }}></div>
              <button 
                type="button"
                onClick={() => setCustomizingProduct(null)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
              >
                <X size={18} />
              </button>
              <div style={{ position: 'absolute', bottom: '15px', left: '20px', color: '#fff', zIndex: 5, paddingRight: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'Oswald', color: 'white' }}>{customizingProduct.title}</h3>
                  {selectedMeatOption && (
                    <span style={{ 
                      backgroundColor: 'var(--secondary-yellow)', 
                      color: '#000',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      fontFamily: 'Oswald',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                      {selectedMeatOption}
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.2 }}>{customizingProduct.description}</p>
              </div>
            </div>

            {/* Customize Content */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Meat Selection (Carne, Pollo, Mixto) */}
              {(() => {
                const desc = (customizingProduct.description || '').toLowerCase();
                const title = (customizingProduct.title || '').toLowerCase();
                const hasMeatOption = desc.includes('carne o pollo') || title.includes('carne o pollo') || desc.includes('mixto') || title.includes('mixto') || title.includes('mixteado');
                if (hasMeatOption) {
                  return (
                    <div style={{ marginBottom: '25px' }}>
                      <h4 style={{ fontSize: '1.05rem', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '12px', color: '#333', fontWeight: 'bold' }}>Opción de Carne</h4>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {(['Carne', 'Pollo', 'Mixto'] as const).map(option => {
                          const isSelected = selectedMeatOption === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSelectedMeatOption(option)}
                              style={{
                                flex: 1,
                                padding: '10px 15px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: isSelected ? 'var(--secondary-yellow)' : '#000',
                                color: isSelected ? '#000' : '#fff',
                                fontWeight: 'bold',
                                fontFamily: 'Oswald',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center',
                                boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Part 1: Sin Ingredientes (Exclusión) */}
              {getRemovableIngredients(customizingProduct).length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ fontSize: '1.05rem', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '12px', color: '#333', fontWeight: 'bold' }}>Quitar Ingredientes</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px' }}>
                    {getRemovableIngredients(customizingProduct).map(ing => {
                      const isRemoved = selectedRemovedIngredients.includes(ing);
                      return (
                        <label 
                          key={ing}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: isRemoved ? '#fff0f0' : '#f8f9fa',
                            border: `1px solid ${isRemoved ? 'var(--primary-red)' : '#e9ecef'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: isRemoved ? 'var(--primary-red)' : '#495057',
                            fontWeight: isRemoved ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isRemoved}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRemovedIngredients(prev => [...prev, ing]);
                              } else {
                                setSelectedRemovedIngredients(prev => prev.filter(item => item !== ing));
                              }
                            }}
                            style={{ accentColor: 'var(--primary-red)' }}
                          />
                          Sin {ing}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Part 2: Agregados (Extras) */}
              <div>
                <h4 style={{ fontSize: '1.05rem', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '12px', color: '#333', fontWeight: 'bold' }}>Agregados (Opcional)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px' }}>
                  {[
                    { name: 'Huevo', price: 4000 },
                    { name: 'Bacon', price: 4000 },
                    { name: 'Cebolla', price: 4000 },
                    { name: 'Queso Cheddar', price: 4000 },
                    { name: 'Queso Catupiry', price: 4000 },
                    { name: 'Pepinillos', price: 4000 },
                    { name: 'Tomate', price: 2000 },
                    { name: 'Lechuga', price: 2000 },
                    { name: 'Carne Burger', price: 5000 },
                    { name: 'Carne de Lomito', price: 10000 }
                  ].map(extra => {
                    const isSelected = selectedExtras.some(e => e.name === extra.name);
                    return (
                      <label 
                        key={extra.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: isSelected ? '#e8f5e9' : '#f8f9fa',
                          border: `1px solid ${isSelected ? '#2e7d32' : '#e9ecef'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#495057',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExtras(prev => [...prev, extra]);
                            } else {
                              setSelectedExtras(prev => prev.filter(item => item.name !== extra.name));
                            }
                          }}
                          style={{ accentColor: '#2e7d32' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{extra.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#2e7d32', fontWeight: 'bold' }}>+ Gs. {extra.price.toLocaleString()}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer / Total and Submit */}
            <div style={{ padding: '15px 20px', borderTop: '1px solid #eee', background: '#fafafa', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: '100px' }}>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Subtotal</div>
                <div className="text-red" style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'Oswald', lineHeight: '1.1' }}>
                  Gs. {(
                    customizingProduct.price + 
                    selectedExtras.reduce((sum, e) => sum + e.price, 0)
                  ).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end', minWidth: '180px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', flex: 1, textAlign: 'center' }}
                  onClick={() => setCustomizingProduct(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 'bold', flex: '1.5', textAlign: 'center' }}
                  onClick={() => addCustomizedToCart(customizingProduct, selectedRemovedIngredients, selectedExtras)}
                >
                  Agregar al Pedido
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Modal (Copied from original, keeps branding) */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ color: 'var(--primary-red)', marginBottom: '20px' }}>Editar Producto</h2>
            <form onSubmit={handleSaveProduct}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ alignSelf: 'flex-start' }}>Foto del Producto</label>
                <div style={{ 
                  marginBottom: '15px', 
                  width: '130px', 
                  height: '160px', 
                  background: '#eee', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden', 
                  position: 'relative',
                  border: '1px solid #ddd',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
                }}>
                  {editingProduct.imageUrl ? (
                    <img 
                      src={formatImageUrl(editingProduct.imageUrl)} 
                      style={{ 
                        height: '100%', 
                        width: '100%', 
                        objectFit: 'cover', 
                        transform: `scale(${editingProduct.imageZoom || 1})`,
                        transition: 'transform 0.1s'
                      }} 
                      alt="Preview" 
                    />
                  ) : (
                    <div style={{ color: '#aaa', textAlign: 'center' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block' }}>🍔</span>
                      <span style={{ fontSize: '0.8rem' }}>Sin Foto (Solo Título)</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '15px', textAlign: 'center' }}>
                  Medida recomendada: <strong>600 × 600 px (1:1)</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ flex: 1 }} />
                  {editingProduct.imageUrl && (
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ backgroundColor: 'var(--primary-red)', color: 'white', fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '', imageZoom: 1 })}
                    >
                      Eliminar Foto
                    </button>
                  )}
                </div>
                {editingProduct.imageUrl && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Zoom: {(editingProduct.imageZoom || 1).toFixed(2)}x</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.05" 
                      value={editingProduct.imageZoom || 1} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, imageZoom: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--primary-red)' }}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Título</label>
                <input type="text" className="form-control" value={editingProduct.title} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input type="text" className="form-control" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Precio (Gs.)</label>
                <input type="number" className="form-control" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingProduct(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Banner */}
      {editingHero && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--primary-red)', marginBottom: '20px', fontFamily: 'Oswald' }}>Editar Banner Principal</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveHeroData(editingHero);
              setHero(editingHero);
              setEditingHero(null);
            }}>
              <div className="form-group">
                <label>Título (Texto Blanco)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingHero.titleWhite} 
                  onChange={e => setEditingHero({...editingHero, titleWhite: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Título (Texto Rojo)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingHero.titleRed} 
                  onChange={e => setEditingHero({...editingHero, titleRed: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Subtítulo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editingHero.subtitle} 
                  onChange={e => setEditingHero({...editingHero, subtitle: e.target.value})} 
                />
              </div>

              <div style={{ margin: '20px 0', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <h4 style={{ fontFamily: 'Oswald', marginBottom: '10px' }}>Imágenes del Carrusel ({ (editingHero.banners || ['BANNER1.png', 'BANNER2.jpg', 'BANNER3.jpg']).length })</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {(editingHero.banners || ['BANNER1.png', 'BANNER2.jpg', 'BANNER3.jpg']).map((b, index) => {
                    const bUrl = typeof b === 'string' ? b : b.url;
                    const bZoom = typeof b === 'string' ? 1 : b.zoom || 1;
                    const bFitMode = typeof b === 'string' ? 'cover' : b.fitMode || 'cover';
                    
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8f9fa', padding: '12px', borderRadius: '10px', border: '1px solid #eee' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: '180px', 
                            height: '110px', 
                            minWidth: '180px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            background: '#222', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '1px solid #ddd',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                          }}>
                            <img 
                              src={formatImageUrl(bUrl)} 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: bFitMode, 
                                transform: `scale(${bZoom})`,
                                transition: 'transform 0.1s' 
                              }} 
                              alt="Preview" 
                            />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '6px', textAlign: 'center', width: '100%' }}>
                            Medida rec.: <strong>{bFitMode === 'cover' ? '1920×750 px' : '1920×1080 px'}</strong>
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px', wordBreak: 'break-all', fontWeight: 'bold' }}>
                            {bUrl.startsWith('data:') ? 'Imagen Subida (Base64)' : bUrl}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '60px' }}>Zoom: {bZoom.toFixed(2)}x</span>
                            <input 
                              type="range" 
                              min="1" 
                              max="3" 
                              step="0.05" 
                              value={bZoom} 
                              onChange={(e) => {
                                const newZoom = Number(e.target.value);
                                const newBanners = [...(editingHero.banners || ['BANNER1.png', 'BANNER2.jpg', 'BANNER3.jpg'])];
                                if (typeof b === 'string') {
                                  newBanners[index] = { url: b, zoom: newZoom, fitMode: 'cover' };
                                } else {
                                  newBanners[index] = { ...b, zoom: newZoom };
                                }
                                setEditingHero({ ...editingHero, banners: newBanners });
                              }}
                              style={{ flex: 1, accentColor: 'var(--primary-red)' }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '60px' }}>Encuadre:</span>
                            <select
                              value={bFitMode}
                              onChange={(e) => {
                                const newFit = e.target.value as 'cover' | 'contain';
                                const newBanners = [...(editingHero.banners || ['BANNER1.png', 'BANNER2.jpg', 'BANNER3.jpg'])];
                                if (typeof b === 'string') {
                                  newBanners[index] = { url: b, zoom: bZoom, fitMode: newFit };
                                } else {
                                  newBanners[index] = { ...b, fitMode: newFit };
                                }
                                setEditingHero({ ...editingHero, banners: newBanners });
                              }}
                              style={{ 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                border: '1px solid #ccc',
                                background: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="cover">Escalar (Llenar)</option>
                              <option value="contain">Encuadrar (Ver Completa)</option>
                            </select>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            const newBanners = (editingHero.banners || ['BANNER1.png', 'BANNER2.jpg', 'BANNER3.jpg']).filter((_, i) => i !== index);
                            setEditingHero({ ...editingHero, banners: newBanners });
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--primary-red)', cursor: 'pointer', padding: '5px' }}
                          title="Eliminar Foto"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '15px' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: '2px dashed #ccc', 
                    background: '#fafafa', 
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#666'
                  }}>
                    <Upload size={16} /> Agregar Foto de Banner
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file, 1920, 1080, 0.7);
                            const newBanners = [...(editingHero.banners || ['BANNER1.png', 'BANNER2.jpg', 'BANNER3.jpg']), { url: compressed, zoom: 1, fitMode: 'cover' as const }];
                            setEditingHero({ ...editingHero, banners: newBanners });
                          } catch (err) {
                            console.error('Error compressing banner:', err);
                          }
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Banner</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingHero(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Mozo Logout PIN Modal */}
      {showLogoutPinModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(5px)',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e1e1e 0%, #121212 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            padding: '30px 24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            color: 'white',
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif'
          }}>
            <h3 style={{ fontFamily: 'Oswald', fontSize: '1.5rem', marginBottom: '15px', color: 'var(--secondary-yellow)' }}>
              CERRAR SESIÓN DE MOZO
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '20px' }}>
              Ingrese su PIN de seguridad de Mozo para confirmar el cierre de sesión de <strong>{loggedMozo?.name}</strong>.
            </p>

            {logoutPinError && (
              <div style={{
                background: 'rgba(218, 37, 29, 0.2)',
                border: '1px solid var(--primary-red)',
                borderRadius: '8px',
                color: '#ff8787',
                padding: '10px',
                fontSize: '0.8rem',
                marginBottom: '15px'
              }}>
                ⚠️ {logoutPinError}
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              if (logoutPinInput === loggedMozo?.code) {
                localStorage.removeItem('talapa_logged_mozo_id');
                setLoggedMozo(null);
                setMozoName('');
                setShowLogoutPinModal(false);
              } else {
                setLogoutPinError('PIN incorrecto. Intente nuevamente.');
              }
            }}>
              <input
                type="password"
                placeholder="Ingrese PIN"
                value={logoutPinInput}
                onChange={e => setLogoutPinInput(e.target.value)}
                required
                autoFocus
                maxLength={6}
                style={{
                  backgroundColor: '#2a2a2a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  letterSpacing: '5px',
                  width: '100%',
                  marginBottom: '20px'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutPinModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#475569',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
        @keyframes fadeInDown {
          from { transform: translate(-50%, -30px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .btn-floating:hover {
          transform: scale(1.1) translateY(-2px);
        }
      `}</style>
    </div>
  );
};
