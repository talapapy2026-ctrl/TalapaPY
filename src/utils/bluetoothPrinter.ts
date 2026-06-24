// Web Bluetooth Printer Manager for ESC/POS Thermal Printers

function textToBytes(text: string): Uint8Array {
  // Convert standard Latin-1/UTF-8 string to a basic 8-bit array for printers (with accent replacements for safety!)
  const accents: Record<string, string> = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U'
  };
  const cleanText = text.split('').map(char => accents[char] || char).join('');
  
  const bytes = new Uint8Array(cleanText.length);
  for (let i = 0; i < cleanText.length; i++) {
    bytes[i] = cleanText.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

async function writeInChunks(characteristic: any, data: Uint8Array) {
  const chunkSize = 20; // 20 bytes is the standard BLE MTU payload size limit for safety
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await characteristic.writeValue(chunk);
    // Add a tiny delay between writes to allow the printer to process
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

export async function connectBluetoothPrinter(): Promise<string> {
  if (!(navigator as any).bluetooth) {
    throw new Error("Tu navegador no soporta Web Bluetooth. Usa Google Chrome o Microsoft Edge en HTTPS.");
  }
  
  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '00001101-0000-1000-8000-00805f9b34fb', // SPP Serial Port
      '000018f0-0000-1000-8000-00805f9b34fb', // Portable printer service
      '49535343-fe7d-41aa-8fa5-a748b4ebe1e3'  // Microchip service
    ]
  });

  if (!device.gatt) {
    throw new Error("El dispositivo Bluetooth no tiene GATT.");
  }

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  
  let writeChar: any = null;
  
  // Search dynamically for a writable characteristic
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    for (const char of characteristics) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        writeChar = char;
        break;
      }
    }
    if (writeChar) break;
  }

  if (!writeChar) {
    throw new Error("No se encontro una caracteristica de escritura para imprimir.");
  }

  (window as any).bluetoothPrintDevice = device;
  (window as any).bluetoothPrintCharacteristic = writeChar;
  localStorage.setItem('talapa_connected_printer_name', device.name || 'Impresora Bluetooth');

  // Trigger custom event
  window.dispatchEvent(new Event('bluetooth_printer_changed'));

  return device.name || 'Impresora Bluetooth';
}

export function disconnectBluetoothPrinter() {
  const device = (window as any).bluetoothPrintDevice;
  if (device && device.gatt && device.gatt.connected) {
    device.gatt.disconnect();
  }
  (window as any).bluetoothPrintDevice = null;
  (window as any).bluetoothPrintCharacteristic = null;
  localStorage.removeItem('talapa_connected_printer_name');
  window.dispatchEvent(new Event('bluetooth_printer_changed'));
}

export function getConnectedPrinterName(): string | null {
  const dev = (window as any).bluetoothPrintDevice;
  const isConnected = dev && dev.gatt && dev.gatt.connected;
  if (isConnected) {
    return localStorage.getItem('talapa_connected_printer_name') || dev.name || 'Impresora Bluetooth';
  }
  return null;
}

