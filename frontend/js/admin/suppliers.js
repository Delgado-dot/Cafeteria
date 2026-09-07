/* ============================================================
   admin/suppliers.js — Proveedores de la Administradora del Bar
   ============================================================ */

function barSuppliers(el) {
  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-store"></span> Proveedores</h1><button class="btn btn-primary btn-sm" id="btnAddSupplierPage"><i class="bx bx-plus" style="margin-right:4px"></i>Agregar proveedor</button></div>
    <div class="card">
      <div id="suppliersListPage"></div>
    </div>
  `;
  const renderSuppliersPage = () => {
    const list = Store.suppliers;
    const wrap = $('#suppliersListPage', el);
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = `<div style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-store"></i></div><div style="font-weight:600">Aún no hay proveedores</div><div class="tiny muted" style="margin-top:4px">¡Agrega el primero para tener tus contactos a mano!</div></div>`;
      return;
    }
    wrap.innerHTML = `<div class="grid" style="gap:12px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${list.map(s => `
      <div class="stat-card" style="padding:12px;display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:42px;height:42px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0">${esc(s.name.charAt(0).toUpperCase())}</div>
        <div style="flex:1 1 0%;min-width:0;overflow:hidden">
          <div class="bold" style="font-size:14px;line-height:1.2;white-space:normal;word-break:break-word;overflow:visible;text-overflow:clip">${esc(s.name)}</div>
          <div class="tiny muted" style="white-space:normal;word-break:break-word;line-height:1.3">${esc(s.type)} · ${esc(s.phone)}</div>
        </div>
        <span class="badge badge-success" style="flex-shrink:0;align-self:center">Activo</span>
        <div style="display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:88px">
	         <a class="btn btn-icon-supplier" href="tel:${esc(s.phone)}" title="Llamar"><i class="bx bx-phone"></i></a>
	         <a class="btn btn-icon-supplier" href="https://wa.me/${esc(s.phone.replace(/\D/g,""))}" target="_blank" title="WhatsApp"><i class="bx bxl-whatsapp"></i></a>
	         <button class="btn btn-icon-supplier" data-edit-supplier="${s.id}" title="Editar"><i class="bx bx-edit-alt"></i></button>
	         <button class="btn btn-icon-supplier" data-del-supplier="${s.id}" title="Eliminar"><i class="bx bx-trash"></i></button>
	         </div>
      </div>
    `).join('')}</div>`;
    $$('[data-edit-supplier]', wrap).forEach(b => b.onclick = () => supplierFormModal(Store.suppliers.find(x => x.id === b.dataset.editSupplier), renderSuppliersPage));
    $$('[data-del-supplier]', wrap).forEach(b => b.onclick = () => {
      const sup = Store.suppliers.find(x => x.id === b.dataset.delSupplier);
      confirmDialog('Eliminar proveedor', `¿Eliminar a ${esc(sup?.name || '')}?`, 'Eliminar', true).then(ok => {
        if (!ok) return;
        Store.suppliers = Store.suppliers.filter(x => x.id !== b.dataset.delSupplier);
        toast('Proveedor eliminado', 'success');
        renderSuppliersPage();
      });
    });
  };
  renderSuppliersPage();
  $('#btnAddSupplierPage', el)?.addEventListener('click', () => supplierFormModal(null, renderSuppliersPage));
}

function supplierFormModal(supplier, onSave) {
  const isEdit = !!supplier;
  const ov = modal(`
    <h3>${isEdit ? 'Editar' : 'Nuevo'} proveedor</h3>
    <div class="field"><label class="label">Nombre</label><input class="input" id="supName" value="${isEdit ? esc(supplier.name) : ''}" placeholder="Ej. Distribuciones Andinas"></div>
    <div class="field"><label class="label">Tipo de insumo</label><input class="input" id="supType" value="${isEdit ? esc(supplier.type) : ''}" placeholder="Ej. Bebidas, Panadería, Snacks"></div>
    <div class="field"><label class="label">Teléfono</label><input class="input" id="supPhone" value="${isEdit ? esc(supplier.phone) : ''}" placeholder="0991234567"></div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn btn-primary" id="btnSaveSupplier">${isEdit ? 'Guardar cambios' : 'Crear proveedor'}</button>
    </div>
  `, { wide: false });
  $('[data-cancel]', ov).onclick = () => ov.remove();
  $('#btnSaveSupplier', ov).onclick = () => {
    const name = $('#supName', ov).value.trim();
    const type = $('#supType', ov).value.trim();
    const phone = $('#supPhone', ov).value.trim();
    if (!name || !type || !phone) { toast('Completa todos los campos', 'warning'); return; }
    if (isEdit) {
      Object.assign(supplier, { name, type, phone });
      toast('Proveedor actualizado', 'success');
    } else {
      const list = Store.suppliers;
      list.push({ id: 's' + Date.now(), name, type, phone });
      Store.suppliers = list;
      toast('Proveedor agregado', 'success');
    }
    ov.remove();
    if (onSave) onSave();
  };
}
