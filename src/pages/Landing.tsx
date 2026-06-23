import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts, getHeroData, getEditMode, saveProducts, getMozos, addQROrder } from '../store';
import type { Product, HeroData, QRWaitOrder, OrderItem, Mozo } from '../types';
import { ShoppingBag, Plus, Minus, Trash2, X, Check } from 'lucide-react';

const formatImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    return `./${url.substring(1)}`;
  }
  return `./${url}`;
};

export const Landing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [hero, setHero] = useState<HeroData>(getHeroData());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // QR and Cart States
  const mozoIdParam = searchParams.get('mozoId') || '';
  const mesaParam = searchParams.get('mesa') || '';
  const [mozoName, setMozoName] = useState('');
  const [loggedMozo, setLoggedMozo] = useState<Mozo | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(mesaParam);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);

  // Delivery States - Securely enforce delivery/takeout mode for external clients
  const hasTableSession = !!mozoIdParam || !!mesaParam || !!localStorage.getItem('talapa_logged_mozo_id');
  const deliveryMode = !hasTableSession;
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    setProducts(getProducts());
    setIsEditMode(getEditMode());
    
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
  }, [mozoIdParam]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId) {
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

    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity
    }));

    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const orderMozoId = deliveryMode ? 'online' : (mozoIdParam || loggedMozo?.id || 'direct');
    const orderMozoName = deliveryMode ? 'CLIENTE (ONLINE)' : (mozoName || loggedMozo?.name || 'Ninguno');
    const finalTableNumber = deliveryMode ? (deliveryType === 'delivery' ? 'DELIVERY' : 'RETIRO') : tableNumber;

    const newOrder: QRWaitOrder = {
      id: Date.now().toString(),
      mozoId: orderMozoId,
      mozoName: orderMozoName,
      tableNumber: finalTableNumber,
      items: orderItems,
      total: total,
      status: 'pending',
      date: new Date().toISOString(),
      printed: false,
      ...(deliveryMode ? {
        deliveryDetails: {
          customerName,
          phone,
          type: deliveryType,
          address: deliveryType === 'delivery' ? deliveryAddress : undefined
        }
      } : {})
    };

    addQROrder(newOrder);
    setCart([]);
    setIsCartOpen(false);
    setOrderSentSuccess(true);
    setTimeout(() => {
      setOrderSentSuccess(false);
    }, 4000);
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const clasica = products.filter(p => p.category === 'clasica');
  const extras = products.filter(p => p.category === 'extras');
  const salsas = products.filter(p => p.category === 'salsas');

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '80px' }}>
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
          gap: '10px',
          zIndex: 99
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
          gap: '15px',
          zIndex: 99
        }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary-yellow)', animation: 'pulse 1.5s infinite' }}></span>
          SESIÓN MOZO: {loggedMozo.name.toUpperCase()} (TOMA DE PEDIDOS DIRECTA)
          <button 
            onClick={() => {
              localStorage.removeItem('talapa_logged_mozo_id');
              setLoggedMozo(null);
              setMozoName('');
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

      <nav style={{ background: 'var(--primary-red)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'white', fontFamily: 'Oswald', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px' }}>TALAPA SMASH BURGER</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {mozoIdParam && (
            <Link to={`/mozo?mozoId=${mozoIdParam}`} style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.9rem', border: '1px solid white', padding: '5px 10px', borderRadius: '4px' }}>
              Portal Mozo
            </Link>
          )}
          {!mozoIdParam && loggedMozo && (
            <Link to={`/mozo?mozoId=${loggedMozo.id}`} style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.9rem', border: '1px solid white', padding: '5px 10px', borderRadius: '4px' }}>
              Ver mis pedidos
            </Link>
          )}
          {!loggedMozo && !mozoIdParam && (
            <Link to="/login" style={{ color: 'white', textDecoration: 'none', opacity: 0.8, fontSize: '0.9rem' }}>Ingresar Usuario</Link>
          )}
        </div>
      </nav>

      <div className="hero" style={{ backgroundImage: `url(${formatImageUrl(hero.imageUrl)})`, height: '50vh', minHeight: '350px' }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h2 className="text-yellow" style={{ fontSize: '1.5rem', marginBottom: '10px', letterSpacing: '2px' }}>{hero.subtitle}</h2>
          <h1>{hero.titleWhite} <br /><span className="text-red">{hero.titleRed}</span></h1>
          <a href="#menu" className="btn btn-primary" style={{ marginTop: '20px' }}>Ver Menú</a>
        </div>
        {isEditMode && (
          <button className="edit-badge" onClick={() => alert('Para editar banners ingrese al Panel de Admin')}>Editar Banner</button>
        )}
      </div>

      <div id="menu" className="container" style={{ padding: '40px 20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--primary-red)', fontSize: '2.5rem', borderBottom: '3px solid var(--primary-red)', paddingBottom: '10px', display: 'inline-block', left: '50%', transform: 'translateX(-50%)', position: 'relative' }}>Línea Clásica</h2>
        
        <div className="grid grid-cols-2" style={{ marginTop: '20px' }}>
          {clasica.map(product => (
            <div key={product.id} className="editable-element" style={{ display: 'flex', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.06)', transition: 'transform 0.3s' }}>
              {isEditMode && <button className="edit-badge" onClick={() => handleEditClick(product)}>Editar</button>}
              <div style={{ width: '40%', minWidth: '120px' }}>
                <img src={formatImageUrl(product.imageUrl)} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '20px', width: '60%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ marginBottom: '5px', fontSize: '1.3rem', color: '#111' }}>{product.title}</h3>
                  <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.3', marginBottom: '10px' }}>{product.description}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          ))}
        </div>

        {extras.length > 0 && (
          <>
            <h2 style={{ textAlign: 'center', margin: '50px auto 30px', color: 'var(--secondary-yellow)', fontSize: '2.3rem', borderBottom: '3px solid var(--secondary-yellow)', paddingBottom: '10px', display: 'block', maxWidth: '200px' }}>Acompañamientos</h2>
            <div className="grid grid-cols-3">
              {extras.map(product => (
                <div key={product.id} className="editable-element" style={{ background: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {isEditMode && <button className="edit-badge" onClick={() => handleEditClick(product)}>Editar</button>}
                  <div>
                    <img src={formatImageUrl(product.imageUrl)} alt={product.title} style={{ width: '100%', height: '140px', objectFit: 'contain', marginBottom: '15px' }} />
                    <h4 style={{ fontSize: '1.15rem', color: '#111', marginBottom: '5px' }}>{product.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>{product.description}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span className="text-red" style={{ fontWeight: 'bold', fontSize: '1.2rem', fontFamily: 'Oswald' }}>Gs. {product.price.toLocaleString()}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '0.85rem', borderRadius: '6px' }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {salsas.length > 0 && (
          <>
            <h2 style={{ textAlign: 'center', margin: '50px auto 30px', color: '#222', fontSize: '2rem', borderBottom: '3px solid #222', paddingBottom: '5px', display: 'block', maxWidth: '150px' }}>Salsas</h2>
            <div className="grid grid-cols-3">
              {salsas.map(product => (
                <div key={product.id} className="editable-element" style={{ background: 'white', borderRadius: '12px', padding: '15px', textAlign: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {isEditMode && <button className="edit-badge" onClick={() => handleEditClick(product)}>Editar</button>}
                  <div>
                    <img src={formatImageUrl(product.imageUrl)} alt={product.title} style={{ width: '100%', height: '100px', objectFit: 'contain', marginBottom: '10px' }} />
                    <h4 style={{ fontSize: '1.1rem', color: '#111' }}>{product.title}</h4>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span className="text-red" style={{ fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'Oswald' }}>Gs. {product.price.toLocaleString()}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="btn btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px' }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
                    key={item.product.id}
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
                      <h4 style={{ fontSize: '1rem', color: '#111', margin: '0 0 5px 0' }}>{item.product.title}</h4>
                      <div className="text-red" style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                        Gs. {item.product.price.toLocaleString()}
                      </div>
                    </div>
                    {/* Quantity selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f5f5f5', padding: '5px', borderRadius: '20px' }}>
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', minWidth: '15px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {/* Delete button */}
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
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

      {/* Edit Modal (Copied from original, keeps branding) */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ color: 'var(--primary-red)', marginBottom: '20px' }}>Editar Producto</h2>
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label>Foto del Producto</label>
                <div style={{ marginBottom: '10px', width: '100%', height: '150px', background: '#eee', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={formatImageUrl(editingProduct.imageUrl)} style={{ height: '100%', objectFit: 'cover' }} alt="Preview" />
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} />
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

      {/* Animation Styles */}
      <style>{`
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