export async function printBluetoothTableAccount(
  table: string, 
  mozoName: string, 
  items: Array<{ title: string; quantity: number; price: number }>
): Promise<boolean> {
  const char = (window as any).bluetoothPrintCharacteristic;
  if (!char) return false;

  const init = new Uint8Array([0x1b, 0x40]);
  const center = new Uint8Array([0x1b, 0x61, 0x01]);
  const left = new Uint8Array([0x1b, 0x61, 0x00]);
  const right = new Uint8Array([0x1b, 0x61, 0x02]);
  const boldOn = new Uint8Array([0x1b, 0x45, 0x01]);
  const boldOff = new Uint8Array([0x1b, 0x45, 0x00]);
  const doubleOn = new Uint8Array([0x1d, 0x21, 0x11]);
  const doubleOff = new Uint8Array([0x1d, 0x21, 0x00]);

  const grandTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const bytes: number[] = [];
  
  // Format Header
  bytes.push(...init);
  bytes.push(...center, ...boldOn, ...doubleOn);
  bytes.push(...textToBytes("TALAPA BURGER\n"));
  bytes.push(...doubleOff);
  bytes.push(...textToBytes("PRECUENTA\n"));
  bytes.push(...boldOff);
  
  bytes.push(...left);
  bytes.push(...textToBytes("--------------------------------\n"));
  bytes.push(...textToBytes(`FECHA: ${new Date().toLocaleString()}\n`));
  bytes.push(...textToBytes(`MESA:  ${table.toUpperCase()}\n`));
  bytes.push(...textToBytes(`MOZO:  ${mozoName}\n`));
  bytes.push(...textToBytes("--------------------------------\n"));
  bytes.push(...boldOn);
  bytes.push(...textToBytes("CANT PRODUCTO              SUBT\n"));
  bytes.push(...boldOff);
  bytes.push(...textToBytes("--------------------------------\n"));
  
  // Format Items
  items.forEach(item => {
    const qtyStr = `${item.quantity}x `;
    const subtotalStr = (item.price * item.quantity).toLocaleString();
    
    const nameMaxLen = 32 - qtyStr.length - subtotalStr.length;
    let nameStr = item.title;
    if (nameStr.length > nameMaxLen) {
      nameStr = nameStr.substring(0, nameMaxLen - 3) + "...";
    }
    
    const spacesCount = 32 - qtyStr.length - nameStr.length - subtotalStr.length;
    const spaces = " ".repeat(Math.max(1, spacesCount));
    
    bytes.push(...textToBytes(`${qtyStr}${nameStr}${spaces}${subtotalStr}\n`));
  });
  
  bytes.push(...textToBytes("--------------------------------\n"));
  bytes.push(...right, ...boldOn, ...doubleOn);
  bytes.push(...textToBytes(`TOTAL: Gs. ${grandTotal.toLocaleString()}\n`));
  bytes.push(...doubleOff, ...boldOff);
  bytes.push(...textToBytes("--------------------------------\n"));
  
  bytes.push(...center);
  bytes.push(...textToBytes("\n¡GRACIAS POR SU VISITA!\n\n\n\n"));
  
  try {
    const payload = new Uint8Array(bytes);
    await writeInChunks(char, payload);
    return true;
  } catch (err) {
    console.error("Error writing to bluetooth printer:", err);
    return false;
  }
}

export async function printBluetoothOrder(order: any): Promise<boolean> {
  const char = (window as any).bluetoothPrintCharacteristic;
  if (!char) return false;

  const init = new Uint8Array([0x1b, 0x40]);
  const center = new Uint8Array([0x1b, 0x61, 0x01]);
  const left = new Uint8Array([0x1b, 0x61, 0x00]);
  const boldOn = new Uint8Array([0x1b, 0x45, 0x01]);
  const boldOff = new Uint8Array([0x1b, 0x45, 0x00]);
  const doubleOn = new Uint8Array([0x1d, 0x21, 0x11]);
  const doubleOff = new Uint8Array([0x1d, 0x21, 0x00]);

  const bytes: number[] = [];
  
  bytes.push(...init);
  bytes.push(...center, ...boldOn, ...doubleOn);
  bytes.push(...textToBytes("TALAPA BURGER\n"));
  bytes.push(...doubleOff);
  bytes.push(...textToBytes("COMANDA DE COCINA\n"));
  bytes.push(...boldOff);
  
  bytes.push(...left);
  bytes.push(...textToBytes("--------------------------------\n"));
  bytes.push(...textToBytes(`REF:   #${order.id.slice(-5)}\n`));
  bytes.push(...textToBytes(`MESA:  ${order.tableNumber.toUpperCase()}\n`));
  if (order.subGroup) {
    bytes.push(...textToBytes(`GRUPO: ${order.subGroup.toUpperCase()}\n`));
  }
  bytes.push(...textToBytes(`FECHA: ${new Date(order.date).toLocaleTimeString()}\n`));
  bytes.push(...textToBytes("--------------------------------\n"));
  
  bytes.push(...boldOn, ...doubleOn);
  order.items.forEach((item: any) => {
    bytes.push(...textToBytes(`${item.quantity}x ${item.title}\n`));
  });
  bytes.push(...doubleOff, ...boldOff);
  
  bytes.push(...textToBytes("--------------------------------\n"));
  bytes.push(...center);
  bytes.push(...textToBytes("\n\n\n\n"));
  
  try {
    const payload = new Uint8Array(bytes);
    await writeInChunks(char, payload);
    return true;
  } catch (err) {
    console.error("Error writing order to bluetooth printer:", err);
    return false;
  }
}
