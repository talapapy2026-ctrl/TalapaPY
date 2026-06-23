import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_FILE = path.resolve(__dirname, 'db.json')

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if ((net.family === 'IPv4' || (net.family as any) === 4) && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const defaultProducts = [
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

const defaultHero = {
  titleWhite: 'Auténtica',
  titleRed: 'Smash Burger',
  subtitle: 'CALIDAD PREMIUM',
  imageUrl: '/hero_model.png'
};

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
  return {
    products: defaultProducts,
    heroData: defaultHero,
    sales: [],
    editMode: false,
    mozos: [],
    qrOrders: []
  };
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-database-middleware',
      configureServer(server) {
        // IP Detection Endpoint
        server.middlewares.use('/api/ip', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ip: getLocalIp() }));
        });

        // Shared DB Endpoint
        server.middlewares.use('/api/data', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

          if (req.method === 'OPTIONS') {
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const db = readDb();
            res.end(JSON.stringify(db));
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                // Read current db to merge or validate if needed, but simple overwrite is fine for our client-side storage mirror
                writeDb(parsed);
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          }
        });
      },
      configurePreviewServer(server) {
        // IP Detection Endpoint
        server.middlewares.use('/api/ip', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ip: getLocalIp() }));
        });

        // Shared DB Endpoint
        server.middlewares.use('/api/data', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

          if (req.method === 'OPTIONS') {
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const db = readDb();
            res.end(JSON.stringify(db));
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                writeDb(parsed);
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          }
        });
      }
    }
  ],
  base: './',
  server: {
    host: true,
    allowedHosts: true
  },
  preview: {
    host: true,
    allowedHosts: true
  }
})
