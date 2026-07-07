// ESTADO GLOBAL
let isAdminMode = localStorage.getItem('ketchup_admin_logged') === 'true';

const defaultCatalog = [
  { id: '1', type: 'hamburguesa', title: 'Combo Cheeseburger', desc: 'Doble carne, doble cheddar, cebolla, pepinillo, kétchup y mostaza.', price: 'Gs. 43.000', img: 'cheeseburger.png' },
  { id: '2', type: 'hamburguesa', title: 'Combo Americano', desc: 'Doble carne, cheddar, tomate, lechuga, cebolla y Salsa Mil Islas.', price: 'Gs. 45.000', img: 'american_burger.png' },
  { id: '1b', type: 'hamburguesa', title: 'Emmy Burger', desc: 'Doble smash, cheddar madurado, cebolla caramelizada, salsa Emmy.', price: 'Gs. 48.000', img: 'emmy_burger.png' },
  { id: '1c', type: 'hamburguesa', title: 'Stacker Xtreme', desc: 'Triple carne, triple queso, panceta y salsa stacker.', price: 'Gs. 55.000', img: 'cheeseburger.png' },
  { id: '1d', type: 'hamburguesa', title: 'Classic Smash', desc: 'Simple y perfecta. Carne, queso, pan artesanal.', price: 'Gs. 30.000', img: 'american_burger.png' },
  { id: '3', type: 'extra', title: 'Papas Fritas', desc: 'Porción grande de papas fritas corte fino, saladas a la perfección.', price: 'Gs. 15.000', img: 'french_fries.png' },
  { id: '4', type: 'extra', title: 'Salsa Cheddar', desc: 'Porción extra de auténtico queso cheddar derretido.', price: 'Gs. 5.000', img: 'french_fries.png' },
  { id: '5', type: 'extra', title: 'Salsa Emmy', desc: 'Nuestra salsa secreta Emmy.', price: 'Gs. 6.000', img: 'french_fries.png' }
];

function getCatalog() {
  const stored = localStorage.getItem('ketchup_catalog');
  return stored ? JSON.parse(stored) : defaultCatalog;
}

function saveCatalog(data) {
  localStorage.setItem('ketchup_catalog', JSON.stringify(data));
}

// BANNERS STATE
const defaultBanners = [
  { id: 'b1', img: 'banner_emmy.png', scale: 100 },
  { id: 'b2', img: 'banner_stacker.png', scale: 100 },
  { id: 'b3', img: 'banner_simple.png', scale: 100 }
];

function getBanners() {
  const stored = localStorage.getItem('ketchup_banners');
  return stored ? JSON.parse(stored) : defaultBanners;
}

function saveBanners(data) {
  localStorage.setItem('ketchup_banners', JSON.stringify(data));
}

// SLIDER PREMIUM LOGIC
let currentSlide = 0;
let slides = document.querySelectorAll('.slide');
let slideInterval;

function showSlide(n) {
  slides = document.querySelectorAll('.slide');
  if(slides.length === 0) return;
  
  slides.forEach(s => {
    s.classList.remove('active');
  });
  
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
}

function moveSlide(step) {
  showSlide(currentSlide + step);
  resetInterval();
}

function resetInterval() {
  clearInterval(slideInterval);
  slideInterval = setInterval(() => moveSlide(1), 5000);
}

// NAVBAR SCROLL
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
});

function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  if(menu) menu.classList.toggle('open');
}

// MOCK PRODUCT MODAL PARA EL BENTO MENU
window.openProductModal = function(title, desc, price) {
  alert(`Abriendo producto: ${title}\n${desc}\nPrecio: ${price}\n(Implementar modal de carrito)`);
};

// RENDER CATALOG
let currentBurgerIndex = 0;

