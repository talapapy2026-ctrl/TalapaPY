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
