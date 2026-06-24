import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getSales, 
  addSale, 
  getProducts, 
  setEditMode, 
  getEditMode,
  getMozos,
  addMozo,
  deleteMozo,
  saveMozos,
  getQROrders,
  updateQROrderStatus,
  markOrderAsPrinted,
  getFirebaseUrl
} from '../store';
import type { Sale, Product, Mozo, QRWaitOrder } from '../types';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { Trash2, QrCode, Printer, Check, UserPlus, ShoppingCart, Users, Calendar, Sparkles, Clock, Lock, X, PlusCircle, Bluetooth } from 'lucide-react';
import { 
  connectBluetoothPrinter, 
  disconnectBluetoothPrinter, 
  getConnectedPrinterName, 
  printBluetoothTableAccount, 
  printBluetoothOrder 
} from '../utils/bluetoothPrinter';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  
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

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mozos, setMozos] = useState<Mozo[]>([]);
  const [qrOrders, setQrOrders] = useState<QRWaitOrder[]>([]);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'sales' | 'qr_orders' | 'mozos'>('sales');

  // Date Filters
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hasManuallyFiltered, setHasManuallyFiltered] = useState(false);
  
  // Waiter History Modal state
  const [selectedHistoryMozo, setSelectedHistoryMozo] = useState<Mozo | null>(null);
  const [mozoHistoryStartDate, setMozoHistoryStartDate] = useState('');
  const [mozoHistoryEndDate, setMozoHistoryEndDate] = useState('');
  const [showMozoHistoryModal, setShowMozoHistoryModal] = useState(false);
  
  // Edit mode badge indicator
  const [editModeActive, setEditModeActive] = useState(false);
  const [isCocina, setIsCocina] = useState(false);

  // Kitchen password configuration state
  const [cocinaPasswordSetting, setCocinaPasswordSetting] = useState(() => localStorage.getItem('talapa_cocina_password') || 'cocina');
  const [cocinaPasswordSavedMessage, setCocinaPasswordSavedMessage] = useState('');

  const handleSaveCocinaPassword = () => {
    localStorage.setItem('talapa_cocina_password', cocinaPasswordSetting);
    setCocinaPasswordSavedMessage('Contraseña de cocina actualizada correctamente.');
    setTimeout(() => {
      setCocinaPasswordSavedMessage('');
    }, 4000);
  };

  // New Mozo Fields
  const [newMozoName, setNewMozoName] = useState('');
  const [newMozoCode, setNewMozoCode] = useState('');
  const [newMozoTables, setNewMozoTables] = useState('');
  const [editingTablesMap, setEditingTablesMap] = useState<Record<string, string>>({});
  const [editingPinsMap, setEditingPinsMap] = useState<Record<string, string>>({});
  const [monitoredMozoId, setMonitoredMozoId] = useState('');
  const [selectedMonitoredTable, setSelectedMonitoredTable] = useState<string | null>(null);
  const selectedMonitoredMozo = mozos.find(m => m.id === monitoredMozoId);

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

  // QR Code generator fields
  const [qrMozoId, setQrMozoId] = useState('');
  const [qrTableNumber, setQrTableNumber] = useState('');
  const [qrBaseUrl, setQrBaseUrl] = useState(() => {
    return window.location.origin + window.location.pathname.replace(/\/$/, '');
  });
  const [generatedQR, setGeneratedQR] = useState<{ url: string; scanUrl: string; tableNumber?: string } | null>(null);



  // Track pending orders count for sound alert triggering
  const lastPendingCountRef = useRef(0);

  useEffect(() => {
    // Protect admin panel with session
    const isAdmin = localStorage.getItem('talapa_admin_logged') === 'true';
    const isCoc = localStorage.getItem('talapa_cocina_logged') === 'true';
    
    if (!isAdmin && !isCoc) {
      navigate('/login?role=admin');
      return;
    }
    
    setIsCocina(isCoc);
    if (isCoc) {
      setActiveTab('qr_orders');
    }

    setSales(getSales());
    setProducts(getProducts());
    setEditModeActive(getEditMode());
    setMozos(getMozos());
    
    const initialOrders = getQROrders();
    setQrOrders(initialOrders);
    lastPendingCountRef.current = initialOrders.filter(o => o.status === 'pending').length;

    // Fetch local server IP from our custom Vite middleware
    fetch('/api/ip')
      .then(res => res.json())
      .then(data => {
        if (data.ip && data.ip !== 'localhost') {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const port = window.location.port ? `:${window.location.port}` : '';
            setQrBaseUrl(`http://${data.ip}${port}`);
          }
        }
      })
      .catch(err => console.error('Error fetching server local IP:', err));

    // Reactivity for local storage updates across tabs
    const handleStorage = () => {
      setSales(getSales());
      setMozos(getMozos());
      setProducts(getProducts());
      setEditModeActive(getEditMode());
      
      const updatedOrders = getQROrders();
      setQrOrders(updatedOrders);
      
      const newPending = updatedOrders.filter(o => o.status === 'pending');
      if (newPending.length > lastPendingCountRef.current) {
        playAlertSound();
      }
      lastPendingCountRef.current = newPending.length;
    };
    window.addEventListener('storage', handleStorage);

    // Refresh orders programmatically every 3 seconds to capture local changes
    const interval = setInterval(() => {
      const updatedOrders = getQROrders();
      setQrOrders(updatedOrders);
      
      const newPending = updatedOrders.filter(o => o.status === 'pending');
      if (newPending.length > lastPendingCountRef.current) {
        playAlertSound();
      }
      lastPendingCountRef.current = newPending.length;
      
      // Also update sales in case they changed
      setSales(getSales());
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Automatic day-rollover check (resets to today's date if day changes and user hasn't manually filtered)
  useEffect(() => {
    const checkDateInterval = setInterval(() => {
      if (!hasManuallyFiltered) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        setStartDate(prev => prev !== todayStr ? todayStr : prev);
        setEndDate(prev => prev !== todayStr ? todayStr : prev);
      }
    }, 3000);
    return () => clearInterval(checkDateInterval);
  }, [hasManuallyFiltered]);

  // Web Audio API beep sound generator
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Pitch A5
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3); // beep duration 300ms
    } catch (e) {
      console.log('Audio API error:', e);
    }
  };

  const handleToggleEditMode = () => {
    const newStatus = !editModeActive;
    setEditModeActive(newStatus);
    setEditMode(newStatus);
    alert(`Modo Edición ${newStatus ? 'Activado' : 'Desactivado'}. Vuelve a la página principal para editar.`);
  };

  const handleAddTestSale = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const newSale: Sale = {
      id: Date.now().toString(),
      productId: randomProduct.id,
      date: new Date().toISOString(),
      quantity: 1,
      total: randomProduct.price
    };
    addSale(newSale);
    setSales(getSales());
  };

  // Waiter additions
  const handleAddMozoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMozoName.trim()) return;

    const tablesList = newMozoTables
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const mozo: Mozo = {
      id: Date.now().toString(),
      name: newMozoName,
      code: newMozoCode || '1234',
      createdAt: new Date().toISOString(),
      assignedTables: tablesList
    };
    addMozo(mozo);
    setNewMozoName('');
    setNewMozoCode('');
    setNewMozoTables('');
    setMozos(getMozos());
  };

  const handleSaveTables = (mozoId: string) => {
    const tableString = editingTablesMap[mozoId];
    if (tableString === undefined) return;
    
    const tablesList = tableString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
      
    const updatedMozos = mozos.map(m => {
      if (m.id === mozoId) {
        return {
          ...m,
          assignedTables: tablesList
        };
      }
      return m;
    });
    
    saveMozos(updatedMozos);
    setMozos(updatedMozos);
    
    // Clear editing map for this waiter
    const newMap = { ...editingTablesMap };
    delete newMap[mozoId];
    setEditingTablesMap(newMap);
    alert('Mesas asignadas actualizadas con éxito.');
  };

  const handleSavePin = (mozoId: string) => {
    const pinString = editingPinsMap[mozoId];
    if (pinString === undefined) return;
    
    const cleanPin = pinString.trim();
    if (!cleanPin) {
      alert('El PIN no puede estar vacío.');
      return;
    }
    
    const updatedMozos = mozos.map(m => {
      if (m.id === mozoId) {
        return {
          ...m,
          code: cleanPin
        };
      }
      return m;
    });
    
    saveMozos(updatedMozos);
    setMozos(updatedMozos);
    
    const newMap = { ...editingPinsMap };
    delete newMap[mozoId];
    setEditingPinsMap(newMap);
    alert('PIN de seguridad actualizado con éxito.');
  };

  const handleDeleteMozo = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este mozo?')) {
      deleteMozo(id);
      setMozos(getMozos());
      if (qrMozoId === id) setGeneratedQR(null);
    }
  };

  const handleDeleteTable = (mozoId: string, tableToDelete: string) => {
    if (!window.confirm(`¿Está seguro de eliminar la ${tableToDelete}?`)) return;
    
    const chosenMozo = mozos.find(m => m.id === mozoId);
    if (!chosenMozo) return;

    const updatedTables = (chosenMozo.assignedTables || []).filter(
      t => t.toLowerCase() !== tableToDelete.toLowerCase()
    );
    
    const updatedMozos = mozos.map(m => {
      if (m.id === mozoId) {
        return {
          ...m,
          assignedTables: updatedTables
        };
      }
      return m;
    });
    
    saveMozos(updatedMozos);
    setMozos(updatedMozos);
    
    if (selectedMonitoredTable === tableToDelete) {
      setSelectedMonitoredTable(null);
    }
  };

  // QR Code generation
  const handleGenerateQR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrMozoId || !qrTableNumber) return;
    
    const chosenMozo = mozos.find(m => m.id === qrMozoId);
    if (!chosenMozo) return;

    const cleanBaseUrl = qrBaseUrl.trim().replace(/\/$/, '');
    const cleanTable = /^\d+$/.test(qrTableNumber.trim()) ? `Mesa ${qrTableNumber.trim()}` : qrTableNumber.trim();
    const scanUrl = `${cleanBaseUrl}/#/?mozoId=${chosenMozo.id}&mesa=${encodeURIComponent(cleanTable)}`;
    // Generate QR Image using API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scanUrl)}`;
    
    setGeneratedQR({
      url: qrApiUrl,
      scanUrl: scanUrl,
      tableNumber: cleanTable
    });

    // Dynamically assign this table to the mozo's assignedTables if not already present
    const currentTables = chosenMozo.assignedTables || [];
    if (!currentTables.some(t => t.toLowerCase() === cleanTable.toLowerCase())) {
      const updatedTables = [...currentTables, cleanTable];
      const updatedMozos = mozos.map(m => {
        if (m.id === chosenMozo.id) {
          return {
            ...m,
            assignedTables: updatedTables
          };
        }
        return m;
      });
      saveMozos(updatedMozos);
      setMozos(updatedMozos);
    }
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
    setQrOrders(getQROrders());
    setSelectedMonitoredTable(null);
    alert('Mesa cerrada y cuenta restablecida a cero.');
  };

  // Print comanda logic
  // Print comanda logic
  const handlePrintOrder = (order: QRWaitOrder) => {
    markOrderAsPrinted(order.id);
    setQrOrders(getQROrders());

    // Try printing via Bluetooth first if connected
    if (connectedPrinter) {
      printBluetoothOrder(order)
        .then(success => {
          if (!success) {
            alert("Error al imprimir por Bluetooth, usando el diálogo del navegador.");
            triggerIframePrintOrder(order);
          }
        });
      return;
    }

    triggerIframePrintOrder(order);
  };

  const triggerIframePrintOrder = (order: QRWaitOrder) => {
    // Create a hidden iframe for print
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
            <title>Comanda - ${order.tableNumber}</title>
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
            <div class="center bold">${order.tableNumber === 'DELIVERY' ? 'COMANDA DELIVERY' : order.tableNumber === 'RETIRO' ? 'COMANDA RETIRO LOCAL' : 'COMANDA DE MESA'}</div>
            <div class="divider"></div>
            <div><strong>FECHA:</strong> ${new Date(order.date).toLocaleString()}</div>
            ${order.deliveryDetails ? `
              <div><strong>CLIENTE:</strong> ${order.deliveryDetails.customerName}</div>
              <div><strong>TELÉFONO:</strong> ${order.deliveryDetails.phone}</div>
              ${order.deliveryDetails.address ? `<div style="margin-top:4px;"><strong>DIRECCIÓN:</strong> ${order.deliveryDetails.address}</div>` : ''}
            ` : `
              <div><strong>MESA:</strong> ${order.tableNumber}</div>
              <div><strong>MOZO:</strong> ${order.mozoName}</div>
            `}
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
                ${order.items.map(item => `
                  <tr>
                    <td>${item.quantity}</td>
                    <td>${item.title}</td>
                    <td align="right">${(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="divider"></div>
            <div class="right bold" style="font-size: 15px;">TOTAL: Gs. ${order.total.toLocaleString()}</div>
            <div class="divider"></div>
            <h3 class="center" style="margin:10px 0 0 0;">¡A COCINAR!</h3>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  // Accept QR order and convert to official Sales
  const handleAcceptOrder = (order: QRWaitOrder) => {
    // Add each ordered item to the sales list
    order.items.forEach(item => {
      const sale: Sale = {
        id: `${order.id}-${item.productId}-${Math.random().toString(36).substr(2, 4)}`,
        productId: item.productId,
        date: order.date,
        quantity: item.quantity,
        total: item.price * item.quantity
      };
      addSale(sale);
    });

    // Update status to accepted (goes to kitchen so Mozo sees it)
    updateQROrderStatus(order.id, 'accepted');
    setQrOrders(getQROrders());
    setSales(getSales());
  };

  // Filter sales by selected dates
  const filteredSales = sales.filter(sale => {
    const saleDate = parseISO(sale.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return isWithinInterval(saleDate, { start, end });
  });

  // Calculate most sold product in filtered range
  const productStats = filteredSales.reduce((acc, sale) => {
    acc[sale.productId] = (acc[sale.productId] || 0) + sale.quantity;
    return acc;
  }, {} as Record<string, number>);

  let mostSoldId = '';
  let maxQuantity = 0;
  Object.entries(productStats).forEach(([id, qty]) => {
    if (qty > maxQuantity) {
      maxQuantity = qty;
      mostSoldId = id;
    }
  });

  const mostSoldProduct = products.find(p => p.id === mostSoldId);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  // Waiter history calculations
  const mozoFilteredOrders = selectedHistoryMozo
    ? qrOrders.filter(order => {
        if (order.mozoId !== selectedHistoryMozo.id) return false;
        if (!mozoHistoryStartDate || !mozoHistoryEndDate) return true;
        try {
          const orderDate = parseISO(order.date);
          const start = new Date(mozoHistoryStartDate);
          const end = new Date(mozoHistoryEndDate);
          end.setHours(23, 59, 59, 999);
          return isWithinInterval(orderDate, { start, end });
        } catch (e) {
          return true;
        }
      })
    : [];

  const mozoTotalOrdersCount = mozoFilteredOrders.length;
  const mozoTotalBilledAmount = mozoFilteredOrders.reduce((sum, o) => {
    return o.status !== 'cancelled' ? sum + o.total : sum;
  }, 0);

  // Separate QR Orders
  const pendingQROrders = qrOrders.filter(o => o.status === 'pending');
  const kitchenCookingOrders = qrOrders.filter(o => o.status === 'accepted');
  const readyOrders = qrOrders.filter(o => o.status === 'ready');

  return (
    <div className="admin-layout">
      <div style={{ display: 'none' }}>{tick}</div>
      {/* Sidebar */}
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={24} color="var(--secondary-yellow)" />
            <h2 style={{ margin: 0, color: 'var(--secondary-yellow)', fontFamily: 'Oswald', fontSize: '1.4rem' }}>
              {isCocina ? 'TALAPA COCINA' : 'TALAPA PANEL'}
            </h2>
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            padding: '4px 8px', 
            borderRadius: '6px', 
            backgroundColor: getFirebaseUrl() ? '#2e7d32' : '#37474f', 
            color: 'white', 
            display: 'inline-block',
            marginBottom: '20px',
            fontWeight: 'bold',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            {getFirebaseUrl() ? '🟢 B.D. EN LA NUBE (FIREBASE)' : '🔌 B.D. LOCAL (OFFLINE)'}
          </div>

          {/* Bluetooth Printer Button */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleTogglePrinter}
              style={{
                width: '100%',
                background: connectedPrinter ? '#2e7d32' : 'rgba(255,255,255,0.1)',
                border: connectedPrinter ? '1px solid #4caf50' : '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: connectedPrinter ? '0 0 10px rgba(76, 175, 80, 0.4)' : 'none'
              }}
              title={connectedPrinter ? `Conectado a ${connectedPrinter}` : "Conectar Impresora Termica Bluetooth"}
            >
              <Bluetooth size={16} className={connectedPrinter ? "" : "animate-pulse"} />
              {connectedPrinter ? `Termica: ${connectedPrinter.slice(0, 12)}...` : 'Conectar Termica'}
            </button>
          </div>

          
          <Link to="/" className="sidebar-link">← Volver al Sitio</Link>
          <div style={{ margin: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></div>

          {!isCocina && (
            <button 
              onClick={() => setActiveTab('sales')} 
              className="sidebar-link" 
              style={{ 
                width: '100%', 
                background: activeTab === 'sales' ? 'rgba(255,255,255,0.15)' : 'none', 
                border: 'none', 
                textAlign: 'left', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Calendar size={18} /> Historial Ventas
            </button>
          )}

          <button 
            onClick={() => setActiveTab('qr_orders')} 
            className="sidebar-link" 
            style={{ 
              width: '100%', 
              background: activeTab === 'qr_orders' ? 'rgba(255,255,255,0.15)' : 'none', 
              border: 'none', 
              textAlign: 'left', 
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <ShoppingCart size={18} /> {isCocina ? 'Cocina' : 'Pedidos QR'}
            {pendingQROrders.length > 0 && (
              <span style={{
                position: 'absolute',
                right: '10px',
                background: 'var(--primary-red)',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.2s infinite'
              }}>
                {pendingQROrders.length}
              </span>
            )}
          </button>

          {!isCocina && (
            <button 
              onClick={() => setActiveTab('mozos')} 
              className="sidebar-link" 
              style={{ 
                width: '100%', 
                background: activeTab === 'mozos' ? 'rgba(255,255,255,0.15)' : 'none', 
                border: 'none', 
                textAlign: 'left', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Users size={18} /> Gestión de Mozos
            </button>
          )}
        </div>

        <div>
          {!isCocina && (
            <button 
              onClick={handleToggleEditMode} 
              className="btn" 
              style={{ 
                width: '100%', 
                backgroundColor: editModeActive ? 'var(--primary-red)' : 'white', 
                color: editModeActive ? 'white' : 'black',
                fontSize: '0.9rem',
                padding: '8px 12px',
                marginBottom: '10px'
              }}
            >
              {editModeActive ? 'Desactivar Edición' : 'Activar Edición'}
            </button>
          )}
          <button 
            onClick={() => {
              if (isCocina) {
                localStorage.removeItem('talapa_cocina_logged');
                navigate('/login?role=cocina');
              } else {
                localStorage.removeItem('talapa_admin_logged');
                navigate('/login?role=admin');
              }
            }} 
            className="btn" 
            style={{ 
              width: '100%', 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              color: 'white',
              fontSize: '0.9rem',
              padding: '8px 12px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Admin Content */}
      <div className="admin-content" style={{ backgroundColor: '#f4f6f9', overflowY: 'auto' }}>
        
        {/* TAB 1: SALES HISTORY */}
        {activeTab === 'sales' && (
          <div>
            <h1 style={{ color: 'var(--primary-red)', marginBottom: '20px', fontFamily: 'Oswald' }}>Historial de Ventas</h1>
            
            {/* Double Calendar Inputs */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '25px', display: 'flex', gap: '20px', alignItems: 'flex-end', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#666' }}>Fecha de Inicio (Calendario 1)</label>
                <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setHasManuallyFiltered(true); }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#666' }}>Fecha de Fin (Calendario 2)</label>
                <input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setHasManuallyFiltered(true); }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={handleAddTestSale}>
                  + Venta Prueba
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2" style={{ marginBottom: '30px' }}>
              <div style={{ background: 'linear-gradient(135deg, #da251d 0%, #b81b14 100%)', color: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 6px 15px rgba(218, 37, 29, 0.2)' }}>
                <h3 style={{ fontSize: '1.1rem', opacity: 0.9, letterSpacing: '0.5px' }}>Ingresos Totales</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Oswald', marginTop: '10px' }}>Gs. {totalRevenue.toLocaleString()}</div>
                <p style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.8 }}>{filteredSales.length} transacciones registradas</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #222 0%, #111 100%)', color: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 6px 15px rgba(0, 0, 0, 0.15)' }}>
                <h3 style={{ fontSize: '1.1rem', opacity: 0.9, color: 'var(--secondary-yellow)', letterSpacing: '0.5px' }}>Top Producto</h3>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'Oswald', marginTop: '10px', color: 'white' }}>
                  {mostSoldProduct ? mostSoldProduct.title.toUpperCase() : 'SIN DATOS'}
                </div>
                {mostSoldProduct && <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#aaa' }}>{maxQuantity} unidades vendidas en el rango</p>}
              </div>
            </div>

            {/* Sales Table */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              <h2 style={{ marginBottom: '20px', fontFamily: 'Oswald', fontSize: '1.2rem' }}>Registro de Transacciones</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px 15px', color: '#555' }}>Fecha/Hora</th>
                    <th style={{ padding: '12px 15px', color: '#555' }}>Producto</th>
                    <th style={{ padding: '12px 15px', color: '#555' }}>Cant.</th>
                    <th style={{ padding: '12px 15px', color: '#555', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => {
                    const product = products.find(p => p.id === sale.productId);
                    return (
                      <tr key={sale.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 15px', fontSize: '0.9rem' }}>{format(parseISO(sale.date), 'dd/MM/yyyy HH:mm')}</td>
                        <td style={{ padding: '12px 15px', fontWeight: 600 }}>{product?.title || 'Desconocido'}</td>
                        <td style={{ padding: '12px 15px' }}>{sale.quantity}</td>
                        <td style={{ padding: '12px 15px', fontWeight: 'bold', textAlign: 'right' }}>Gs. {sale.total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#888' }}>
                        No hay ventas en las fechas seleccionadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: QR ORDERS MODULE */}
        {activeTab === 'qr_orders' && (
          <div>
            <h1 style={{ color: 'var(--primary-red)', marginBottom: '20px', fontFamily: 'Oswald' }}>Pedidos Recibidos por QR</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              
              {/* Left Column: Pending orders awaiting admin validation */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', color: '#d9480f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d9480f', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
                    Nuevos Pedidos ({pendingQROrders.length})
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>Se auto-detectan con sonido</span>
                </div>

                {pendingQROrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                    <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <p>No hay nuevos pedidos pendientes.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {pendingQROrders.map(order => (
                      <div 
                        key={order.id} 
                        style={{
                          border: '1px solid #ffe3e3',
                          background: '#fffbfb',
                          borderRadius: '10px',
                          padding: '15px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: order.tableNumber === 'DELIVERY' || order.tableNumber === 'RETIRO' ? '#da251d' : '#111' }}>
                            {order.tableNumber === 'DELIVERY' ? '🛵 DELIVERY' : order.tableNumber === 'RETIRO' ? '🥡 RETIRO LOCAL' : `MESA ${order.tableNumber}`}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}>
                            {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {order.deliveryDetails ? (
                          <div style={{ fontSize: '0.85rem', color: '#333', background: '#f8f9fa', padding: '10px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '10px' }}>
                            <div>👤 Cliente: <strong>{order.deliveryDetails.customerName}</strong></div>
                            <div style={{ marginTop: '2px' }}>📞 Teléfono: <strong>{order.deliveryDetails.phone}</strong></div>
                            {order.deliveryDetails.address && (
                              <div style={{ marginTop: '4px', borderTop: '1px solid #eaeaea', paddingTop: '4px', color: '#555' }}>
                                📍 Dirección: <strong>{order.deliveryDetails.address}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px' }}>
                            Mozo Responsable: <strong>{order.mozoName}</strong>
                          </div>
                        )}
                        
                        <div style={{ borderTop: '1px dashed #eee', borderBottom: '1px dashed #eee', padding: '10px 0', marginBottom: '12px' }}>
                          {order.items.map((it, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '3px 0' }}>
                              <span>{it.quantity}x {it.title}</span>
                              <span style={{ fontWeight: 600 }}>Gs. {(it.price * it.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#666' }}>Total Pedido:</span>
                          <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary-red)', fontFamily: 'Oswald' }}>Gs. {order.total.toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handlePrintOrder(order)}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                          >
                            <Printer size={15} /> {order.printed ? 'Re-imprimir' : 'Imprimir Comanda'}
                          </button>
                          
                          <button
                            onClick={() => handleAcceptOrder(order)}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#2e7d32' }}
                          >
                            <Check size={15} /> Aceptar y Enviar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Middle Column: Accepted orders preparing in kitchen */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', color: '#2e7d32' }}>
                    En Cocina / Preparando ({kitchenCookingOrders.length})
                  </h2>
                </div>

                {kitchenCookingOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                    <p>No hay pedidos en preparación en la cocina actualmente.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {kitchenCookingOrders.map(order => (
                      <div 
                        key={order.id} 
                        style={{
                          background: '#fffdeb',
                          border: '1px solid #ffe082',
                          borderRadius: '8px',
                          padding: '12px 15px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', color: order.tableNumber === 'DELIVERY' || order.tableNumber === 'RETIRO' ? '#da251d' : '#111' }}>
                            {order.tableNumber === 'DELIVERY' ? '🛵 DELIVERY' : order.tableNumber === 'RETIRO' ? '🥡 RETIRO LOCAL' : `MESA ${order.tableNumber}`}
                            {order.deliveryDetails && ` (${order.deliveryDetails.customerName})`}
                          </div>
                          {order.deliveryDetails ? (
                            <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px' }}>
                              📞 {order.deliveryDetails.phone} {order.deliveryDetails.address && ` | 📍 ${order.deliveryDetails.address}`}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px' }}>
                              Mozo: <strong>{order.mozoName}</strong>
                            </div>
                          )}
                          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '3px', fontWeight: 'bold' }}>
                            Total: Gs. {order.total.toLocaleString()}
                          </div>
                          
                          {/* Detalles completos de productos */}
                          <div style={{
                            marginTop: '8px',
                            background: '#ffffff',
                            border: '1px solid #ffe082',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            color: '#333',
                            minWidth: '220px',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            {order.subGroup && (
                              <div style={{ marginBottom: '5px', color: '#b57a00', fontWeight: 'bold', fontSize: '0.75rem', borderBottom: '1px solid #fff8e1', paddingBottom: '2px' }}>
                                👤 GRUPO: {order.subGroup.toUpperCase()}
                              </div>
                            )}
                            {order.items.map((it, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < order.items.length - 1 ? '1px dashed #f0f0f0' : 'none', padding: '3px 0' }}>
                                <span style={{ fontWeight: 'bold', color: '#111' }}>{it.quantity}x {it.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Dynamic Kitchen Timer */}
                        {(() => {
                          const diffMs = Date.now() - new Date(order.date).getTime();
                          const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
                          const minutes = Math.floor(diffSecs / 60);
                          const seconds = diffSecs % 60;
                          const totalMinutes = diffSecs / 60;

                          const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                          let timerStyle: React.CSSProperties = {
                            fontFamily: 'monospace',
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            minWidth: '100px',
                            margin: '0 15px',
                            transition: 'all 0.3s ease'
                          };

                          if (totalMinutes >= 30) {
                            timerStyle = {
                              ...timerStyle,
                              color: '#ffffff',
                              backgroundColor: '#d50000',
                              boxShadow: '0 0 15px rgba(213, 0, 0, 0.6)',
                              opacity: tick % 2 === 0 ? 1 : 0.2
                            };
                          } else if (totalMinutes >= 10) {
                            timerStyle = {
                              ...timerStyle,
                              color: '#ffffff',
                              backgroundColor: '#e65100', // Strong orange
                              boxShadow: '0 0 10px rgba(230, 81, 0, 0.5)'
                            };
                          } else {
                            timerStyle = {
                              ...timerStyle,
                              color: '#e65100',
                              backgroundColor: '#fff3e0',
                              border: '2px solid #ffe0b2'
                            };
                          }

                          return (
                            <div style={timerStyle} title="Tiempo transcurrido desde la creación del pedido">
                              {timeStr}
                            </div>
                          );
                        })()}

                        <button
                          onClick={() => {
                            updateQROrderStatus(order.id, 'ready');
                            setQrOrders(getQROrders());
                          }}
                          className="btn"
                          style={{ background: '#ff9800', color: 'white', padding: '8px 12px', fontSize: '0.8rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          🔔 Listo (Avisar Mozo)
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Finished orders ready for waiters or dispatch */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', color: '#da251d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#da251d', display: 'inline-block', animation: 'pulse 1.2s infinite' }}></span>
                    Terminados / A Retirar ({readyOrders.length})
                  </h2>
                </div>

                {readyOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                    <p>No hay pedidos listos para retirar.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {readyOrders.map(order => (
                      <div 
                        key={order.id} 
                        style={{
                          background: '#f1f8e9',
                          border: '1px solid #a5d6a7',
                          borderRadius: '8px',
                          padding: '12px 15px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.15)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', color: order.tableNumber === 'DELIVERY' || order.tableNumber === 'RETIRO' ? '#da251d' : '#111' }}>
                            {order.tableNumber === 'DELIVERY' ? '🛵 DELIVERY' : order.tableNumber === 'RETIRO' ? '🥡 RETIRO LOCAL' : `MESA ${order.tableNumber}`}
                            {order.deliveryDetails && ` (${order.deliveryDetails.customerName})`}
                          </div>
                          {order.deliveryDetails ? (
                            <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px' }}>
                              📞 {order.deliveryDetails.phone} {order.deliveryDetails.address && ` | 📍 ${order.deliveryDetails.address}`}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#c62828', marginTop: '2px', fontWeight: 'bold' }}>
                              🚨 Retira: {order.mozoName.toUpperCase()}
                            </div>
                          )}
                          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '3px', fontWeight: 'bold' }}>
                            Total: Gs. {order.total.toLocaleString()}
                          </div>
                          
                          {/* Detalles completos de productos */}
                          <div style={{
                            marginTop: '8px',
                            background: '#ffffff',
                            border: '1px solid #a5d6a7',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            color: '#333',
                            minWidth: '220px',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            {order.subGroup && (
                              <div style={{ marginBottom: '5px', color: '#2e7d32', fontWeight: 'bold', fontSize: '0.75rem', borderBottom: '1px solid #e8f5e9', paddingBottom: '2px' }}>
                                👤 GRUPO: {order.subGroup.toUpperCase()}
                              </div>
                            )}
                            {order.items.map((it, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < order.items.length - 1 ? '1px dashed #f0f0f0' : 'none', padding: '3px 0' }}>
                                <span style={{ fontWeight: 'bold', color: '#111' }}>{it.quantity}x {it.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            updateQROrderStatus(order.id, 'completed');
                            setQrOrders(getQROrders());
                          }}
                          className="btn"
                          style={{ background: '#2e7d32', color: 'white', padding: '8px 12px', fontSize: '0.8rem', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          ✓ Entregado
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: WAITER PROFILE & QR CODE GENERATION */}
        {activeTab === 'mozos' && (
          <div>
            <h1 style={{ color: 'var(--primary-red)', marginBottom: '20px', fontFamily: 'Oswald' }}>Gestión de Mozos & Códigos QR</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              
              {/* Waiter creation & list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Form */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserPlus size={18} color="var(--primary-red)" />
                    Registrar Nuevo Mozo
                  </h2>
                  <form onSubmit={handleAddMozoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px', display: 'block' }}>Nombre Completo</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Nombre Completo (Ej: Mozo Carlos)"
                          value={newMozoName} 
                          onChange={e => setNewMozoName(e.target.value)} 
                          required 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px', display: 'block' }}>PIN de Acceso</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Pin Acceso (Ej: 1234)"
                          value={newMozoCode} 
                          onChange={e => setNewMozoCode(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px', display: 'block' }}>Mesas Asignadas (separadas por comas)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ej: Mesa 1, Mesa 2, Mesa 3"
                        value={newMozoTables} 
                        onChange={e => setNewMozoTables(e.target.value)} 
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '10px 20px' }}>Registrar Mozo</button>
                  </form>
                </div>

                {/* Kitchen Password Setting */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={18} color="var(--primary-red)" />
                    Contraseña de Acceso a Cocina
                  </h2>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px', display: 'block' }}>Nueva Contraseña</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Contraseña (Ej: cocina123)"
                        value={cocinaPasswordSetting} 
                        onChange={e => setCocinaPasswordSetting(e.target.value)} 
                      />
                    </div>
                    <button 
                      onClick={handleSaveCocinaPassword} 
                      className="btn btn-primary" 
                      style={{ padding: '10px 20px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Guardar Contraseña
                    </button>
                  </div>
                  {cocinaPasswordSavedMessage && (
                    <div style={{ color: '#2e7d32', fontSize: '0.85rem', marginTop: '10px', fontWeight: 'bold' }}>
                      {cocinaPasswordSavedMessage}
                    </div>
                  )}
                </div>

                {/* Waiter table list */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', marginBottom: '15px' }}>Listado de Personal de Servicio</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '10px', color: '#555' }}>Nombre</th>
                        <th style={{ padding: '10px', color: '#555' }}>Código Pin</th>
                        <th style={{ padding: '10px', color: '#555' }}>Mesas Asignadas</th>
                        <th style={{ padding: '10px', color: '#555', textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mozos.map(mozo => (
                        <tr key={mozo.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{mozo.name}</td>
                          <td style={{ padding: '10px' }}>
                             <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                               <input 
                                 type="text" 
                                 className="form-control" 
                                 style={{ fontSize: '0.8rem', padding: '4px 8px', width: '80px', display: 'inline-block' }}
                                 placeholder="PIN"
                                 value={editingPinsMap[mozo.id] !== undefined ? editingPinsMap[mozo.id] : mozo.code}
                                 onChange={e => setEditingPinsMap({ ...editingPinsMap, [mozo.id]: e.target.value })}
                               />
                               {editingPinsMap[mozo.id] !== undefined && (
                                 <button 
                                   onClick={() => handleSavePin(mozo.id)}
                                   className="btn btn-secondary"
                                   style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#2e7d32', color: 'white' }}
                                 >
                                   Guardar
                                 </button>
                               )}
                             </div>
                           </td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ fontSize: '0.8rem', padding: '4px 8px', width: '160px', display: 'inline-block' }}
                                placeholder="Ej: Mesa 1, Mesa 2"
                                value={editingTablesMap[mozo.id] !== undefined ? editingTablesMap[mozo.id] : (mozo.assignedTables?.join(', ') || '')}
                                onChange={e => setEditingTablesMap({ ...editingTablesMap, [mozo.id]: e.target.value })}
                              />
                              {editingTablesMap[mozo.id] !== undefined && (
                                <button 
                                  onClick={() => handleSaveTables(mozo.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#2e7d32', color: 'white' }}
                                >
                                  Guardar
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setSelectedHistoryMozo(mozo);
                                const todayStr = format(new Date(), 'yyyy-MM-dd');
                                setMozoHistoryStartDate(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
                                setMozoHistoryEndDate(todayStr);
                                setShowMozoHistoryModal(true);
                              }}
                              className="btn"
                              style={{ padding: '5px 10px', fontSize: '0.75rem', marginRight: '8px', background: '#e8f5e9', color: '#1b5e20', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Calendar size={12} /> Historial
                            </button>
                            <button
                              onClick={() => {
                                setQrMozoId(mozo.id);
                                setGeneratedQR(null);
                              }}
                              className="btn"
                              style={{ padding: '5px 10px', fontSize: '0.75rem', marginRight: '8px', background: '#e3f2fd', color: '#0d47a1', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <QrCode size={12} /> Generar QR
                            </button>
                            <button
                              onClick={() => handleDeleteMozo(mozo.id)}
                              className="btn"
                              style={{ padding: '5px', background: '#ffe3e3', color: 'var(--primary-red)' }}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {mozos.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                            No hay mozos creados. Complete el formulario superior.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Monitoreo de Mesas en Vivo */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', marginBottom: '15px', color: 'var(--primary-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--primary-red)" />
                    Monitoreo de Mesas en Vivo
                  </h2>
                  
                  {mozos.length === 0 ? (
                    <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Registre un mozo para comenzar el monitoreo.</p>
                  ) : (
                    <div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px', display: 'block' }}>Seleccione Mozo a Monitorear</label>
                        <select 
                          className="form-control"
                          value={monitoredMozoId}
                          onChange={e => {
                            setMonitoredMozoId(e.target.value);
                            setSelectedMonitoredTable(null);
                          }}
                        >
                          <option value="">-- Seleccionar --</option>
                          {mozos.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      {selectedMonitoredMozo && (
                        <div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                            gap: '15px',
                            marginBottom: '15px'
                          }}>
                            {(() => {
                              const defaultTables = selectedMonitoredMozo.assignedTables || [];

                              const activeMozoOrders = qrOrders.filter(o => o.mozoId === selectedMonitoredMozo.id && (o.status === 'pending' || o.status === 'accepted' || o.status === 'ready' || o.status === 'completed'));
                              
                              const customActiveTables = Array.from(
                                new Set(
                                  activeMozoOrders
                                    .map(o => o.tableNumber)
                                    .filter(t => !defaultTables.includes(t))
                                  )
                              );

                              const allTables = [...defaultTables, ...customActiveTables];

                              if (allTables.length === 0) {
                                return (
                                  <div style={{ gridColumn: '1 / -1', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                                    ⚠️ Este mozo aún no tiene mesas generadas. Use el <strong>Generador de QR para Mesas</strong> (a la derecha) para crear una mesa para este mozo.
                                  </div>
                                );
                              }

                              return allTables.map(table => {
                                const tableActiveOrders = activeMozoOrders.filter(o => o.tableNumber.toLowerCase() === table.toLowerCase());
                                const isActive = tableActiveOrders.length > 0;
                                const isSelected = selectedMonitoredTable === table;
                                const scanUrl = `${qrBaseUrl.trim().replace(/\/$/, '')}/#/?mozoId=${selectedMonitoredMozo.id}&mesa=${encodeURIComponent(table)}`;
                                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(scanUrl)}`;

                                return (
                                  <div 
                                    key={table} 
                                    style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      gap: '8px', 
                                      alignItems: 'center', 
                                      background: '#f8fafc', 
                                      padding: '10px', 
                                      borderRadius: '10px', 
                                      border: '1px solid #e2e8f0',
                                      boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                                      position: 'relative'
                                    }}
                                  >
                                    {/* Close/Delete Table Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTable(selectedMonitoredMozo.id, table);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        right: '-6px',
                                        background: '#fee2e2',
                                        border: '1px solid #fecaca',
                                        color: '#ef4444',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        padding: 0,
                                        zIndex: 10
                                      }}
                                      title="Eliminar Mesa"
                                    >
                                      <X size={12} strokeWidth={3} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMonitoredTable(isSelected ? null : table)}
                                      style={{
                                        width: '100%',
                                        border: isSelected ? '3px solid var(--primary-red)' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        padding: '10px 5px',
                                        cursor: 'pointer',
                                        background: (() => {
                                          const hasPending = tableActiveOrders.some(o => o.status === 'pending');
                                          const hasAccepted = tableActiveOrders.some(o => o.status === 'accepted');
                                          const hasReady = tableActiveOrders.some(o => o.status === 'ready' || o.status === 'completed');
                                          
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
                                          const hasReady = tableActiveOrders.some(o => o.status === 'ready' || o.status === 'completed');
                                          
                                          if (hasPending) return '#111';
                                          if (hasAccepted || hasReady) return 'white';
                                          return '#546e7a';
                                        })(),
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'Oswald' }}>{table}</span>
                                      {isActive && (
                                        <>
                                          <span style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.25)', padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' }}>
                                            {tableActiveOrders.length} {tableActiveOrders.length === 1 ? 'ped' : 'peds'}
                                          </span>
                                          {(() => {
                                            const oldestOrder = tableActiveOrders.reduce((oldest, current) => {
                                              return new Date(current.date).getTime() < new Date(oldest.date).getTime() ? current : oldest;
                                            }, tableActiveOrders[0]);
                                            return oldestOrder ? (
                                              <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 'bold',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                background: 'rgba(0,0,0,0.15)',
                                                padding: '1px 4px',
                                                borderRadius: '4px',
                                                marginTop: '2px'
                                              }}>
                                                <Clock size={8} />
                                                {formatTimer(oldestOrder.date)}
                                              </span>
                                            ) : null;
                                          })()}
                                        </>
                                      )}
                                    </button>

                                    {/* QR Code container below the button */}
                                    <div style={{ background: 'white', padding: '5px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', width: '100%' }}>
                                      <img 
                                        src={qrImageUrl} 
                                        alt={`QR ${table}`} 
                                        style={{ width: '90px', height: '90px' }} 
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Print this specific table QR code
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
                                                  <title>Imprimir QR - ${table}</title>
                                                  <style>
                                                    body { font-family: sans-serif; text-align: center; padding: 40px; }
                                                    .frame { border: 4px solid #da251d; border-radius: 20px; padding: 30px; display: inline-block; }
                                                    h1 { font-family: 'Oswald', sans-serif; margin: 0 0 10px 0; color: #da251d; }
                                                    h2 { margin: 0 0 20px 0; color: #333; }
                                                    .footer { margin-top: 20px; font-weight: bold; color: #666; }
                                                  </style>
                                                </head>
                                                <body>
                                                  <div class="frame">
                                                    <h1>TALAPA BURGER</h1>
                                                    <h2>ESCANEE PARA PEDIR</h2>
                                                    <img src="${qrImageUrl}" style="width: 250px; height: 250px" />
                                                    <div class="footer">${table.toUpperCase()} — ATENDIDO POR: ${selectedMonitoredMozo.name.toUpperCase()}</div>
                                                  </div>
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
                                        }}
                                        style={{ width: '100%', background: '#fafafa', border: '1px solid #ddd', borderRadius: '4px', padding: '3px 0', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontWeight: 'bold' }}
                                      >
                                        <Printer size={10} /> Imprimir QR
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>

                          {selectedMonitoredTable && (
                            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '15px', border: '1px solid #e2e8f0' }}>
                              <h4 style={{ fontFamily: 'Oswald', margin: '0 0 10px 0', fontSize: '0.95rem', color: '#111' }}>
                                PEDIDOS ACTIVOS EN {selectedMonitoredTable.toUpperCase()}
                              </h4>
                              {(() => {
                                const activeMozoOrders = qrOrders.filter(o => o.mozoId === selectedMonitoredMozo.id && (o.status === 'pending' || o.status === 'accepted' || o.status === 'ready' || o.status === 'completed'));
                                const tableActiveOrders = activeMozoOrders.filter(o => o.tableNumber.toLowerCase() === selectedMonitoredTable.toLowerCase());

                                if (tableActiveOrders.length === 0) {
                                  return <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>Mesa sin consumos activos actualmente.</p>;
                                }

                                const grandTotal = tableActiveOrders.reduce((sum, o) => sum + o.total, 0);

                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {(() => {
                                      const groups: Record<string, QRWaitOrder[]> = {};
                                      tableActiveOrders.forEach(order => {
                                        const groupKey = order.subGroup?.trim() || 'General';
                                        if (!groups[groupKey]) {
                                          groups[groupKey] = [];
                                        }
                                        groups[groupKey].push(order);
                                      });

                                      return Object.entries(groups).map(([groupName, groupOrders]) => {
                                        const groupTotal = groupOrders.reduce((sum, o) => sum + o.total, 0);
                                        return (
                                          <div key={groupName} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px', marginBottom: '10px' }}>
                                              <h5 style={{ fontFamily: 'Oswald', margin: 0, fontSize: '0.85rem', color: 'var(--primary-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                👤 GRUPO: {groupName.toUpperCase()}
                                              </h5>
                                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b' }}>
                                                Subtotal: Gs. {groupTotal.toLocaleString()}
                                              </span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              {groupOrders.map(order => (
                                                <div key={order.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px', fontSize: '0.8rem' }}>
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{
                                                      fontSize: '0.65rem',
                                                      padding: '2px 6px',
                                                      borderRadius: '10px',
                                                      fontWeight: 'bold',
                                                      color: order.status === 'pending' ? '#856404' : '#fff',
                                                      backgroundColor: order.status === 'pending' 
                                                        ? '#fff3cd' 
                                                        : order.status === 'ready' 
                                                          ? '#ff9800' 
                                                          : order.status === 'completed'
                                                            ? '#334155'
                                                            : '#2e7d32'
                                                    }}>
                                                      {order.status === 'pending' 
                                                        ? 'Pendiente' 
                                                        : order.status === 'ready' 
                                                          ? 'Listo' 
                                                          : order.status === 'completed'
                                                            ? 'Servido'
                                                            : 'En Cocina'}
                                                    </span>
                                                    <span style={{ color: '#888', fontSize: '0.7rem' }}>Ref: #{order.id.slice(-5)}</span>
                                                  </div>
                                                  {order.items.map((it, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#555', padding: '1px 0' }}>
                                                      <span>{it.quantity}x {it.title}</span>
                                                      <span>Gs. {(it.price * it.quantity).toLocaleString()}</span>
                                                    </div>
                                                  ))}
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                                                    <span>Total:</span>
                                                    <span style={{ color: 'var(--primary-red)' }}>Gs. {order.total.toLocaleString()}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>

                                            {/* Group Actions */}
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                                              <button
                                                type="button"
                                                onClick={() => navigate(`/?mozoId=${selectedMonitoredMozo.id}&mesa=${encodeURIComponent(selectedMonitoredTable)}&subGroup=${encodeURIComponent(groupName)}`)}
                                                style={{
                                                  flex: 1,
                                                  padding: '5px',
                                                  background: '#e8f5e9',
                                                  color: '#2e7d32',
                                                  border: 'none',
                                                  borderRadius: '4px',
                                                  fontWeight: 'bold',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '3px',
                                                  fontSize: '0.7rem'
                                                }}
                                              >
                                                <PlusCircle size={10} /> Pedir para {groupName}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handlePrintTableAccount(`${selectedMonitoredTable} - ${groupName}`, selectedMonitoredMozo.name, groupOrders)}
                                                style={{
                                                  flex: 1,
                                                  padding: '5px',
                                                  background: '#e0f2fe',
                                                  color: '#0369a1',
                                                  border: 'none',
                                                  borderRadius: '4px',
                                                  fontWeight: 'bold',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '3px',
                                                  fontSize: '0.7rem'
                                                }}
                                              >
                                                <Printer size={10} /> Imprimir {groupName}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleCloseTable(groupOrders);
                                                }}
                                                style={{
                                                  flex: 1,
                                                  padding: '5px',
                                                  background: '#fee2e2',
                                                  color: '#b91c1c',
                                                  border: 'none',
                                                  borderRadius: '4px',
                                                  fontWeight: 'bold',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '3px',
                                                  fontSize: '0.7rem'
                                                }}
                                              >
                                                <Check size={10} /> Cerrar {groupName}
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}

                                    {/* Grand Total and Actions */}
                                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '10px', marginTop: '5px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginBottom: '12px' }}>
                                        <span>Total Cuenta Mesa:</span>
                                        <span style={{ color: 'var(--primary-red)', fontSize: '1.1rem' }}>Gs. {grandTotal.toLocaleString()}</span>
                                      </div>
                                      
                                      <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handlePrintTableAccount(selectedMonitoredTable, selectedMonitoredMozo.name, tableActiveOrders)}
                                          className="btn"
                                          style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: '#0284c7',
                                            color: 'white',
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
                                          <Printer size={14} /> Imprimir Cuenta
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleCloseTable(tableActiveOrders)}
                                          className="btn"
                                          style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: 'var(--primary-red)',
                                            color: 'white',
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
                                          <Check size={14} /> Cerrar Mesa
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* QR sheet Generator displays */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Table QR generator card */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontFamily: 'Oswald', fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <QrCode size={18} color="var(--secondary-yellow)" />
                    Generador de QR para Mesas
                  </h2>

                  <form onSubmit={handleGenerateQR} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', color: '#666', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span>IP / Servidor del Local (Dirección Base)</span>
                        {(qrBaseUrl.includes('localhost') || qrBaseUrl.includes('127.0.0.1')) && (
                          <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 'bold' }}>
                            ⚠️ Atención: Estás usando localhost. Cambia esto por la IP local de tu PC (Ej: http://192.168.1.15:5174) para que los QRs escaneados en celulares funcionen a través de tu Wi-Fi.
                          </span>
                        )}
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ej: http://192.168.1.15:5174"
                        value={qrBaseUrl} 
                        onChange={e => {
                          setQrBaseUrl(e.target.value);
                          setGeneratedQR(null);
                        }}
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', color: '#666' }}>1. Seleccione el Mozo a cargo</label>
                      <select 
                        className="form-control" 
                        value={qrMozoId} 
                        onChange={e => {
                          setQrMozoId(e.target.value);
                          setGeneratedQR(null);
                        }}
                        required
                      >
                        <option value="">-- Seleccionar Mozo --</option>
                        {mozos.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', color: '#666' }}>2. Escriba el identificador de Mesa</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ej: Mesa 1, Barra, VIP 3"
                        value={qrTableNumber} 
                        onChange={e => {
                          setQrTableNumber(e.target.value);
                          setGeneratedQR(null);
                        }}
                        required 
                      />
                    </div>

                    <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                      Generar Código QR
                    </button>
                  </form>

                  {generatedQR && (
                    <div style={{ marginTop: '20px', padding: '15px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                      <h3 style={{ fontFamily: 'Oswald', fontSize: '1rem', marginBottom: '10px' }}>
                        QR LISTO: {mozos.find(m => m.id === qrMozoId)?.name} — {generatedQR.tableNumber || qrTableNumber}
                      </h3>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', display: 'inline-block', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
                        <img src={generatedQR.url} alt="QR Code" style={{ width: '180px', height: '180px' }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666', wordBreak: 'break-all', marginBottom: '15px' }}>
                        {generatedQR.scanUrl}
                      </div>
                      <button
                        onClick={() => {
                          const iframe = document.createElement('iframe');
                          iframe.style.position = 'absolute';
                          iframe.style.width = '0px';
                          iframe.style.height = '0px';
                          iframe.style.border = 'none';
                          iframe.style.top = '-9999px';
                          document.body.appendChild(iframe);

                          const doc = iframe.contentWindow?.document || iframe.contentDocument;
                          const currentTableText = generatedQR.tableNumber || qrTableNumber;
                          if (doc) {
                            doc.open();
                            doc.write(`
                              <html>
                                <head>
                                  <title>Imprimir QR - ${currentTableText}</title>
                                  <style>
                                    body { font-family: sans-serif; text-align: center; padding: 40px; }
                                    .frame { border: 4px solid #da251d; border-radius: 20px; padding: 30px; display: inline-block; }
                                    h1 { font-family: 'Oswald', sans-serif; margin: 0 0 10px 0; color: #da251d; }
                                    h2 { margin: 0 0 20px 0; color: #333; }
                                    .footer { margin-top: 20px; font-weight: bold; color: #666; }
                                  </style>
                                </head>
                                <body>
                                  <div class="frame">
                                    <h1>TALAPA BURGER</h1>
                                    <h2>ESCANEE PARA PEDIR</h2>
                                    <img src="${generatedQR.url}" style="width: 250px; height: 250px" />
                                    <div class="footer">${currentTableText.toUpperCase()} — ATENDIDO POR: ${mozos.find(m => m.id === qrMozoId)?.name.toUpperCase()}</div>
                                  </div>
                                </body>
                              </html>
                            `);
                            doc.close();

                            setTimeout(() => {
                              iframe.contentWindow?.focus();
                              iframe.contentWindow?.print();
                              setTimeout(() => {
                                document.body.removeChild(iframe);
                              }, 1000);
                            }, 500);
                          }
                        }}
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.9rem' }}
                      >
                        <Printer size={16} /> Imprimir Letrero QR Mesa
                      </button>
                    </div>
                  )}
                </div>


              </div>

            </div>
          </div>
        )}

      </div>

      {/* Waiter History Modal */}
      {showMozoHistoryModal && selectedHistoryMozo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #da251d 0%, #b81b14 100%)',
              color: 'white'
            }}>
              <h2 style={{ margin: 0, fontFamily: 'Oswald', fontSize: '1.4rem', letterSpacing: '0.5px' }}>
                Historial de Pedidos: {selectedHistoryMozo.name.toUpperCase()}
              </h2>
              <button
                onClick={() => setShowMozoHistoryModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content container */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#f8fafc' }}>
              
              {/* Calendars / Date filter */}
              <div style={{
                background: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-end',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Fecha de Inicio</label>
                  <input
                    type="date"
                    className="form-control"
                    value={mozoHistoryStartDate}
                    onChange={e => setMozoHistoryStartDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Fecha de Fin</label>
                  <input
                    type="date"
                    className="form-control"
                    value={mozoHistoryEndDate}
                    onChange={e => setMozoHistoryEndDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Pedidos Registrados</span>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', fontFamily: 'Oswald' }}>
                    {mozoTotalOrdersCount}
                  </span>
                </div>
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total Facturado</span>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a', fontFamily: 'Oswald' }}>
                    Gs. {mozoTotalBilledAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Orders table */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Fecha / Hora</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Mesa / Grupo</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>Productos</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', fontWeight: 'bold', textAlign: 'right' }}>Total</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#475569', fontWeight: 'bold', textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mozoFilteredOrders.map(order => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#334155' }}>
                          {new Date(order.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>
                          {order.tableNumber} {order.subGroup && <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({order.subGroup})</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#334155' }}>
                          {order.items.map(it => `${it.quantity}x ${it.title}`).join(', ')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', textAlign: 'right' }}>
                          Gs. {order.total.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            backgroundColor: (() => {
                              switch(order.status) {
                                case 'pending': return '#fef3c7';
                                case 'accepted': return '#dbeafe';
                                case 'ready': return '#ffedd5';
                                case 'completed': return '#dcfce7';
                                case 'closed': return '#e2e8f0';
                                case 'cancelled': return '#fee2e2';
                                default: return '#f1f5f9';
                              }
                            })(),
                            color: (() => {
                              switch(order.status) {
                                case 'pending': return '#d97706';
                                case 'accepted': return '#2563eb';
                                case 'ready': return '#ea580c';
                                case 'completed': return '#16a34a';
                                case 'closed': return '#475569';
                                case 'cancelled': return '#dc2626';
                                default: return '#475569';
                              }
                            })()
                          }}>
                            {(() => {
                              switch(order.status) {
                                case 'pending': return 'Pendiente';
                                case 'accepted': return 'En Cocina';
                                case 'ready': return 'Listo';
                                case 'completed': return 'Entregado';
                                case 'closed': return 'Cerrado';
                                case 'cancelled': return 'Cancelado';
                                default: return order.status;
                              }
                            })()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {mozoFilteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                          No hay pedidos registrados para este mozo en las fechas seleccionadas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setShowMozoHistoryModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