function updateBurgerCoverflow() {
  const container = document.getElementById('servicesGridContainer');
  if(!container) return;
  const cards = Array.from(container.querySelectorAll('.service-card'));
  if(cards.length === 0) return;

  cards.forEach((card, index) => {
    // Offset calculation with wrap-around
    let offset = index - currentBurgerIndex;
    
    if (cards.length > 3) {
       const half = Math.floor(cards.length / 2);
       if (offset > half) offset -= cards.length;
       if (offset < -half) offset += cards.length;
    }

    const absOffset = Math.abs(offset);
    
    // 3D Transforms
    const translateX = offset * 260; 
    const translateZ = absOffset * -150; 
    const rotateY = offset === 0 ? 0 : (offset > 0 ? -35 : 35); 
    const scale = offset === 0 ? 1.25 : 0.8;
    
    const zIndex = 100 - absOffset;
    const opacity = absOffset > 2 ? 0 : (offset === 0 ? 1 : 0.6); 

    card.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
    card.style.zIndex = zIndex;
    card.style.opacity = opacity;
    
    if (offset !== 0) {
      // Side cards act as navigation buttons
      card.onclick = (e) => {
        // Only trigger if clicking the card background/image, not the edit button
        if(!e.target.closest('.edit-overlay-btn')) {
          e.preventDefault();
          e.stopPropagation();
          currentBurgerIndex = index;
          updateBurgerCoverflow();
        }
      };
      // Dim content slightly
      card.style.filter = 'brightness(0.6)';
    } else {
      card.onclick = null;
      card.style.filter = 'brightness(1)';
    }
  });
}

function renderCatalog() {
  const catalog = getCatalog();
  const burgers = catalog.filter(c => c.type === 'hamburguesa');
  const extras = catalog.filter(c => c.type === 'extra');

  const bGrid = document.getElementById('servicesGridContainer');
  const eGrid = document.getElementById('extrasGridContainer');
  
  if(bGrid) {
    bGrid.innerHTML = burgers.map(b => createCard(b)).join('') + (isAdminMode ? createAddCard('hamburguesa') : '');
    // Reset index to center on first load
    currentBurgerIndex = Math.floor(burgers.length / 2);
    // Wait a tick for DOM to render then apply 3D positions
    setTimeout(updateBurgerCoverflow, 50);
  }
  
  if(eGrid) eGrid.innerHTML = extras.map(e => createCard(e)).join('') + (isAdminMode ? createAddCard('extra') : '');

  // Toggle edit buttons
  const editBtns = document.querySelectorAll('.edit-overlay-btn');
  editBtns.forEach(btn => btn.style.display = isAdminMode ? 'block' : 'none');
  
  // Hero/Banner edit btn
  const adminBannersBtn = document.getElementById('adminBannersBtn');
  if(adminBannersBtn) adminBannersBtn.style.display = isAdminMode ? 'block' : 'none';
}

function renderBanners() {
  const banners = getBanners();
  const sliderContainer = document.getElementById('heroSlider');
  if(!sliderContainer) return;

  if(banners.length === 0) {
    sliderContainer.innerHTML = `<div class="slide active"><div style="color:white;">Sin Banners</div></div>`;
  } else {
    sliderContainer.innerHTML = banners.map((b, i) => {
      const scale = b.scale || 100;
      return `
      <div class="slide">
        <div id="fg_banner_${b.id}" class="slide-bg-img" style="background-image:url('${b.img}'); transform:scale(${scale / 100}); transition: transform 0.1s ease-out;"></div>
      </div>
      `;
    }).join('');
  }

  showSlide(0);
}

function createCard(item) {
  return `
    <div class="service-card">
      ${isAdminMode ? `<button class="edit-overlay-btn" onclick="openEditModal('${item.id}')"><i class="fas fa-pencil-alt"></i></button>` : ''}
      <img src="${item.img}" class="service-image" alt="${item.title}">
      <div class="service-content">
        <h3>${item.title}</h3>
        <div class="service-price">${item.price}</div>
        <p>${item.desc}</p>
        <button class="btn-outline" style="width: 100%; margin-top: auto;" onclick="alert('Funcionalidad de carrito próximamente')">Agregar al Pedido</button>
      </div>
    </div>
  `;
}

function createAddCard(type) {
  return `
    <div class="add-new-card" onclick="openNewModal('${type}')">
      <i class="fas fa-plus-circle"></i>
      <span>Agregar ${type}</span>
    </div>
  `;
}

