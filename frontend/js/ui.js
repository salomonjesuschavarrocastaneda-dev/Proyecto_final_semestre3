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
  // En celular/tablet: cerrar el panel con la X, con Escape o al cambiar a computador
  const closeMobileMenu = () => shell.classList.remove('menu-open');
  $('sidebarClose').addEventListener('click', closeMobileMenu);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMobileMenu(); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', closeMobileMenu);
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    if (!item.title) item.title = item.querySelector('.nav-label')?.textContent.trim() || '';
  });
})();
