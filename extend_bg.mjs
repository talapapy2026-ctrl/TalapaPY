// Script para extender el fondo de emmy_burger.png horizontalmente
// Usa el API nativo de Node.js para escribir un HTML que hace el trabajo en canvas y lo guarda

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, 'emmy_burger.png');
const outputPath = path.join(__dirname, 'emmy_burger_wide.png');

// Lee la imagen original como base64
const imgBase64 = fs.readFileSync(inputPath).toString('base64');

// Genera un HTML que usa canvas para extender la imagen
const html = `<!DOCTYPE html>
<html>
<body>
<canvas id="c"></canvas>
<script>
  const TARGET_W = 1920;
  const TARGET_H = 900;

  const img = new Image();
  img.onload = () => {
    const canvas = document.getElementById('c');
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext('2d');

    // Paso 1: calcular tamanio "contain" de la imagen original
    const imgRatio = img.width / img.height;
    const canvasRatio = TARGET_W / TARGET_H;
    let dw, dh, dx, dy;
    if (imgRatio < canvasRatio) {
      dh = TARGET_H;
      dw = dh * imgRatio;
    } else {
      dw = TARGET_W;
      dh = dw / imgRatio;
    }
    dx = (TARGET_W - dw) / 2;
    dy = (TARGET_H - dh) / 2;

    // Paso 2: fondo - imagen estirada + blur fuerte
    ctx.filter = 'blur(40px) brightness(0.35) saturate(1.5)';
    ctx.drawImage(img, -60, -60, TARGET_W + 120, TARGET_H + 120);

    // Paso 3: imagen nitida contenida al centro, sin filtros
    ctx.filter = 'none';
    ctx.drawImage(img, dx, dy, dw, dh);

    // Exportar
    const dataUrl = canvas.toDataURL('image/png');
    document.title = dataUrl;
  };
  img.src = 'data:image/png;base64,${imgBase64}';
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'extend_helper.html'), html);
console.log('HTML generado: extend_helper.html');
console.log('Abre ese archivo en el navegador y presiona F12 > Console, luego escribe:');
console.log("  document.querySelector('canvas').toDataURL()");