// ADMIN LOGIN
function openAdminLogin() {
  const currentRole = localStorage.getItem('ketchup_role');
  if (currentRole) {
    openDashboard(currentRole);
  } else {
    document.getElementById('loginModal').style.display = 'flex';
  }
}
function closeAdminLogin() { document.getElementById('loginModal').style.display = 'none'; }
function attemptLogin() {
  const pass = document.getElementById('adminPassword').value;
  let role = null;
  
  if (pass === '123456') role = 'admin';
  else if (pass === 'mozo') role = 'mozo';
  else if (pass === 'cocina') role = 'cocina';
  else if (pass === 'delivery') role = 'delivery';
  
  if (role) {
    localStorage.setItem('ketchup_role', role);
    if(role === 'admin') {
      isAdminMode = true;
      localStorage.setItem('ketchup_admin_logged', 'true');
      renderCatalog();
      renderBanners();
    }
    closeAdminLogin();
    document.getElementById('adminPassword').value = '';
    openDashboard(role);
  } else {
    alert('Contraseña incorrecta');
  }
}

// DASHBOARD LOGIC
let orders = JSON.parse(localStorage.getItem('ketchup_orders') || '[]');
let mozoCartItems = [];

function saveOrders() {
  localStorage.setItem('ketchup_orders', JSON.stringify(orders));
  renderCocina();
  renderDelivery();
}

function openDashboard(role) {
  document.getElementById('dashboardContainer').style.display = 'flex';
  document.getElementById('roleBadge').innerText = role.toUpperCase();
  
  // Ocultar todas las pestañas primero
  document.querySelectorAll('.dash-tab').forEach(t => t.style.display = 'none');
  
  if (role === 'admin') {
    document.querySelectorAll('.dash-tab').forEach(t => t.style.display = 'flex');
    switchTab('menu');
  } else if (role === 'mozo') {
    document.getElementById('tabMozo').style.display = 'flex';
    switchTab('mozo');
  } else if (role === 'cocina') {
    document.getElementById('tabCocina').style.display = 'flex';
    switchTab('cocina');
  } else if (role === 'delivery') {
    document.getElementById('tabDelivery').style.display = 'flex';
    switchTab('delivery');
  }
}

function logoutAdmin() {
  localStorage.removeItem('ketchup_role');
  localStorage.removeItem('ketchup_admin_logged');
  isAdminMode = false;
  document.getElementById('dashboardContainer').style.display = 'none';
  renderCatalog();
}

function closeDashboardAndEdit() {
  document.getElementById('dashboardContainer').style.display = 'none';
}

function switchTab(tabId) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.add('active');
  
  document.querySelectorAll('.dash-view').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + tabId).style.display = 'block';
  
  if (tabId === 'mozo') renderMozoCatalog();
  if (tabId === 'cocina') renderCocina();
  if (tabId === 'delivery') renderDelivery();
}

// MOZO
function renderMozoCatalog() {
  const catalog = getCatalog();
  const grid = document.getElementById('mozoCatalogGrid');
  grid.innerHTML = catalog.map(item => `
    <button class="mozo-item-btn" onclick="addToMozoCart('${item.id}')">
      <strong>${item.title}</strong><br>
      <span style="color:var(--ks-kinpaku-gold); font-size:12px;">${item.price}</span>
    </button>
  `).join('');
  renderMozoCart();
}

function addToMozoCart(id) {
  const item = getCatalog().find(c => c.id === id);
  if(item) {
    mozoCartItems.push(item);
    renderMozoCart();
  }
}

function removeFromMozoCart(index) {
  mozoCartItems.splice(index, 1);
  renderMozoCart();
}

function renderMozoCart() {
  const cartDiv = document.getElementById('mozoCart');
  let totalNum = 0;
  if(mozoCartItems.length === 0) {
    cartDiv.innerHTML = '<p style="color:var(--ks-text-muted);">El carrito está vacío</p>';
  } else {
    cartDiv.innerHTML = mozoCartItems.map((item, index) => {
      const p = parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
      totalNum += p;
      return `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid var(--ks-hairline); padding-bottom:5px;">
          <span>${item.title}</span>
          <span>
            <span style="color:var(--ks-kinpaku-gold); margin-right:10px;">${item.price}</span>
            <button onclick="removeFromMozoCart(${index})" style="background:transparent; border:none; color:#ff5f56; cursor:pointer;"><i class="fas fa-times"></i></button>
          </span>
        </div>
      `;
    }).join('');
  }
  document.getElementById('mozoTotal').innerText = 'Gs. ' + totalNum.toLocaleString();
}

