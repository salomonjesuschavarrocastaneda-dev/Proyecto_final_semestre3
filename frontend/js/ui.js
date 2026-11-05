/* MAGNUSSIG SIG — menú de usuario, menú hamburguesa y menú según el rol. */
(function () {
  const COLLAPSE_KEY = 'inventario.sidebarCollapsed';
  const ADMIN_VIEWS = ['categorias', 'reportes', 'usuarios'];
  const shell = $('appShell');
  const isDesktop = () => window.matchMedia('(min-width: 901px)').matches;
  const capitalize = text => String(text || '').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());

  // Nombre del usuario y datos del menú desplegable (después de que app.js inicia)
  document.addEventListener('DOMContentLoaded', () => {
  const user = session()?.user || {};
  const name = capitalize(user.nombre) || 'Usuario';
  const role = isAdmin() ? 'Administrador' : 'Empleado';
  $('topUserName').textContent = name;
  $('topUserRole').textContent = role;
  $('dropName').textContent = name;
  $('dropEmail').textContent = user.email || '';
  $('dropRole').textContent = role;
  $('dropRole').classList.toggle('admin', isAdmin());
  $('dropAvatar').textContent = $('userAvatar').textContent;
  // Tarjeta del usuario conectado en el menú lateral
  $('sideAvatar').textContent = $('userAvatar').textContent;
  $('sideName').textContent = name;
  $('sideRole').textContent = role;
  $('sideRole').classList.toggle('admin', isAdmin());
  $('sidebarUser').title = `${name} · ${role}`;
  const welcome = $('welcomeName');
  if (welcome) welcome.textContent = name;
  });

  // Opciones del menú lateral que solo ve el administrador
  document.querySelectorAll('[data-admin-only]').forEach(item => { item.hidden = !isAdmin(); });
  const originalChangeView = changeView;
  changeView = function (view) {
    if (ADMIN_VIEWS.includes(view) && !isAdmin()) {
      toast('Esta sección es solo para el administrador.', 'error');
      view = 'dashboard';
    }
    originalChangeView(view);
  };

  // Menú desplegable del usuario
  const menu = $('userMenu');
  const dropdown = $('userDropdown');
  const button = $('userMenuButton');
  const setOpen = open => {
    dropdown.hidden = !open;
    menu.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', event => { event.stopPropagation(); setOpen(dropdown.hidden); });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
  dropdown.querySelector('[data-goto="configuracion"]').addEventListener('click', () => { setOpen(false); changeView('configuracion'); });
  $('dropLogout').addEventListener('click', () => { setOpen(false); logout(); });

  // Menú hamburguesa: en computador contrae el menú; en celular lo abre como panel
  try { if (localStorage.getItem(COLLAPSE_KEY) === '1') shell.classList.add('sidebar-collapsed'); } catch (e) {}
  $('menuButton').addEventListener('click', () => {
    if (!isDesktop()) return; // en celular lo maneja app.js (menu-open)
    shell.classList.remove('menu-open');
    const collapsed = shell.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch (e) {}
  });
  // Texto accesible del botón ☰ según el estado (se actualiza después de los demás manejadores)
  const updateMenuButton = () => {
    const button = $('menuButton');
    if (isDesktop()) {
      const collapsed = shell.classList.contains('sidebar-collapsed');
      button.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
      button.setAttribute('aria-expanded', String(!collapsed));
    } else {
      const open = shell.classList.contains('menu-open');
      button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      button.setAttribute('aria-expanded', String(open));
    }
  };
  $('menuButton').addEventListener('click', () => setTimeout(() => { updateMenuButton(); fitSidebar(); }, 0));

  // En celular/tablet: cerrar el panel con la X, con Escape o al cambiar de tamaño
  const closeMobileMenu = () => { shell.classList.remove('menu-open'); updateMenuButton(); };
  $('sidebarClose').addEventListener('click', closeMobileMenu);
  $('sidebarScrim').addEventListener('click', () => setTimeout(updateMenuButton, 0));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMobileMenu(); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', closeMobileMenu);
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    if (!item.title) item.title = item.querySelector('.nav-label')?.textContent.trim() || '';
  });
  updateMenuButton();

  // Tarjeta "Estado del inventario" del menú lateral (usa los mismos datos del dashboard)
  const stockCard = $('sidebarStock');
  const nav = $('mainNav');
  const sidebar = $('sidebar');
  function fitSidebar() {
    // Se muestra solo si cabe sin quitar espacio a las opciones ni esconder "Cerrar sesión"
    if (!stockCard || stockCard.dataset.empty !== '0') return; // sin datos todavía
    stockCard.hidden = false;
    const overflow = nav.scrollHeight > nav.clientHeight + 1 || sidebar.scrollHeight > sidebar.clientHeight + 1;
    stockCard.hidden = overflow;
  }
  function renderSidebarStock() {
    if (!stockCard) return;
    if (resourceErrors.products) { stockCard.dataset.empty = '1'; stockCard.hidden = true; return; }
    const counts = getStatusCounts();
    const total = counts.disponible + counts.bajo + counts.agotado;
    $('stockTotal').textContent = `${total} ${total === 1 ? 'producto' : 'productos'}`;
    $('stockOk').textContent = counts.disponible;
    $('stockLow').textContent = counts.bajo;
    $('stockOut').textContent = counts.agotado;
    const pct = value => (total ? (value / total) * 100 : 0) + '%';
    $('stockBarOk').style.width = pct(counts.disponible);
    $('stockBarLow').style.width = pct(counts.bajo);
    $('stockBarOut').style.width = pct(counts.agotado);
    stockCard.dataset.empty = total ? '0' : '1';
    stockCard.hidden = !total;
    fitSidebar();
  }
  const originalRenderDashboard = renderDashboard;
  renderDashboard = function () {
    originalRenderDashboard.apply(this, arguments);
    renderSidebarStock();
  };
  stockCard?.addEventListener('click', event => {
    const button = event.target.closest('[data-stock-filter]');
    if (!button) return;
    changeView('productos');
    $('productStatusFilter').value = button.dataset.stockFilter;
    renderProducts();
  });
  if (window.ResizeObserver) new ResizeObserver(() => fitSidebar()).observe(sidebar);
  window.addEventListener('resize', fitSidebar);
})();
