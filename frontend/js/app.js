/* MAGNUSSIG SIG — inventario conectado a la API Django. */
const API_BASE=localStorage.getItem('inventario.apiBase')||'http://127.0.0.1:3000/api';
const SESSION_KEY='inventario.session';
const $=id=>document.getElementById(id);
const session=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY));}catch{return null;}};
const isAdmin=()=>['Administrador','Admin'].includes(session()?.user?.rol)||Boolean(session()?.user?.is_staff);
const demoKey='inventario.demoState';
const today=()=>new Date().toISOString().slice(0,10);
const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=s=>s?new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(s+'T12:00:00')):'—';
function initialState(){return {categories:[{id:1,nombre:'Ciberseguridad',descripcion:'Equipos y herramientas de protección de información'},{id:2,nombre:'Consultoría e ingeniería',descripcion:'Recursos para proyectos de consultoría técnica'},{id:3,nombre:'Desarrollo de software',descripcion:'Equipos, periféricos y licencias de desarrollo'},{id:4,nombre:'Redes e infraestructura',descripcion:'Conectividad e infraestructura tecnológica'},{id:5,nombre:'Consumibles',descripcion:'Insumos y accesorios generales'}],products:[{id:1,codigo:'MAG-001',nombre:'Portátil empresarial',categoria_id:3,categoria:'Desarrollo de software',descripcion:'Equipo para desarrollo y consultoría',precio:3250000,stock:8,stock_minimo:3,estado:'activo',creado:today()},{id:2,codigo:'MAG-002',nombre:'Switch administrable 24 puertos',categoria_id:4,categoria:'Redes e infraestructura',descripcion:'Switch para infraestructura de red',precio:980000,stock:2,stock_minimo:4,estado:'activo',creado:today()},{id:3,codigo:'MAG-003',nombre:'Token de seguridad USB',categoria_id:1,categoria:'Ciberseguridad',descripcion:'Autenticación multifactor',precio:165000,stock:0,stock_minimo:5,estado:'activo',creado:today()},{id:4,codigo:'MAG-004',nombre:'Disco SSD 1 TB',categoria_id:3,categoria:'Desarrollo de software',descripcion:'Unidad de almacenamiento',precio:295000,stock:16,stock_minimo:5,estado:'activo',creado:today()},{id:5,codigo:'MAG-005',nombre:'Punto de acceso Wi-Fi 6',categoria_id:4,categoria:'Redes e infraestructura',descripcion:'Acceso inalámbrico corporativo',precio:680000,stock:4,stock_minimo:4,estado:'activo',creado:today()},{id:6,codigo:'MAG-006',nombre:'Kit herramientas técnicas',categoria_id:2,categoria:'Consultoría e ingeniería',descripcion:'Kit para trabajo técnico en campo',precio:210000,stock:7,stock_minimo:2,estado:'activo',creado:today()}],movements:[],users:[{id:1,nombre:'Administrador MAGNUSSIG',email:'admin@magnussig.com',rol:'Administrador',estado:'Activo',creado:today()}],nextProductId:7,nextMovementId:1,nextCategoryId:6};}
function getLocal() {
    const base = initialState();

    try {
        const saved = JSON.parse(localStorage.getItem(demoKey));

        if (!saved || !Array.isArray(saved.products)) {
            return base;
        }

        return {
            ...base,
            ...saved,

            categories: Array.isArray(saved.categories)
                ? saved.categories
                : base.categories,

            products: saved.products,

            movements: Array.isArray(saved.movements)
                ? saved.movements
                : [],

            users: Array.isArray(saved.users)
                ? saved.users
                : base.users,

            nextProductId: saved.nextProductId ?? base.nextProductId,
            nextMovementId: saved.nextMovementId ?? base.nextMovementId,
            nextCategoryId: saved.nextCategoryId ?? base.nextCategoryId
        };

    } catch (error) {
        console.error("Error al cargar los datos locales:", error);
        return base;
    }
}
let state={categories:[],products:[],movements:[],sales:[],users:[]};
let useApi=false;
const resourceErrors={};
let dashboardSummary=null;
let helpTickets=[];
let selectedHelpId=null;
let saleCart=[];
let helpRefreshTimer=null;
async function apiRequest(path,options={}){
    const token=session()?.token;
    if(!token||token==='demo-token')throw new Error('La sesión no contiene un token válido. Inicia sesión nuevamente.');
    const headers={'Content-Type':'application/json',...(options.headers||{}),Authorization:`Token ${token}`};
    let response;
    const baseUrl=new URL(API_BASE,window.location.href);
    const requestUrl=/^https?:\/\//i.test(path)?new URL(path):new URL(`${API_BASE.replace(/\/$/,'')}${path}`,window.location.href);
    if(requestUrl.origin!==baseUrl.origin||!requestUrl.pathname.startsWith(baseUrl.pathname.replace(/\/$/,'')))throw new Error('La API devolvió una dirección de paginación no válida.');
    try{response=await fetch(requestUrl.href,{...options,headers});}
    catch{throw new Error('No fue posible conectar con Django. Verifica el backend y la dirección de la API.');}
    const data=response.status===204?null:await response.json().catch(()=>null);
    if(!response.ok){
        if(response.status===401){localStorage.removeItem(SESSION_KEY);location.replace('login.html');}
        if(response.status>=500)throw new Error(`Django devolvió un error interno (HTTP ${response.status}). Revisa la terminal del backend para conocer la causa y comprueba el listado antes de volver a enviar el producto.`);
        const flattenErrors=value=>Array.isArray(value)?value.flatMap(flattenErrors):value&&typeof value==='object'?Object.values(value).flatMap(flattenErrors):value==null?[]:[String(value)];
        const message=data?.detail||data?.error||flattenErrors(data).join(' ')||`La solicitud falló (HTTP ${response.status}).`;
        throw new Error(message);
    }
    return data;
}
function persist(){throw new Error('La persistencia local está deshabilitada. Los cambios deben guardarse en Django.');}
function listFromResponse(data){return Array.isArray(data)?data:(data?.results||data?.data||[]);}
async function apiList(path){const results=[];const visited=new Set();let next=path;while(next){if(visited.has(next))throw new Error('La API devolvió una paginación repetida.');visited.add(next);const page=await apiRequest(next);results.push(...listFromResponse(page));next=page?.next||null;}return results;}
async function loadResource(key,path,normalize=(data)=>listFromResponse(data)){
    try{
        const data=await apiList(path);
        state[key]=normalize(data);
        delete resourceErrors[key];
    }catch(error){
        state[key]=[];
        resourceErrors[key]=error.message;
    }
}
async function refreshResources(){
    await Promise.all([
        loadResource('products','/productos/',(data)=>listFromResponse(data).map((item)=>({
            ...item,
            categoria_id:item.categoria_id??item.categoria,
            categoria:item.categoria_nombre||state.categories.find((category)=>category.id===Number(item.categoria_id??item.categoria))?.nombre||'Sin categoría'
        }))),
        loadResource('categories','/categorias/'),
        loadResource('movements','/movimientos/',(data)=>listFromResponse(data).map((item)=>({...item,producto_id:item.producto_id??item.producto}))),
        loadResource('sales','/ventas/'),
        isAdmin()?loadResource('users','/usuarios/'):Promise.resolve().then(()=>{state.users=[];delete resourceErrors.users;}),
        (async()=>{
            try{dashboardSummary=await apiRequest('/dashboard/');delete resourceErrors.dashboard;}
            catch(error){dashboardSummary=null;resourceErrors.dashboard=error.message;}
        })()
    ]);
}
function toast(message,type='success'){const region=$('toastRegion'),node=document.createElement('div');node.className=`toast ${type}`;node.textContent=message;region.append(node);setTimeout(()=>node.remove(),3600);}
function inventoryProducts(){return state.products.filter(product=>product.estado==='activo');}
function status(p){if(Number(p.stock)===0)return'agotado';if(Number(p.stock)<=Number(p.stock_minimo))return'bajo';return'disponible';}
function statusHtml(p){if(p.estado!=='activo')return'<span class="status-pill status-inactive">Inactivo</span>';const s=status(p);return `<span class="status-pill ${s==='disponible'?'status-available':s==='bajo'?'status-low':'status-out'}">${s==='disponible'?'Disponible':s==='bajo'?'Stock bajo':'Agotado'}</span>`;}
function expiryHtml(p){if(!p.fecha_caducidad)return'';const days=Math.ceil((new Date(`${p.fecha_caducidad}T00:00:00`)-new Date(`${today()}T00:00:00`))/86400000);if(days<0)return'<br><span class="status-pill status-out">Caducado</span>';if(days<=30)return'<br><span class="status-pill status-low">Vence pronto</span>';return'';}
function changeView(name){const allowed=['dashboard','productos','categorias','movimientos','ventas','usuarios','reportes','configuracion'];if(!allowed.includes(name))name='dashboard';if(name==='usuarios'&&!isAdmin()){toast('Solo el administrador puede consultar usuarios.','error');name='dashboard';}document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('breadcrumbTitle').textContent=name.charAt(0).toUpperCase()+name.slice(1);const renderers={dashboard:renderDashboard,productos:renderProducts,categorias:renderCategories,movimientos:renderMovements,ventas:renderSales,usuarios:renderUsers,reportes:renderReports,configuracion:updateConnectionStatus};renderModule(name,renderers[name]);if(!isAdmin())document.querySelectorAll('#attentionBody [data-edit-product]').forEach(button=>{button.hidden=true;});$('appShell').classList.remove('menu-open');location.hash=name;}
function getStatusCounts(){return inventoryProducts().reduce((o,p)=>(o[status(p)]++,o),{disponible:0,bajo:0,agotado:0});}
function metric(icon,tone,title,value,foot){const valueClass=title==='Valor del inventario'?'metric-value metric-value-inventory':'metric-value';return `<article class="metric-card"><div class="metric-top"><span>${title}</span><span class="metric-icon ${tone}">${icon}</span></div><div class="${valueClass}">${value}</div><div class="metric-foot">${foot}</div></article>`;}
function renderDashboard(){const active=inventoryProducts(),c=getStatusCounts(),valuation=dashboardSummary?.valor_inventario??active.reduce((n,p)=>n+Number(p.precio)*Number(p.stock),0),productLoadError=resourceErrors.products;const productCount=productLoadError?'—':dashboardSummary?.total_productos??active.length;const units=productLoadError?'—':dashboardSummary?.unidades??active.reduce((sum,p)=>sum+Number(p.stock),0);$('metricGrid').innerHTML=metric('▦','blue','Total de productos',productCount,'Referencias registradas')+metric('∑','green','Unidades existentes',units,'Unidades en inventario')+metric('!','amber','Stock bajo',productLoadError?'—':dashboardSummary?.stock_bajo??c.bajo,'Requieren revisión')+metric('×','red','Agotados',productLoadError?'—':dashboardSummary?.agotados??c.agotado,'Sin unidades disponibles')+metric('$','blue','Valor del inventario',productLoadError?'—':money(valuation),'Según precios registrados');$('navProducts').textContent=productLoadError?'—':active.length;$('welcomeName').textContent=session()?.user?.nombre||'Usuario';$('todayDate').textContent=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',year:'numeric'}).format(new Date());$('settingsSessionUser').textContent=session()?.user?.email||'Usuario';$('connectionStatus').textContent=useApi?'API conectada':'Sin conexión';$('connectionStatus').className=`status-pill ${useApi?'status-active':'status-inactive'}`;const rows=active.filter(p=>status(p)!=='disponible').sort((a,b)=>a.stock-b.stock);$('attentionBody').innerHTML=productLoadError?`<tr><td colspan="7" class="error-row">${esc(productLoadError)}</td></tr>`:rows.length?rows.map(p=>`<tr><td><span class="code-pill">${esc(p.codigo)}</span></td><td><b>${esc(p.nombre)}</b></td><td>${esc(p.categoria||catName(p.categoria_id))}</td><td>${p.stock}</td><td>${p.stock_minimo}</td><td>${statusHtml(p)}</td><td><button class="btn btn-secondary btn-small" data-edit-product="${p.id}">Editar</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty-row">No hay productos que requieran atención.</td></tr>';renderChart();}
function renderChart(){if(resourceErrors.movements){$('movementChart').innerHTML=`<p class="error-row">${esc(resourceErrors.movements)}</p>`;return;}const d=state.movements.filter(m=>m.tipo==='entrada'||m.tipo==='salida'),days=Number($('chartRange')?.value||7),labels=[];for(let i=days-1;i>=0;i--){const date=new Date();date.setDate(date.getDate()-i);labels.push({key:date.toISOString().slice(0,10),label:new Intl.DateTimeFormat('es-CO',{weekday:'short'}).format(date).replace('.','')});}const vals=labels.map(x=>({label:x.label,in:d.filter(m=>m.fecha===x.key&&m.tipo==='entrada').reduce((s,m)=>s+Number(m.cantidad),0),out:d.filter(m=>m.fecha===x.key&&m.tipo==='salida').reduce((s,m)=>s+Number(m.cantidad),0)}));const max=Math.max(5,...vals.flatMap(x=>[x.in,x.out])),W=680,H=205,left=30,top=10,bottom=28,innerH=H-top-bottom,group=(W-left-10)/vals.length,bar=Math.min(18,group/3);let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de entradas y salidas">`;for(let i=0;i<=4;i++){const y=top+innerH-(innerH*i/4);svg+=`<line x1="${left}" y1="${y}" x2="${W-5}" y2="${y}" stroke="#e8edf4"/><text x="${left-7}" y="${y+4}" font-size="10" fill="#8a95a7" text-anchor="end">${Math.round(max*i/4)}</text>`;}vals.forEach((v,i)=>{const x=left+group*i+group/2,hi=innerH*v.in/max,ho=innerH*v.out/max;svg+=`<rect x="${x-bar-2}" y="${top+innerH-hi}" width="${bar}" height="${hi}" rx="3" fill="#2a68df"/><rect x="${x+2}" y="${top+innerH-ho}" width="${bar}" height="${ho}" rx="3" fill="#f5a623"/><text x="${x}" y="${H-7}" font-size="10" fill="#8792a3" text-anchor="middle">${esc(v.label)}</text>`;});$('movementChart').innerHTML=svg+'</svg>';}
function catName(id){return state.categories.find(c=>c.id===Number(id))?.nombre||'Sin categoría';}
function renderProducts(){if(resourceErrors.products){$('productsBody').innerHTML=`<tr><td colspan="8" class="error-row">${esc(resourceErrors.products)}</td></tr>`;$('productsFooter').textContent='Los datos no están disponibles.';return;}const q=($('productSearch').value||'').toLowerCase(),st=$('productStatusFilter').value;const rows=state.products.filter(p=>{const matchesSearch=`${p.nombre} ${p.codigo} ${p.categoria||catName(p.categoria_id)} ${p.lote||''}`.toLowerCase().includes(q),matchesStatus=st==='todos'||(st==='inactivos'?p.estado!=='activo':p.estado==='activo'&&(st==='activos'||status(p)===st));return matchesSearch&&matchesStatus;});$('productsBody').innerHTML=rows.length?rows.map(p=>`<tr><td><span class="code-pill">${esc(p.codigo)}</span></td><td><b>${esc(p.nombre)}</b><br><small>${esc(p.unidad_medida||'unidad')}${p.lote?` · Lote ${esc(p.lote)}`:''}${p.fecha_caducidad?` · Vence ${fmtDate(p.fecha_caducidad)}`:''}</small></td><td>${esc(p.categoria_nombre||p.categoria||catName(p.categoria_id))}</td><td>${money(p.precio)}</td><td><b>${p.stock}</b></td><td>${p.stock_minimo}</td><td>${statusHtml(p)}${p.estado==='activo'?expiryHtml(p):''}</td><td>${isAdmin()?`<div class="table-actions"><button data-edit-product="${p.id}">Editar</button><button data-delete-product="${p.id}">Eliminar</button></div>`:'—'}</td></tr>`).join(''):'<tr><td colspan="8" class="empty-row">No se encontraron productos.</td></tr>';$('productsFooter').textContent=`Mostrando ${rows.length} productos · ${inventoryProducts().length} activos · Valor del inventario activo: ${money(inventoryProducts().reduce((s,p)=>s+Number(p.precio)*Number(p.stock),0))}`;}
function renderCategories(){if(resourceErrors.categories){$('categoryGrid').innerHTML=`<p class="error-row">${esc(resourceErrors.categories)}</p>`;return;}const q=($('categorySearch').value||'').trim().toLowerCase();const categories=state.categories.map(category=>{const products=inventoryProducts().filter(product=>Number(product.categoria_id)===Number(category.id)||product.categoria_nombre===category.nombre||product.categoria===category.nombre);const matches=products.filter(product=>`${product.nombre} ${product.codigo} ${product.descripcion||''} ${category.nombre}`.toLowerCase().includes(q));return {category,products,matches,categoryMatches:`${category.nombre} ${category.descripcion||''}`.toLowerCase().includes(q)};}).filter(item=>!q||item.categoryMatches||item.matches.length);$('categoryGrid').innerHTML=categories.length?categories.map(({category,products,matches},i)=>`<article class="category-card"><span class="category-icon">${['◇','⌘','▧','⌁','▤'][i%5]}</span><div><h3>${esc(category.nombre)}${category.activa===false?' · Inactiva':''}</h3><p>${esc(category.descripcion||'Sin descripción')}</p><div class="count">${products.length} productos activos</div>${q?`<div class="category-matches">${matches.length?matches.map(product=>`<div class="category-match"><b>${esc(product.nombre)}</b><span>${esc(product.codigo)} · categoría ${esc(category.nombre)}</span><small>Stock: ${product.stock} ${esc(product.unidad_medida||'unidad')}</small></div>`).join(''):'<small>Sin coincidencias de producto.</small>'}</div>`:''}${isAdmin()?`<div class="table-actions" style="margin-top:12px">${category.activa===false?`<button data-activate-category="${category.id}">Activar</button>`:`<button data-edit-category="${category.id}">Editar</button><button data-delete-category="${category.id}">Desactivar</button>`}</div>`:''}</div></article>`).join(''):'<p class="empty-row">No hay productos ni categorías que coincidan con la búsqueda.</p>';}
function renderMovements(){if(resourceErrors.movements){$('movementsBody').innerHTML=`<tr><td colspan="7" class="error-row">${esc(resourceErrors.movements)}</td></tr>`;return;}const q=($('movementSearch').value||'').toLowerCase(),type=$('movementTypeFilter').value;const rows=state.movements.filter(m=>`${m.producto_nombre} ${m.referencia} ${m.observacion}`.toLowerCase().includes(q)&&(!type||m.tipo===type));$('movementsBody').innerHTML=rows.length?rows.slice().reverse().map(m=>`<tr><td>${fmtDate(m.fecha)}</td><td><span class="code-pill">${esc(m.referencia||`MOV-${m.id}`)}</span></td><td><b>${esc(m.producto_nombre||state.products.find(p=>p.id===m.producto_id)?.nombre||'Producto')}</b></td><td><span class="type-pill ${m.tipo==='entrada'?'type-in':m.tipo==='salida'?'type-out':'type-adjust'}">${esc(m.tipo)}</span></td><td>${m.tipo==='salida'?'-':'+'}${m.cantidad}</td><td>${esc(m.usuario_nombre||session()?.user?.nombre||'Usuario')}</td><td>${esc(m.observacion||'—')}</td></tr>`).join(''):'<tr><td colspan="7" class="empty-row">Aún no hay movimientos que coincidan.</td></tr>';}
function renderUsers(){const createUserButton=document.querySelector('[data-action="new-user"]');if(createUserButton)createUserButton.hidden=!isAdmin();if(!isAdmin()){ $('usersBody').innerHTML='<tr><td colspan="6" class="error-row">Solo el administrador puede consultar y gestionar las cuentas.</td></tr>';return;}if(resourceErrors.users){$('usersBody').innerHTML=`<tr><td colspan="6" class="error-row">${esc(resourceErrors.users)}</td></tr>`;return;}const q=($('userSearch').value||'').toLowerCase();const users=state.users.filter(u=>`${u.nombre} ${u.email}`.toLowerCase().includes(q));$('usersBody').innerHTML=users.length?users.map(u=>`<tr><td><b>${esc(u.nombre)}</b></td><td>${esc(u.email)}</td><td>${esc(u.rol||'Empleado')}</td><td><span class="status-pill status-active">${esc(u.estado||'Activo')}</span></td><td>${fmtDate(u.creado)}</td><td>${Number(u.id)===Number(session()?.user?.id)?'Cuenta actual':`<button data-delete-user="${u.id}">Eliminar</button>`}</td></tr>`).join(''):'<tr><td colspan="6" class="empty-row">No hay usuarios registrados.</td></tr>';}
function renderSales(){if(resourceErrors.sales){$('salesBody').innerHTML=`<tr><td colspan="7" class="error-row">${esc(resourceErrors.sales)}</td></tr>`;return;}const q=($('saleSearch').value||'').trim().toLowerCase();const rows=state.sales.filter(sale=>`${sale.referencia} ${sale.cliente||''} ${sale.vendedor_nombre||''} ${sale.detalles.map(line=>line.producto_nombre).join(' ')}`.toLowerCase().includes(q));$('salesBody').innerHTML=rows.length?rows.map(sale=>`<tr><td>${fmtDate(sale.fecha?.slice(0,10))}</td><td><span class="code-pill">${esc(sale.referencia)}</span></td><td>${esc(sale.cliente||'Venta general')}</td><td>${sale.detalles.map(line=>`${esc(line.producto_nombre)} × ${line.cantidad}`).join('<br>')}</td><td>${esc(sale.forma_pago)}</td><td>${esc(sale.vendedor_nombre||'Usuario')}</td><td><b>${money(sale.total)}</b></td></tr>`).join(''):'<tr><td colspan="7" class="empty-row">Aún no hay ventas que coincidan.</td></tr>';}
function renderSaleCart(){const container=$('saleCart');if(!container)return;const total=saleCart.reduce((sum,line)=>sum+Number(line.producto.precio)*line.cantidad,0);container.innerHTML=saleCart.length?saleCart.map(line=>`<div class="sale-cart-line"><span><b>${esc(line.producto.nombre)}</b><small>${line.cantidad} × ${money(line.producto.precio)}</small></span><strong>${money(line.cantidad*Number(line.producto.precio))}</strong><button class="btn btn-secondary btn-small" type="button" data-remove-sale-line="${line.producto.id}">Quitar</button></div>`).join(''):'<p class="empty-row">Agrega productos a la venta.</p>';$('saleTotal').textContent=money(total);}
function saleProductUnavailableReason(product){
    if(product.estado!=='activo')return'Producto no disponible · inactivo';
    if(product.fecha_caducidad&&product.fecha_caducidad<today())return'Producto no disponible · vencido';
    if(Number(product.stock)<=0)return'Producto no disponible · sin stock';
    if(Number(product.precio)<=0)return'Producto no disponible · sin precio';
    return'';
}
function newSale(){
    const activeProducts=state.products.filter(product=>product.estado==='activo'&&(!product.fecha_caducidad||product.fecha_caducidad>=today()));
    const available=activeProducts.filter(product=>Number(product.stock)>0&&Number(product.precio)>0);
    const availabilityMessage=!activeProducts.length
        ?'No hay productos activos y vigentes para vender.'
        :!activeProducts.some(product=>Number(product.stock)>0)
            ?'No hay existencias disponibles. Registra una entrada de inventario antes de vender.'
            :!activeProducts.some(product=>Number(product.precio)>0)
                ?'Asigna un precio mayor que cero a los productos antes de venderlos.'
                :'Solo se pueden vender productos con stock disponible y precio registrado.';
    saleCart=[];
    const methods=[['efectivo','Efectivo'],['transferencia','Transferencia'],['tarjeta','Tarjeta'],['credito','Crédito'],['otro','Otro']].map(([value,label])=>({value,label}));
    const productOptions=state.products.length
        ?state.products.map(product=>{
            const unavailableReason=saleProductUnavailableReason(product);
            const availability=unavailableReason||`${product.stock} en stock · ${money(product.precio)}`;
            return `<option value="${product.id}">${esc(product.codigo)} · ${esc(product.nombre)} · ${esc(product.categoria_nombre||catName(product.categoria_id))} · ${esc(availability)}</option>`;
        }).join('')
        :'<option value="">No hay productos registrados</option>';
    openModal('Registrar venta',`<div class="form-grid">${field('cliente','Cliente (opcional)','text',{required:false})}${field('forma_pago','Forma de pago','select',{options:methods})}<div class="form-field"><label for="saleProductSelect">Producto</label><select id="saleProductSelect" ${state.products.length?'':'disabled'}>${productOptions}</select></div><div class="form-field"><label for="saleQuantity">Cantidad</label><input id="saleQuantity" type="number" min="1" step="1" value="1"></div><button class="btn btn-secondary" type="button" id="addSaleProduct" ${state.products.length?'':'disabled'}>＋ Agregar producto</button>${available.length?'':`<p class="form-help full">${esc(availabilityMessage)}</p>`}</div><div class="sale-cart"><h3>Productos de la venta</h3><div id="saleCart"></div><div class="sale-total">Total <strong id="saleTotal">$0</strong></div></div>`,'Guardar venta',async data=>{
        if(!saleCart.length)throw Error('Agrega al menos un producto con stock y precio a la venta.');
        await apiRequest('/ventas/',{method:'POST',body:JSON.stringify({cliente:data.cliente.trim(),forma_pago:data.forma_pago,detalles:saleCart.map(line=>({producto:line.producto.id,cantidad:line.cantidad}))})});
        saleCart=[];
        await refreshResources();
        renderAll();
        toast('Venta registrada. Stock y movimientos actualizados.');
    });
    $('modalFooter').hidden=false;
    renderSaleCart();
    $('addSaleProduct').addEventListener('click',()=>{
        const product=state.products.find(item=>item.id===Number($('saleProductSelect').value));
        const quantity=Number($('saleQuantity').value);
        if(!product)return;
        const unavailableReason=saleProductUnavailableReason(product);
        if(unavailableReason){toast(`${product.nombre}: ${unavailableReason.toLowerCase()}.`,'error');return;}
        if(!Number.isInteger(quantity)||quantity<1){toast('La cantidad debe ser un entero positivo.','error');return;}
        const existing=saleCart.find(line=>line.producto.id===product.id);
        const alreadyAdded=existing?.cantidad||0;
        if(quantity+alreadyAdded>Number(product.stock)){toast(`Stock insuficiente. Disponible: ${product.stock-alreadyAdded}.`,'error');return;}
        if(existing)existing.cantidad+=quantity;
        else saleCart.push({producto:product,cantidad:quantity});
        renderSaleCart();
    });
}
async function openHelpCenter(){try{helpTickets=await apiList('/ayuda/');selectedHelpId=helpTickets[0]?.id||null;openModal('Centro de ayuda','<div class="help-center"><aside class="help-inbox" id="helpInbox"></aside><section class="help-conversation" id="helpConversation"></section></div>','',()=>{});$('modalFooter').hidden=true;$('modalForm').onsubmit=event=>event.preventDefault();renderHelpCenter();clearInterval(helpRefreshTimer);helpRefreshTimer=setInterval(async()=>{try{helpTickets=await apiList('/ayuda/');if(!helpTickets.some(ticket=>Number(ticket.id)===Number(selectedHelpId)))selectedHelpId=helpTickets[0]?.id||null;const typing=[$('helpReply'),$('helpSubject'),$('helpInitialMessage')].includes(document.activeElement);if(!typing)renderHelpCenter();}catch(error){console.error('No se pudieron actualizar las conversaciones de ayuda:',error);}},15000);}catch(error){toast(error.message,'error');}}
function renderHelpCenter(){
    const inbox=$('helpInbox'),conversation=$('helpConversation');
    if(!inbox||!conversation)return;
    const emptyMessage=isAdmin()?'No hay mensajes pendientes.':'Todavía no tienes conversaciones.';
    const ticketButtons=helpTickets.map(ticket=>`<button class="help-ticket ${ticket.id===selectedHelpId?'selected':''}" type="button" data-help-ticket="${ticket.id}"><b>${esc(ticket.asunto)}</b><small>${isAdmin()?`${esc(ticket.usuario_nombre)} · `:''}${esc(ticket.estado)}</small></button>`).join('');
    inbox.innerHTML=`${!isAdmin()?'<button class="btn btn-primary btn-full" type="button" data-help-new>＋ Nuevo mensaje</button>':''}<h3>${isAdmin()?'Mensajes recibidos':'Mis conversaciones'}</h3>${helpTickets.length?ticketButtons:`<p class="empty-row">${emptyMessage}</p>`}`;
    if(!selectedHelpId){conversation.innerHTML='<div class="help-placeholder">Selecciona una conversación o escribe al administrador.</div>';return;}
    const ticket=helpTickets.find(item=>Number(item.id)===Number(selectedHelpId));
    if(!ticket){conversation.innerHTML='<div class="help-placeholder">No se pudo cargar esta conversación.</div>';return;}
    const closeButton=isAdmin()&&ticket.estado!=='cerrada'?`<button class="btn btn-secondary btn-small" type="button" data-help-close="${ticket.id}">Cerrar conversación</button>`:'';
    const messages=ticket.mensajes.map(message=>`<article class="help-message ${message.es_admin?'admin-message':'user-message'}"><b>${esc(message.remitente_nombre)}${message.es_admin?' · Administrador':''}</b><p>${esc(message.contenido)}</p><small>${fmtDate(message.creado?.slice(0,10))}</small></article>`).join('');
    const composer=ticket.estado==='cerrada'?'<p class="help-closed">Conversación cerrada. Contacta al administrador para iniciar otro mensaje.</p>':`<div class="help-reply"><textarea id="helpReply" rows="3" maxlength="5000" placeholder="${isAdmin()?'Escribe tu respuesta al usuario...':'Escribe un mensaje para el administrador...'}"></textarea><button class="btn btn-primary" type="button" data-help-send="${ticket.id}">Enviar respuesta</button></div>`;
    conversation.innerHTML=`<header class="help-chat-heading"><div><h3>${esc(ticket.asunto)}</h3><small>${isAdmin()?`${esc(ticket.usuario_nombre)} · ${esc(ticket.usuario_email)} · `:''}${esc(ticket.estado)}</small></div>${closeButton}</header><div class="help-messages">${messages}</div>${composer}`;
}
function showHelpComposer(){selectedHelpId=null;$('helpConversation').innerHTML=`<div class="help-compose"><h3>Escribe al administrador</h3><label for="helpSubject">Asunto</label><input id="helpSubject" maxlength="180" placeholder="¿En qué necesitas ayuda?"><label for="helpInitialMessage">Mensaje</label><textarea id="helpInitialMessage" rows="5" maxlength="5000" placeholder="Describe tu consulta o problema..."></textarea><button class="btn btn-primary" type="button" data-help-create>Enviar mensaje</button></div>`;document.querySelectorAll('.help-ticket').forEach(button=>button.classList.remove('selected'));}
async function createHelpTicket(){const asunto=$('helpSubject').value.trim(),mensaje_inicial=$('helpInitialMessage').value.trim();if(!asunto||!mensaje_inicial){toast('Escribe el asunto y el mensaje.','error');return;}try{const ticket=await apiRequest('/ayuda/',{method:'POST',body:JSON.stringify({asunto,mensaje_inicial})});helpTickets.unshift(ticket);selectedHelpId=ticket.id;renderHelpCenter();toast('Mensaje enviado al administrador.');}catch(error){toast(error.message,'error');}}
async function sendHelpReply(id){const contenido=$('helpReply').value.trim();if(!contenido){toast('Escribe una respuesta antes de enviarla.','error');return;}try{await apiRequest(`/ayuda/${id}/mensajes/`,{method:'POST',body:JSON.stringify({contenido})});helpTickets=await apiList('/ayuda/');renderHelpCenter();toast('Respuesta enviada.');}catch(error){toast(error.message,'error');}}
async function closeHelpTicket(id){try{await apiRequest(`/ayuda/${id}/cerrar/`,{method:'POST'});helpTickets=await apiList('/ayuda/');renderHelpCenter();toast('Conversación cerrada.');}catch(error){toast(error.message,'error');}}
function renderReports(){if(resourceErrors.products||resourceErrors.movements){const message=[resourceErrors.products,resourceErrors.movements].filter(Boolean).join(' · ');$('reportGrid').innerHTML=`<p class="error-row">${esc(message)}</p>`;$('reportBody').innerHTML=`<tr><td colspan="3" class="error-row">${esc(message)}</td></tr>`;return;}const c=getStatusCounts(),value=dashboardSummary?.valor_inventario??state.products.reduce((n,p)=>n+Number(p.precio)*Number(p.stock),0),totalStock=dashboardSummary?.unidades??state.products.reduce((n,p)=>n+Number(p.stock),0);$('reportGrid').innerHTML=`<article class="report-tile"><span>Valor del inventario</span><strong>${money(value)}</strong><small>Costo de referencia basado en precios registrados</small></article><article class="report-tile"><span>Unidades disponibles</span><strong>${totalStock}</strong><small>Suma total de existencias</small></article><article class="report-tile"><span>Referencias críticas</span><strong>${c.bajo+c.agotado}</strong><small>Stock bajo o agotado</small></article>`;$('reportBody').innerHTML=`<tr><td>Productos registrados</td><td>${state.products.length}</td><td>Total de referencias activas en el catálogo</td></tr><tr><td>Stock suficiente</td><td>${c.disponible}</td><td>Existencias por encima del mínimo configurado</td></tr><tr><td>Stock bajo</td><td>${c.bajo}</td><td>Requieren revisión o reposición</td></tr><tr><td>Agotados</td><td>${c.agotado}</td><td>Sin unidades disponibles</td></tr><tr><td>Movimientos registrados</td><td>${state.movements.length}</td><td>Entradas, salidas y ajustes del inventario</td></tr>`;}
function field(name,label,type='text',opts={}){const id=`field_${name}`,req=opts.required===false?'':'required';let input;if(type==='select'){input=`<select id="${id}" name="${name}" ${req}>${(opts.options||[]).map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`;}else if(type==='textarea'){input=`<textarea id="${id}" name="${name}" ${req} placeholder="${esc(opts.placeholder||'')}"></textarea>`;}else{input=`<input id="${id}" name="${name}" type="${type}" ${req} ${opts.min!==undefined?`min="${opts.min}"`:''} ${opts.step?`step="${opts.step}"`:''} placeholder="${esc(opts.placeholder||'')}">`;}return `<div class="form-field ${opts.full?'full':''}"><label for="${id}">${label}${opts.required===false?'':' *'}</label>${input}</div>`;}
function configureModalValidation(){
    const form=$('modalForm');
    if(!form)return;
    form.querySelectorAll('input,select,textarea').forEach(control=>{
        const label=form.querySelector(`label[for="${control.id}"]`)?.textContent?.replace('*','').trim()||'Este campo';
        const showFriendlyMessage=()=>{
            let message='';
            if(control.validity.badInput)message=`Ingresa un valor válido para ${label.toLowerCase()}.`;
            else if(control.validity.valueMissing)message=`Completa el campo ${label.toLowerCase()}.`;
            else if(control.validity.rangeUnderflow)message=`${label}: el valor mínimo permitido es ${control.min}.`;
            else if(control.validity.rangeOverflow)message=`${label}: el valor máximo permitido es ${control.max}.`;
            else if(control.validity.stepMismatch)message=`${label}: ingresa un valor válido.`;
            else if(control.validity.typeMismatch)message=`${label}: revisa el formato ingresado.`;
            control.setCustomValidity(message);
        };
        control.addEventListener('invalid',showFriendlyMessage);
        control.addEventListener('input',()=>control.setCustomValidity(''));
        control.addEventListener('change',()=>control.setCustomValidity(''));
        if(control.type==='number'){
            control.addEventListener('keydown',event=>{
                if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key.length===1&&/[a-zA-Z]/.test(event.key)){
                    event.preventDefault();
                    toast(`Ingresa solo números para ${label.toLowerCase()}.`,'error');
                }
            });
            control.addEventListener('paste',event=>{
                const pasted=(event.clipboardData||window.clipboardData).getData('text').trim();
                if(pasted&&!/^[+-]?(?:\\d+|\\d*[.,]\\d+)$/.test(pasted)){
                    event.preventDefault();
                    toast(`Ingresa solo números para ${label.toLowerCase()}.`,'error');
                }
            });
        }
    });
}
function openModal(title,body,submitLabel='Guardar',onSubmit){$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalSubmit').textContent=submitLabel;$('modalFooter').hidden=false;$('modalBackdrop').hidden=false;configureModalValidation();$('modalForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const data=Object.fromEntries(fd.entries());try{await onSubmit(data);$('modalBackdrop').hidden=true;}catch(err){toast(err.message,'error');}};setTimeout(()=>$('modalBody').querySelector('input,select,textarea')?.focus(),50);}
function closeModal(){$('modalBackdrop').hidden=true;$('modalFooter').hidden=false;clearInterval(helpRefreshTimer);}
function categoryOptions(selected){return state.categories.filter(c=>c.activa!==false).map(c=>({value:c.id,label:c.nombre}));}
function newProduct(existing=null){if(!isAdmin()){toast('Solo un administrador puede crear o editar productos.','error');return;}if(!state.categories.length){toast('Primero crea o activa una categoría para poder registrar productos.','error');changeView('categorias');return;}const p=existing||{codigo:`MAG-${String(Math.max(0,...state.products.map(x=>Number(x.id)))+1).padStart(3,'0')}`,nombre:'',categoria_id:state.categories[0]?.id||'',descripcion:'',precio:'',stock:0,stock_minimo:0,unidad_medida:'unidad',fecha_caducidad:'',lote:'',marca:'',proveedor:'',ubicacion:'',normas:''};const edit=!!existing;const units=[['unidad','Unidad'],['par','Par'],['caja','Caja'],['paquete','Paquete'],['botella','Botella'],['litro','Litro'],['rollo','Rollo'],['kit','Kit'],['metro','Metro']].map(([value,label])=>({value,label}));openModal(edit?'Editar producto':'Registrar producto',field('codigo','Código / SKU','text')+field('nombre','Nombre del producto','text',{full:true})+field('categoria_id','Categoría','select',{options:categoryOptions(),required:true})+field('unidad_medida','Unidad de medida','select',{options:units})+field('precio','Precio unitario (COP)','number',{min:0,step:'1'})+field('stock','Stock inicial','number',{min:0,step:'1'})+field('stock_minimo','Stock mínimo','number',{min:0,step:'1'})+field('fecha_caducidad','Fecha de caducidad (si aplica)','date',{required:false})+field('lote','Lote','text',{required:false})+field('marca','Marca','text',{required:false})+field('proveedor','Proveedor','text',{required:false})+field('ubicacion','Ubicación en bodega','text',{required:false})+field('normas','Normas / certificaciones declaradas por el proveedor','textarea',{full:true,required:false})+field('descripcion','Descripción','textarea',{full:true,required:false}),edit?'Guardar cambios':'Crear producto',async d=>{if(!d.nombre.trim()||!d.codigo.trim())throw Error('Código y nombre son obligatorios.');if(useApi){const payload={codigo:d.codigo.trim().toUpperCase(),nombre:d.nombre.trim(),categoria:Number(d.categoria_id),descripcion:d.descripcion||'',precio:Number(d.precio),stock:Number(d.stock),stock_minimo:Number(d.stock_minimo),unidad_medida:d.unidad_medida,fecha_caducidad:d.fecha_caducidad||null,lote:d.lote||'',marca:d.marca||'',proveedor:d.proveedor||'',ubicacion:d.ubicacion||'',normas:d.normas||'',estado:'activo'};await apiRequest(edit?`/productos/${p.id}/`:'/productos/',{method:edit?'PATCH':'POST',body:JSON.stringify(payload)});await refreshFromApi();renderAll();toast(edit?'Producto actualizado en la base de datos.':'Producto guardado en la base de datos.');return;}if(state.products.some(x=>x.codigo.toLowerCase()===d.codigo.toLowerCase()&&x.id!==p.id))throw Error('Ya existe un producto con ese código.');const cat=state.categories.find(c=>c.id===Number(d.categoria_id));const product={...p,...d,id:p.id||state.nextProductId++,categoria_id:Number(d.categoria_id),categoria:cat?.nombre||'Sin categoría',precio:Number(d.precio),stock:Number(d.stock),stock_minimo:Number(d.stock_minimo),estado:'activo'};if([product.precio,product.stock,product.stock_minimo].some(n=>!Number.isFinite(n)||n<0))throw Error('Precio y cantidades deben ser números no negativos.');if(edit)state.products=state.products.map(x=>x.id===p.id?product:x);else state.products.push(product);persist();renderAll();toast(edit?'Producto actualizado.':'Producto creado.');});const code=$('field_codigo');if(code){code.type='text';code.value=p.codigo;code.readOnly=edit;}$('field_nombre').value=p.nombre;$('field_categoria_id').value=String(p.categoria_id);$('field_unidad_medida').value=p.unidad_medida||'unidad';$('field_precio').value=p.precio;$('field_stock').value=p.stock;$('field_stock_minimo').value=p.stock_minimo;$('field_fecha_caducidad').value=p.fecha_caducidad||'';$('field_lote').value=p.lote||'';$('field_marca').value=p.marca||'';$('field_proveedor').value=p.proveedor||'';$('field_ubicacion').value=p.ubicacion||'';$('field_normas').value=p.normas||'';$('field_descripcion').value=p.descripcion||'';}
function newCategory(existing=null){if(!isAdmin()){toast('Solo un administrador puede crear o editar categorías.','error');return;}const c=existing||{nombre:'',descripcion:''};openModal(existing?'Editar categoría':'Crear categoría',field('nombre','Nombre','text',{full:true})+field('descripcion','Descripción','textarea',{full:true,required:false}),existing?'Guardar cambios':'Crear categoría',async d=>{if(!d.nombre.trim())throw Error('El nombre es obligatorio.');if(useApi){await apiRequest(existing?`/categorias/${c.id}/`:'/categorias/',{method:existing?'PATCH':'POST',body:JSON.stringify({nombre:d.nombre.trim(),descripcion:d.descripcion||'',activa:true})});await refreshFromApi();renderAll();toast(existing?'Categoría actualizada en la base de datos.':'Categoría creada en la base de datos.');return;}if(state.categories.some(x=>x.nombre.toLowerCase()===d.nombre.trim().toLowerCase()&&x.id!==c.id))throw Error('Ya existe una categoría con ese nombre.');if(existing)state.categories=state.categories.map(x=>x.id===c.id?{...x,...d}:x);else state.categories.push({id:state.nextCategoryId++,...d});persist();renderAll();toast(existing?'Categoría actualizada.':'Categoría creada.');});$('field_nombre').value=c.nombre;$('field_descripcion').value=c.descripcion||'';}
function newMovement(){const active=inventoryProducts();if(!active.length){toast('Primero debes registrar un producto activo.','error');return;}const movementTypes=[{value:'entrada',label:'Entrada — aumentar stock'},{value:'salida',label:'Salida — disminuir stock'},{value:'ajuste',label:'Ajuste — establecer stock'}];if(!isAdmin())movementTypes.pop();openModal('Registrar movimiento de inventario',field('tipo','Tipo de movimiento','select',{options:movementTypes})+field('producto_id','Producto','select',{options:active.map(p=>({value:p.id,label:`${p.codigo} · ${p.nombre} (stock ${p.stock})`}))})+field('cantidad','Cantidad','number',{min:1,step:'1'})+field('fecha','Fecha','date',{required:true})+field('observacion','Observación','textarea',{full:true,required:false}), 'Registrar movimiento',async d=>{const p=state.products.find(x=>x.id===Number(d.producto_id)),qty=Number(d.cantidad);if(!p||p.estado!=='activo')throw Error('Selecciona un producto activo.');if(!Number.isInteger(qty)||qty<1)throw Error('La cantidad debe ser un entero mayor que cero.');if(useApi){await apiRequest('/movimientos/registrar/',{method:'POST',body:JSON.stringify({producto:Number(d.producto_id),tipo:d.tipo,cantidad:qty,fecha:d.fecha||today(),observacion:d.observacion||''})});await refreshFromApi();renderAll();toast('Movimiento registrado en el servidor y stock actualizado.');return;}const prev=Number(p.stock);if(d.tipo==='salida'&&qty>prev)throw Error(`Stock insuficiente. Disponible: ${prev} unidades.`);if(d.tipo==='entrada')p.stock=prev+qty;else if(d.tipo==='salida')p.stock=prev-qty;else p.stock=qty;const m={id:state.nextMovementId++,referencia:`MOV-${String(state.nextMovementId-1).padStart(4,'0')}`,producto_id:p.id,producto_nombre:p.nombre,tipo:d.tipo,cantidad:qty,fecha:d.fecha||today(),observacion:d.observacion,usuario_nombre:session()?.user?.nombre||'Administrador'};state.movements.push(m);persist();renderAll();toast('Movimiento registrado y stock actualizado.');});$('field_fecha').value=today();}
function newUser(){if(!isAdmin()){toast('Solo un administrador puede crear usuarios.','error');return;}openModal('Crear usuario',field('nombre','Nombre completo','text',{full:true})+field('email','Correo electrónico','email')+field('rol','Rol','select',{options:[{value:'Empleado',label:'Empleado — acceso limitado'},{value:'Administrador',label:'Administrador — acceso completo'}]})+field('password','Contraseña (mínimo 8 caracteres)','password')+field('password_confirm','Confirmar contraseña','password'), 'Crear usuario',async d=>{if(d.password!==d.password_confirm)throw Error('Las contraseñas no coinciden.');await apiRequest('/usuarios/',{method:'POST',body:JSON.stringify(d)});await refreshFromApi();renderAll();toast('Usuario creado. Ya puede iniciar sesión con su correo y contraseña.');});}
function deleteUser(id){if(!isAdmin())return;const user=state.users.find(item=>Number(item.id)===Number(id));if(!user||Number(user.id)===Number(session()?.user?.id))return;if(!confirm(`¿Eliminar la cuenta de ${user.nombre} (${user.email})? Se revocará su acceso al sistema.`))return;apiRequest(`/usuarios/${user.id}/`,{method:'DELETE'}).then(async()=>{await refreshFromApi();renderAll();toast('Cuenta de usuario eliminada.');}).catch(error=>toast(error.message,'error'));}
function deleteProduct(id){if(!isAdmin()){toast('Solo un administrador puede eliminar productos.','error');return;}const p=state.products.find(x=>x.id===Number(id));if(!p)return;if(!confirm(`¿Eliminar definitivamente "${p.nombre}"? El producto se borrará de la base de datos. Las ventas y movimientos conservarán sus datos históricos, pero ya no estarán vinculados al producto.`))return;if(!useApi){toast('La sesión no está conectada a Django.','error');return;}apiRequest(`/productos/${p.id}/`,{method:'DELETE'}).then(async()=>{await refreshFromApi();renderAll();toast('Producto eliminado definitivamente. Se conservó su historial.');}).catch(err=>toast(err.message,'error'));}
function deleteCategory(id){if(!isAdmin()){toast('Solo un administrador puede desactivar categorías.','error');return;}const category=state.categories.find((item)=>Number(item.id)===Number(id));if(!category)return;if(!confirm(`¿Retirar del catálogo la categoría "${category.nombre}"?`))return;if(!useApi){toast('La sesión no está conectada a Django.','error');return;}apiRequest(`/categorias/${category.id}/`,{method:'DELETE'}).then(async()=>{await refreshFromApi();renderAll();toast('Categoría retirada del catálogo.');}).catch((error)=>toast(error.message,'error'));}
function activateCategory(id){if(!isAdmin())return;const category=state.categories.find(item=>Number(item.id)===Number(id));if(!category)return;apiRequest(`/categorias/${category.id}/`,{method:'PATCH',body:JSON.stringify({activa:true})}).then(async()=>{await refreshFromApi();renderAll();toast('Categoría activada para nuevos productos.');}).catch(error=>toast(error.message,'error'));}
function csvDownload(name,rows){const csv=rows.map(row=>row.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function exportProducts(){if(resourceErrors.products){toast(`No se puede exportar: ${resourceErrors.products}`,'error');return;}csvDownload('inventario-magnussig.csv',[['Código','Producto','Categoría','Unidad','Precio','Stock','Stock mínimo','Caducidad','Lote','Marca','Proveedor','Ubicación','Normas / certificaciones','Estado'],...inventoryProducts().map(p=>[p.codigo,p.nombre,p.categoria_nombre||p.categoria||catName(p.categoria_id),p.unidad_medida||'unidad',p.precio,p.stock,p.stock_minimo,p.fecha_caducidad||'',p.lote||'',p.marca||'',p.proveedor||'',p.ubicacion||'',p.normas||'',status(p)])]);toast('Archivo CSV generado con datos del servidor.');}
async function refreshFromApi(){if(!useApi)throw new Error('La sesión no está conectada a Django.');await refreshResources();}
function updateConnectionStatus(){const connected=!['products','categories','movements','dashboard'].some((key)=>resourceErrors[key]);$('connectionStatus').textContent=connected?'API conectada':'Error de conexión';$('connectionStatus').className=`status-pill ${connected?'status-active':'status-inactive'}`;}
function renderModule(name,render){try{render();}catch(error){console.error(`Error al renderizar el módulo "${name}":`,error);toast(`No se pudo mostrar "${name}": ${error.message}`,'error');}}
function renderAll(){[['dashboard',renderDashboard],['productos',renderProducts],['categorias',renderCategories],['movimientos',renderMovements],['ventas',renderSales],['usuarios',renderUsers],['reportes',renderReports],['configuracion',updateConnectionStatus]].forEach(([name,render])=>renderModule(name,render));}
function openNewProduct(){newProduct();}
function attachEvents(){
    document.querySelectorAll('.nav-item[data-view]').forEach(button=>button.addEventListener('click',()=>changeView(button.dataset.view)));
    document.querySelectorAll('[data-view-link]').forEach(button=>button.addEventListener('click',()=>changeView(button.dataset.viewLink)));
    document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.action;if(action==='new-product')newProduct();if(action==='new-movement')newMovement();if(action==='new-category')newCategory();if(action==='new-user')newUser();if(action==='new-sale')newSale();if(action==='view-low-stock'){changeView('productos');$('productStatusFilter').value='bajo';renderProducts();}}));
    $('logoutBtn').addEventListener('click',logout);
    $('settingsLogout').addEventListener('click',logout);
    $('helpCard').addEventListener('click',openHelpCenter);
    $('menuButton').addEventListener('click',()=>$('appShell').classList.toggle('menu-open'));
    $('sidebarScrim').addEventListener('click',()=>$('appShell').classList.remove('menu-open'));
    $('modalClose').addEventListener('click',closeModal);
    $('modalCancel').addEventListener('click',closeModal);
    $('modalBackdrop').addEventListener('click',event=>{if(event.target===$('modalBackdrop'))closeModal();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('globalSearch').focus();}});
    $('productSearch').addEventListener('input',renderProducts);
    $('productStatusFilter').addEventListener('change',renderProducts);
    $('categorySearch').addEventListener('input',renderCategories);
    $('movementSearch').addEventListener('input',renderMovements);
    $('movementTypeFilter').addEventListener('change',renderMovements);
    $('saleSearch').addEventListener('input',renderSales);
    $('userSearch').addEventListener('input',renderUsers);
    $('chartRange').addEventListener('change',renderChart);
    $('exportProducts').addEventListener('click',exportProducts);
    $('exportReport').addEventListener('click',exportProducts);
    $('globalSearch').addEventListener('input',()=>{const query=$('globalSearch').value.trim().toLowerCase();if(!query)return;const product=state.products.find(item=>`${item.nombre} ${item.codigo} ${item.categoria}`.toLowerCase().includes(query));if(product){changeView('productos');$('productSearch').value=query;renderProducts();}});
    document.addEventListener('click',event=>{
        const target=event.target;
        const editProduct=target.closest('[data-edit-product]');if(editProduct){newProduct(state.products.find(product=>product.id===Number(editProduct.dataset.editProduct)));return;}
        const deleteProductButton=target.closest('[data-delete-product]');if(deleteProductButton){deleteProduct(deleteProductButton.dataset.deleteProduct);return;}
        const editCategory=target.closest('[data-edit-category]');if(editCategory){newCategory(state.categories.find(category=>category.id===Number(editCategory.dataset.editCategory)));return;}
        const deleteCategoryButton=target.closest('[data-delete-category]');if(deleteCategoryButton){deleteCategory(deleteCategoryButton.dataset.deleteCategory);return;}
        const activateCategoryButton=target.closest('[data-activate-category]');if(activateCategoryButton){activateCategory(activateCategoryButton.dataset.activateCategory);return;}
        const removeSaleLine=target.closest('[data-remove-sale-line]');if(removeSaleLine){saleCart=saleCart.filter(line=>Number(line.producto.id)!==Number(removeSaleLine.dataset.removeSaleLine));renderSaleCart();return;}
        const helpTicketButton=target.closest('[data-help-ticket]');if(helpTicketButton){selectedHelpId=Number(helpTicketButton.dataset.helpTicket);renderHelpCenter();return;}
        if(target.closest('[data-help-new]')){showHelpComposer();return;}
        if(target.closest('[data-help-create]')){createHelpTicket();return;}
        const sendHelpButton=target.closest('[data-help-send]');if(sendHelpButton){sendHelpReply(sendHelpButton.dataset.helpSend);return;}
        const closeHelpButton=target.closest('[data-help-close]');if(closeHelpButton)closeHelpTicket(closeHelpButton.dataset.helpClose);
    });
}
async function logout(){try{await apiRequest('/auth/logout/',{method:'POST'});}catch(error){console.error('No se pudo revocar el token en Django:',error);}finally{localStorage.removeItem(SESSION_KEY);location.href='login.html';}}
async function init(){const s=session();if(!s?.token||s.token==='demo-token'){localStorage.removeItem(SESSION_KEY);location.replace('login.html');return;}useApi=true;localStorage.removeItem(demoKey);$('topUserName').textContent=s.user?.nombre||'Usuario';$('topUserRole').textContent=s.user?.rol||'Empleado';$('userAvatar').textContent=(s.user?.nombre||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();$('usersNav').hidden=!isAdmin();document.querySelectorAll('[data-action="new-product"],[data-action="new-category"],[data-action="new-user"]').forEach(button=>{button.hidden=!isAdmin();});$('metricGrid').innerHTML='<article class="metric-card">Cargando inventario…</article>';$('movementChart').textContent='Cargando movimientos…';$('attentionBody').innerHTML='<tr><td colspan="7" class="empty-row">Cargando productos…</td></tr>';$('productsBody').innerHTML='<tr><td colspan="8" class="empty-row">Cargando productos…</td></tr>';$('categoryGrid').textContent='Cargando categorías…';$('movementsBody').innerHTML='<tr><td colspan="7" class="empty-row">Cargando movimientos…</td></tr>';$('salesBody').innerHTML='<tr><td colspan="7" class="empty-row">Cargando ventas…</td></tr>';$('usersBody').innerHTML='<tr><td colspan="6" class="empty-row">Cargando usuarios…</td></tr>';$('reportBody').innerHTML='<tr><td colspan="3" class="empty-row">Cargando reportes…</td></tr>';await refreshResources();attachEvents();renderAll();changeView(location.hash.replace('#','')||'dashboard');}
document.addEventListener('click',event=>{const userButton=event.target.closest('[data-delete-user]');if(userButton){deleteUser(userButton.dataset.deleteUser);return;}const activateButton=event.target.closest('[data-activate-category]');if(activateButton)activateCategory(activateButton.dataset.activateCategory);});
document.addEventListener('DOMContentLoaded',init);