function sendOrderToKitchen() {
  const table = document.getElementById('mozoTableInput').value.trim();
  if(!table) return alert('Ingresa la mesa o el destino');
  if(mozoCartItems.length === 0) return alert('El carrito está vacío');
  
  const newOrder = {
    id: 'PED-' + Date.now().toString().slice(-6),
    table: table,
    items: mozoCartItems.map(i => i.title),
    status: 'pending',
    date: new Date().toLocaleTimeString()
  };
  
  orders.push(newOrder);
  saveOrders();
  mozoCartItems = [];
  document.getElementById('mozoTableInput').value = '';
  renderMozoCart();
  alert('Pedido enviado a cocina: ' + newOrder.id);
}

// COCINA
function renderCocina() {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const grid = document.getElementById('cocinaGrid');
  if(pendingOrders.length === 0) {
    grid.innerHTML = '<p style="color:var(--ks-text-muted);">No hay pedidos pendientes para preparar.</p>';
    return;
  }
  grid.innerHTML = pendingOrders.map(o => `
    <div class="order-card">
      <div class="order-card-header">
        <span class="order-card-title">Mesa: ${o.table}</span>
        <span class="order-status-badge status-pending">PREPARANDO</span>
      </div>
      <div class="order-items">
        <ul style="padding-left:20px;">
          ${o.items.map(i => `<li style="margin-bottom:5px;">${i}</li>`).join('')}
        </ul>
      </div>
      <button class="btn-primary full" style="background:#4caf50; color:white;" onclick="updateOrderStatus('${o.id}', 'ready')"><i class="fas fa-check"></i> Marcar Listo</button>
    </div>
  `).join('');
}

// DELIVERY
function renderDelivery() {
  const readyOrders = orders.filter(o => o.status === 'ready');
  const grid = document.getElementById('deliveryGrid');
  if(readyOrders.length === 0) {
    grid.innerHTML = '<p style="color:var(--ks-text-muted);">No hay pedidos listos para despachar.</p>';
    return;
  }
  grid.innerHTML = readyOrders.map(o => `
    <div class="order-card">
      <div class="order-card-header">
        <span class="order-card-title">Mesa/Destino: ${o.table}</span>
        <span class="order-status-badge status-ready">LISTO</span>
      </div>
      <div class="order-items">
        <strong>${o.id}</strong> - ${o.items.length} items
      </div>
      <button class="btn-outline full" style="border-color:#9e9e9e; color:#9e9e9e;" onclick="updateOrderStatus('${o.id}', 'delivered')"><i class="fas fa-motorcycle"></i> Despachar / Entregar</button>
    </div>
  `).join('');
}

function updateOrderStatus(id, status) {
  const order = orders.find(o => o.id === id);
  if(order) {
    order.status = status;
    saveOrders();
  }
}


// EDIT MODAL
let currentEditingId = null;

function openEditModal(id) {
  const catalog = getCatalog();
  const item = catalog.find(c => c.id === id);
  if(!item) return;

  currentEditingId = id;
  document.getElementById('editItemId').value = id;
  document.getElementById('editItemType').value = item.type;
  document.getElementById('editTitle').value = item.title;
  document.getElementById('editDesc').value = item.desc;
  document.getElementById('editPrice').value = item.price;
  
  if(item.img && !item.img.includes('placeholder')) {
    document.getElementById('imagePreviewImg').src = item.img;
    document.getElementById('imagePreviewImg').style.display = 'block';
    document.getElementById('imagePreviewPlaceholder').style.display = 'none';
  } else {
    document.getElementById('imagePreviewImg').style.display = 'none';
    document.getElementById('imagePreviewPlaceholder').style.display = 'block';
  }
  
  document.getElementById('editModal').style.display = 'flex';
}

