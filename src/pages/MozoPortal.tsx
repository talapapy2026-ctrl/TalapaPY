import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getMozos, getQROrders, updateQROrderStatus } from '../store';
import type { Mozo, QRWaitOrder } from '../types';
import { Clock, Check, LogOut, RefreshCw, ChefHat, LayoutGrid, PlusCircle, ArrowLeft, Printer, Bluetooth } from 'lucide-react';
import { 
  connectBluetoothPrinter, 
  disconnectBluetoothPrinter, 
  getConnectedPrinterName, 
  printBluetoothTableAccount 
} from '../utils/bluetoothPrinter';

export const MozoPortal: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mozos, setMozos] = useState<Mozo[]>([]);
  const [activeMozo, setActiveMozo] = useState<Mozo | null>(null);
  const [orders, setOrders] = useState<QRWaitOrder[]>([]);
  const [selectedMozoId, setSelectedMozoId] = useState('');
  
  // Selected table in the grid
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Bluetooth printer state
  const [connectedPrinter, setConnectedPrinter] = useState<string | null>(getConnectedPrinterName());

  useEffect(() => {
    const handlePrinterChange = () => {
      setConnectedPrinter(getConnectedPrinterName());
    };
    window.addEventListener('bluetooth_printer_changed', handlePrinterChange);
    return () => {
      window.removeEventListener('bluetooth_printer_changed', handlePrinterChange);
    };
  }, []);

  const handleTogglePrinter = async () => {
    if (connectedPrinter) {
      disconnectBluetoothPrinter();
      alert("Impresora desconectada.");
    } else {
      try {
        const name = await connectBluetoothPrinter();
        alert(`Conectado exitosamente a: ${name}`);
      } catch (err: any) {
        alert(`Error al conectar: ${err.message || err}`);
      }
    }
  };

  // Stopwatch ticking state
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const formatTimer = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    if (diffMs <= 0) return '00:00';
    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;
    
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    
    if (hours > 0) {
      return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  // Load mozos and auto-login if mozoId param exists
  useEffect(() => {
    const list = getMozos();
    setMozos(list);

    const mozoId = searchParams.get('mozoId') || localStorage.getItem('talapa_logged_mozo_id') || '';
    if (mozoId && list.length > 0) {
      const match = list.find(m => m.id === mozoId);
      if (match) {
        setActiveMozo(match);
        setSelectedMozoId(match.id);
        localStorage.setItem('talapa_logged_mozo_id', match.id);
      }
    }

    refreshOrders();

    const handleStorage = () => {
      refreshOrders();
      const updatedMozos = getMozos();
      setMozos(updatedMozos);
    };
    window.addEventListener('storage', handleStorage);

    // Auto refresh every 3 seconds for fast reactivity
    const interval = setInterval(refreshOrders, 3000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [searchParams]);

  const refreshOrders = () => {
    setOrders(getQROrders());
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMozoId) return;
    const match = mozos.find(m => m.id === selectedMozoId);
    if (match) {
      setActiveMozo(match);
      setSearchParams({ mozoId: match.id });
      localStorage.setItem('talapa_logged_mozo_id', match.id);
    }
  };

  const handleLogout = () => {
    setActiveMozo(null);
    setSelectedMozoId('');
    localStorage.removeItem('talapa_logged_mozo_id');
    setSearchParams({});
    setSelectedTable(null);
  };

  const handleUpdateStatus = (orderId: string, status: QRWaitOrder['status']) => {
    updateQROrderStatus(orderId, status);
    refreshOrders();
  };

  const handlePrintTableAccount = (table: string, mozoName: string, tableActiveOrders: QRWaitOrder[]) => {
    const consolidatedItems: Record<string, { title: string; quantity: number; price: number }> = {};
    tableActiveOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.productId || item.title;
        if (consolidatedItems[key]) {
          consolidatedItems[key].quantity += item.quantity;
        } else {
          consolidatedItems[key] = {
            title: item.title,
            quantity: item.quantity,
            price: item.price
          };
        }
      });
    });

    const grandTotal = tableActiveOrders.reduce((sum, o) => sum + o.total, 0);

    // Try printing via Bluetooth first if connected
    if (connectedPrinter) {
      printBluetoothTableAccount(table, mozoName, Object.values(consolidatedItems))
        .then(success => {
          if (!success) {
            alert("Error al imprimir por Bluetooth, usando el diálogo del navegador.");
            triggerIframePrint(table, mozoName, consolidatedItems, grandTotal);
          }
        });
      return;
    }

    triggerIframePrint(table, mozoName, consolidatedItems, grandTotal);
  };

  const triggerIframePrint = (
    table: string, 
    mozoName: string, 
    consolidatedItems: Record<string, { title: string; quantity: number; price: number }>, 
    grandTotal: number
  ) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Precuenta - ${table}</title>
            <style>
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 280px; 
                margin: 0 auto; 
                padding: 10px; 
                font-size: 13px; 
                color: black; 
              }
              .center { text-align: center; }
              .divider { border-top: 1px dashed black; margin: 8px 0; }
              .bold { font-weight: bold; }
              .right { text-align: right; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 3px 0; }
            </style>
          </head>
          <body>
            <h2 class="center" style="margin:0 0 5px 0;">TALAPA BURGER</h2>
            <h3 class="center" style="margin:0 0 5px 0;">PRECUENTA</h3>
            <div class="divider"></div>
            <div><strong>FECHA:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>MESA:</strong> ${table.toUpperCase()}</div>
            <div><strong>MOZO:</strong> ${mozoName}</div>
            <div class="divider"></div>
            <table>
              <thead>
                <tr style="border-bottom: 1px dashed black;">
                  <th align="left">CANT</th>
                  <th align="left">PRODUCTO</th>
                  <th align="right">SUBT</th>
                </tr>
              </thead>
              <tbody>
                ${Object.values(consolidatedItems).map(item => `
                  <tr>
                    <td>${item.quantity}</td>
                    <td>${item.title}</td>
                    <td align="right">${(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="divider"></div>
            <div class="right bold" style="font-size: 15px;">TOTAL: Gs. ${grandTotal.toLocaleString()}</div>
            <div class="divider"></div>
            <h3 class="center" style="margin:10px 0 0 0;">¡GRACIAS POR SU VISITA!</h3>
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  const handleCloseTable = (tableActiveOrders: QRWaitOrder[]) => {
    if (!window.confirm('¿Está seguro de cerrar la cuenta?')) return;
    tableActiveOrders.forEach(order => {
      updateQROrderStatus(order.id, 'closed');
    });
    refreshOrders();
    setSelectedTable(null);
    alert('Mesa cerrada y cuenta restablecida a cero.');
  };

  // Filter orders for the active Mozo
  const mozoOrders = orders.filter(o => o.mozoId === activeMozo?.id);
  const activeOrders = mozoOrders.filter(o => o.status === 'pending' || o.status === 'accepted' || o.status === 'ready' || o.status === 'completed');

  // Predefined standard tables list
  const defaultTables = activeMozo?.assignedTables && activeMozo.assignedTables.length > 0
    ? activeMozo.assignedTables
    : [
        'Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4',
        'Mesa 5', 'Mesa 6', 'Mesa 7', 'Mesa 8'
      ];

  // Dynamically extract any custom tables present in active orders that aren't in default list
  const activeCustomTables = Array.from(
    new Set(
      activeOrders
        .map(o => o.tableNumber)
        .filter(t => !defaultTables.includes(t))
    )
  );

  // Combine standard and custom tables for the grid
  const allTables = [...defaultTables, ...activeCustomTables];

  // Helper to check if a table has active orders
  const getTableActiveOrders = (table: string) => {
    return activeOrders.filter(o => o.tableNumber.toLowerCase() === table.toLowerCase());
  };

  const handleTableClick = (table: string) => {
    setSelectedTable(table);
  };

  if (!activeMozo) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e1e1e 0%, #121212 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px 30px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--primary-red)',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            <ChefHat size={35} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Oswald', fontSize: '2rem', marginBottom: '10px', color: 'var(--secondary-yellow)' }}>PORTAL DE MOZOS</h1>
          <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '30px' }}>Inicie sesión para gestionar los pedidos asignados a sus mesas.</p>

          {mozos.length === 0 ? (
            <div style={{ padding: '15px', background: 'rgba(218, 37, 29, 0.15)', borderRadius: '8px', color: '#ff8787', fontSize: '0.85rem' }}>
              No hay mozos creados en el sistema. Pida al administrador que cree su usuario en el Panel.
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Seleccione su Nombre</label>
                <select
                  className="form-control"
                  style={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                  value={selectedMozoId}
                  onChange={(e) => setSelectedMozoId(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {mozos.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1.1rem' }}
              >
                Ingresar al Portal
              </button>
            </form>
          )}
          <div style={{ marginTop: '20px' }}>
            <Link to="/" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.85rem' }}>← Volver a la Tienda</Link>
          </div>
        </div>
      </div>
    );
  }

  // Details of orders for currently selected table
  const selectedTableOrders = selectedTable ? getTableActiveOrders(selectedTable) : [];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f6f9',
      fontFamily: 'Inter, sans-serif',
      color: '#333',
      paddingBottom: '40px'
    }}>
      <div style={{ display: 'none' }}>{tick}</div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #da251d 0%, #b81b14 100%)',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Portal de Servicio</span>
            <h1 style={{ fontFamily: 'Oswald', fontSize: '1.5rem', margin: 0, color: 'var(--secondary-yellow)' }}>
              {activeMozo.name.toUpperCase()}
            </h1>
          </div>
          
          <button
            onClick={handleTogglePrinter}
            style={{
              background: connectedPrinter ? '#2e7d32' : 'rgba(255,255,255,0.15)',
              border: connectedPrinter ? '1px solid #4caf50' : '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: connectedPrinter ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none'
            }}
            title={connectedPrinter ? `Conectado a ${connectedPrinter}` : "Conectar Impresora Termica Bluetooth"}
          >
            <Bluetooth size={14} className={connectedPrinter ? "" : "animate-pulse"} />
            {connectedPrinter ? `Termica: ${connectedPrinter.slice(0, 10)}...` : 'Conectar Termica'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '5px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={16} /> Ir al Menú
          </Link>
          <button
            onClick={refreshOrders}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Refrescar"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Table Grid Panel */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
          <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111' }}>
            <LayoutGrid size={18} color="var(--primary-red)" />
            CUADRÍCULA DE MESAS
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '12px',
            marginBottom: '10px'
          }}>
            {allTables.map(table => {
              const tableActiveOrders = getTableActiveOrders(table);
              const isActive = tableActiveOrders.length > 0;
              const isSelected = selectedTable === table;

              return (
                <button
                  key={table}
                  onClick={() => handleTableClick(table)}
                  style={{
                    border: isSelected ? '3px solid #da251d' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: (() => {
                      const hasPending = tableActiveOrders.some(o => o.status === 'pending');
                      const hasAccepted = tableActiveOrders.some(o => o.status === 'accepted');
                      const hasReady = tableActiveOrders.some(o => o.status === 'ready');
                      
                      if (hasPending) {
                        return 'linear-gradient(135deg, #ffeb3b 0%, #fbc02d 100%)'; // Yellow
                      } else if (hasAccepted) {
                        return 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)'; // Blue
                      } else if (hasReady) {
                        return 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'; // Green
                      }
                      return 'linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)'; // Gray
                    })(),
                    color: (() => {
                      const hasPending = tableActiveOrders.some(o => o.status === 'pending');
                      const hasAccepted = tableActiveOrders.some(o => o.status === 'accepted');
                      const hasReady = tableActiveOrders.some(o => o.status === 'ready');
                      
                      if (hasPending) return '#111';
                      if (hasAccepted || hasReady) return 'white';
                      return '#546e7a';
                    })(),
                    boxShadow: (() => {
                      const hasPending = tableActiveOrders.some(o => o.status === 'pending');
                      const hasAccepted = tableActiveOrders.some(o => o.status === 'accepted');
                      const hasReady = tableActiveOrders.some(o => o.status === 'ready');
                      
                      if (hasPending) return '0 4px 12px rgba(251, 192, 45, 0.4)';
                      if (hasAccepted) return '0 4px 12px rgba(33, 150, 243, 0.25)';
                      if (hasReady) return '0 4px 12px rgba(76, 175, 80, 0.3)';
                      return 'none';
                    })(),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <span style={{ fontWeight: 'bold', fontSize: '1.05rem', fontFamily: 'Oswald', letterSpacing: '0.5px' }}>
                    {table}
                  </span>
                  
                  {isActive ? (
                    <>
                      <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(255, 255, 255, 0.25)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        animation: 'pulse 1.5s infinite',
                        color: tableActiveOrders.some(o => o.status === 'pending') ? '#111' : 'inherit'
                      }}>
                        {(() => {
                          const hasPending = tableActiveOrders.some(o => o.status === 'pending');
                          const hasAccepted = tableActiveOrders.some(o => o.status === 'accepted');
                          const hasReady = tableActiveOrders.some(o => o.status === 'ready');
                          
                          if (hasPending) return '⏳ PENDIENTE';
                          if (hasAccepted) return '🍳 EN COCINA';
                          if (hasReady) return '🔔 ¡LISTO!';
                          return `${tableActiveOrders.length} ${tableActiveOrders.length === 1 ? 'Pedido' : 'Pedidos'}`;
                        })()}
                      </span>
                      {(() => {
                        const oldestOrder = tableActiveOrders.reduce((oldest, current) => {
                          return new Date(current.date).getTime() < new Date(oldest.date).getTime() ? current : oldest;
                        }, tableActiveOrders[0]);
                        return oldestOrder ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginTop: '2px'
                          }}>
                            <Clock size={10} />
                            {formatTimer(oldestOrder.date)}
                          </span>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Vacía</span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: '#666', marginTop: '15px', paddingLeft: '5px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #ffeb3b 0%, #fbc02d 100%)' }}></span>
              <span>Nuevos Pedidos (Pendiente)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)' }}></span>
              <span>En Cocina / Preparando</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }}></span>
              <span>Listo / A retirar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)' }}></span>
              <span>Mesa sin consumo</span>
            </div>
          </div>
        </div>

        {/* Selected Table Detail Section */}
        {selectedTable ? (
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>
              <h3 style={{ fontFamily: 'Oswald', fontSize: '1.3rem', margin: 0, color: '#111' }}>
                DETALLE: {selectedTable.toUpperCase()}
              </h3>
              
              <button
                onClick={() => navigate(`/?mozoId=${activeMozo.id}&mesa=${encodeURIComponent(selectedTable)}`)}
                style={{
                  background: '#e3f2fd',
                  color: '#0d47a1',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <PlusCircle size={15} /> Levantar Pedido
              </button>
            </div>

            {selectedTableOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#888' }}>
                <p style={{ fontSize: '0.95rem' }}>Esta mesa no tiene consumos activos actualmente.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Use el botón "Levantar Pedido" superior para cargar una nueva comanda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {(() => {
                  const groups: Record<string, QRWaitOrder[]> = {};
                  selectedTableOrders.forEach(order => {
                    const groupKey = order.subGroup?.trim() || 'General';
                    if (!groups[groupKey]) {
                      groups[groupKey] = [];
                    }
                    groups[groupKey].push(order);
                  });

                  return Object.entries(groups).map(([groupName, groupOrders]) => {
                    const groupTotal = groupOrders.reduce((sum, o) => sum + o.total, 0);
                    return (
                      <div key={groupName} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '15px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px' }}>
                          <h4 style={{ fontFamily: 'Oswald', margin: 0, fontSize: '1rem', color: 'var(--primary-red)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            👤 GRUPO: {groupName.toUpperCase()}
                          </h4>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>
                            Subtotal: Gs. {groupTotal.toLocaleString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {groupOrders.map(order => (
                            <div 
                              key={order.id}
                              style={{
                                background: 'white',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #e2e8f0',
                                borderLeft: `5px solid ${
                                  order.status === 'pending' 
                                    ? '#ffc107' 
                                    : order.status === 'ready' 
                                      ? '#4caf50' 
                                      : '#da251d'
                                }`
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 6px',
                                    borderRadius: '20px',
                                    fontWeight: 'bold',
                                    color: order.status === 'pending' ? '#856404' : '#fff',
                                    backgroundColor: order.status === 'pending' 
                                      ? '#fff3cd' 
                                      : order.status === 'ready' 
                                        ? '#4caf50' 
                                        : order.status === 'completed'
                                          ? '#334155'
                                          : '#da251d',
                                    marginRight: '8px'
                                  }}>
                                    {order.status === 'pending' 
                                      ? 'Pendiente' 
                                      : order.status === 'ready' 
                                        ? '🚨 ¡LISTO!' 
                                        : order.status === 'completed'
                                          ? '✓ Servido'
                                          : 'En Cocina'}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                    Ref: #{order.id.slice(-5)}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                  {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div style={{ marginBottom: '10px' }}>
                                {order.items.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '0.85rem', borderBottom: '1px dashed #e2e8f0' }}>
                                    <span><strong>{item.quantity}x</strong> {item.title}</span>
                                    <span style={{ color: '#555' }}>Gs. {(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  <span>Total Pedido:</span>
                                  <span style={{ color: 'var(--primary-red)' }}>Gs. {order.total.toLocaleString()}</span>
                                </div>
                              </div>

                              <div>
                                {order.status === 'pending' ? (
                                  <div style={{ fontSize: '0.75rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px', background: '#fffbeb', padding: '6px', borderRadius: '4px' }}>
                                    <Clock size={12} /> Esperando aprobación...
                                  </div>
                                ) : order.status === 'completed' ? (
                                  <div style={{ fontSize: '0.75rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', padding: '6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    ✓ Servido
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      handleUpdateStatus(order.id, 'completed');
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '6px',
                                      background: '#2e7d32',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '5px',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    <Check size={14} /> Marcar como Servido
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Group Actions */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/?mozoId=${activeMozo.id}&mesa=${encodeURIComponent(selectedTable)}&subGroup=${encodeURIComponent(groupName)}`)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: '#e8f5e9',
                              color: '#2e7d32',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <PlusCircle size={14} /> Pedir para {groupName}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintTableAccount(`${selectedTable} - ${groupName}`, activeMozo.name, groupOrders)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Printer size={14} /> Imprimir {groupName}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCloseTable(groupOrders)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Check size={14} /> Cerrar {groupName}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Grand Total and Table Actions */}
                {(() => {
                  const grandTotal = selectedTableOrders.reduce((sum, o) => sum + o.total, 0);
                  return (
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px' }}>
                        <span>Total Cuenta Mesa:</span>
                        <span style={{ color: 'var(--primary-red)', fontSize: '1.25rem' }}>Gs. {grandTotal.toLocaleString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => handlePrintTableAccount(selectedTable, activeMozo.name, selectedTableOrders)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: '#0284c7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.95rem'
                          }}
                        >
                          <Printer size={18} /> Imprimir Cuenta
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseTable(selectedTableOrders)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: 'var(--primary-red)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.95rem'
                          }}
                        >
                          <Check size={18} /> Cerrar Mesa
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#888',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
          }}>
            <p>Seleccione una mesa arriba para ver o despachar sus comandas.</p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.9; }
          50% { opacity: 0.6; }
          100% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};