function openNewModal(type) {
  currentEditingId = null;
  document.getElementById('editItemId').value = '';
  document.getElementById('editItemType').value = type;
  document.getElementById('editTitle').value = '';
  document.getElementById('editDesc').value = '';
  document.getElementById('editPrice').value = '';
  document.getElementById('imagePreviewImg').src = '';
  document.getElementById('imagePreviewImg').style.display = 'none';
  document.getElementById('imagePreviewPlaceholder').style.display = 'block';
  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

function handleImageUpload(e) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      document.getElementById('imagePreviewImg').src = evt.target.result;
      document.getElementById('imagePreviewImg').style.display = 'block';
      document.getElementById('imagePreviewPlaceholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

function saveEdit() {
  const catalog = getCatalog();
  const id = document.getElementById('editItemId').value || Date.now().toString();
  const type = document.getElementById('editItemType').value;
  const title = document.getElementById('editTitle').value;
  const desc = document.getElementById('editDesc').value;
  const price = document.getElementById('editPrice').value;
  const imgElement = document.getElementById('imagePreviewImg');
  const img = imgElement.src || '';

  const index = catalog.findIndex(c => c.id === id);
  if(index > -1) {
    catalog[index] = { ...catalog[index], title, desc, price, img };
  } else {
    catalog.push({ id, type, title, desc, price, img });
  }

  saveCatalog(catalog);
  closeEditModal();
  renderCatalog();
}

// BANNER ADMIN MODAL
function openBannerAdmin() {
  document.getElementById('bannerAdminModal').style.display = 'flex';
  renderBannerAdminList();
}

function closeBannerAdmin() {
  document.getElementById('bannerAdminModal').style.display = 'none';
}

function renderBannerAdminList() {
  const banners = getBanners();
  const listContainer = document.getElementById('bannerAdminList');
  
  if (banners.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; color:#888;">No hay banners. Agrega uno nuevo.</p>';
    return;
  }
  
  listContainer.innerHTML = banners.map(b => {
    const scale = b.scale || 100;
    return `
    <div style="background:var(--ks-graphite); padding:15px; border-radius:var(--radius-sm); margin-bottom:15px; border:1px solid var(--ks-hairline);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px;">
        <img src="${b.img}" style="height:50px; width:80px; object-fit:contain; border-radius:4px; background:var(--ks-lacquer-deep);">
        <button class="btn-outline" title="Eliminar" style="padding:6px 12px; color:#ff5f56; border-color:#ff5f56;" onclick="deleteBanner('${b.id}')"><i class="fas fa-trash"></i></button>
      </div>
      <div>
        <label style="font-family:var(--font-mono); font-size:10px; font-weight:500; text-transform:uppercase; color:var(--ks-text-muted); display:block; margin-bottom:5px; letter-spacing:0.1em;">Tamaño: <span id="scale_val_${b.id}">${scale}%</span></label>
        <input type="range" min="50" max="250" value="${scale}" style="width:100%; cursor:pointer;" 
               oninput="updateBannerScale('${b.id}', this.value)">
      </div>
    </div>
  `}).join('');
}

function updateBannerScale(id, value) {
  // Update visual text
  const valEl = document.getElementById('scale_val_' + id);
  if(valEl) valEl.innerText = value + '%';
  
  // Live DOM update for smooth UX
  const fg = document.getElementById('fg_banner_' + id);
  if(fg) fg.style.transform = `scale(${value / 100})`;
  
  // Save quietly
  let banners = getBanners();
  const index = banners.findIndex(b => b.id === id);
  if(index > -1) {
    banners[index].scale = parseInt(value);
    saveBanners(banners);
  }
}

function deleteBanner(id) {
  if(!confirm('¿Estás seguro de eliminar este banner?')) return;
  let banners = getBanners();
  banners = banners.filter(b => b.id !== id);
  saveBanners(banners);
  renderBannerAdminList();
  renderBanners();
}

function handleBannerUpload(e) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const imgData = evt.target.result;
      const banners = getBanners();
      banners.push({
        id: 'b_' + Date.now().toString(),
        img: imgData,
        scale: 100
      });
      saveBanners(banners);
      renderBannerAdminList();
      renderBanners();
      // Reset input
      document.getElementById('newBannerInput').value = '';
    };
    reader.readAsDataURL(file);
  }
}

// MOUSE DRAG TO SCROLL PARA CARROUSELES
function enableDragScroll(slider) {
  if(!slider) return;
  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    slider.style.cursor = 'grabbing';
    slider.style.scrollSnapType = 'none'; // Disable snap while dragging
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });
  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.style.cursor = 'grab';
    slider.style.scrollSnapType = 'x mandatory';
  });
  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.style.cursor = 'grab';
    slider.style.scrollSnapType = 'x mandatory';
  });
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    slider.scrollLeft = scrollLeft - walk;
  });
  slider.style.cursor = 'grab';
}

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
  renderBanners();
  renderCatalog();
  resetInterval();
  
  // Enable grab scrolling ONLY on extras, since services grid is 3D Coverflow
  enableDragScroll(document.getElementById('extrasGridContainer'));
});
