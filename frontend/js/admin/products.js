/* ============================================================
   admin/products.js — Productos de la Administradora del Bar
   ============================================================ */

function barProducts(el) {
  ensureAdminbarPresentationStyles();
  const products = Store.products;
  const cats = [...new Set(products.map((p) => p.category))];
  let cat = 'Todas';
  let searchTerm = '';

  const outOfStock = products.filter((p) => p.stock === 0 && p.available);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock && p.available);

  el.innerHTML = `
    <div class="page-title"><h1>Productos</h1></div>
    <button class="btn btn-primary btn-block" id="addProduct" style="width:100%;margin-bottom:16px">+ Agregar producto</button>
    <div class="status-banners-wrap">
      ${outOfStock.length ? `<div class="status-banner danger"><span class="ico"><i class="bx bx-error-circle"></i></span><div><b>Productos agotados:</b> ${outOfStock.map((p) => p.name).join(', ')}</div></div>` : ''}
      ${lowStock.length ? `<div class="status-banner warning"><span class="ico"><i class="bx bx-error"></i></span><div><b>Stock bajo:</b> ${lowStock.map((p) => p.name).join(', ')}</div></div>` : ''}
    </div>
    <div class="field" style="margin-bottom:16px">
      <label class="label">Buscar</label>
      <div class="input-wrap">
        <span class="leading-ico"><i class="bx bx-search"></i></span>
        <input class="input" type="search" id="productSearch" placeholder="Nombre, categoría..." style="padding-left:38px">
      </div>
    </div>
    <div class="adv-tabs">
      <button class="category-chip active" data-cat="Todas">Todas <span style="opacity:0.7;font-weight:400">(${products.length})</span></button>
      ${cats.map((c) => {
        const cnt = products.filter((p) => p.category === c).length;
        return `<button class="category-chip" data-cat="${esc(c)}">${esc(c)} <span style="opacity:0.7;font-weight:400">(${cnt})</span></button>`;
      }).join('')}
    </div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Prep</th><th>Estado</th><th></th></tr></thead>
      <tbody id="prodRows"></tbody>
    </table></div>`;

  const renderRows = () => {
    let list = cat === 'Todas' ? products : products.filter((p) => p.category === cat);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    }
    const tbody = $('#prodRows', el);
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-search-alt"></i></div><div style="font-weight:600">No encontramos productos que coincidan</div><div class="tiny muted" style="margin-top:4px">Prueba con otro nombre o ajusta los filtros de categoría</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map((p) => `
      <tr>
        <td data-label="Producto"><div style="display:flex;align-items:center;gap:12px;min-width:0"><img style="width:54px;height:54px;border-radius:12px;object-fit:cover;flex-shrink:0" src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="width:54px;height:54px;border-radius:12px;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.6rem;${p.image ? 'display:none' : ''}">${productIcon(p)}</div><div style="min-width:0;max-width:190px"><div class="bold" style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.name)}">${esc(p.name)}</div><div class="tiny" style="color:var(--primary);font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.category)}">${esc(p.category)}</div><div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.desc)}">${esc(p.desc)}</div></div></div></td>
        <td data-label="Categoría"><span>${esc(p.category)}</span></td>
        <td data-label="Precio"><span class="bold tabular-nums">${money(p.price)}</span></td>
        <td data-label="Stock"><span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.minStock ? 'badge-warning' : 'badge-success'}">${p.stock} ${p.stock === 0 ? '· agotado' : p.stock <= p.minStock ? '· bajo' : ''}</span></td>
        <td data-label="Prep"><span>${p.prepMin} min</span></td>
        <td data-label="Estado">${p.available ? '<span class="badge badge-success">Disponible</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td data-label="Acciones">
            <div style="position:relative">
              <button class="btn btn-ghost btn-icon" data-menu="${p.id}" style="width:32px;height:32px" title="Más acciones"><i class="bx bx-dots-vertical-rounded" style="font-size:18px"></i></button>
              <div class="dropdown-menu" id="prodMenu-${p.id}" style="display:none;position:absolute;right:0;top:36px;min-width:150px;z-index:10">
                <a class="dropdown-item" href="#" data-edit="${p.id}"><i class="bx bx-edit-alt"></i> Editar</a>
                <a class="dropdown-item" href="#" data-toggle="${p.id}"><i class="bx ${p.available ? 'bx-hide' : 'bx-show'}"></i> ${p.available ? 'Desactivar' : 'Activar'}</a>
              </div>
            </div>
          </td>
      </tr>
    `).join('');
    $$('[data-edit]', tbody).forEach((b) => b.onclick = () => productFormModal(products.find((p) => p.id === b.dataset.edit)));
    $$('[data-toggle]', tbody).forEach((b) => b.onclick = () => {
      const p = products.find((x) => x.id === b.dataset.toggle);
      p.available = !p.available;
      Store.products = products;
      logAudit(p.available ? 'Activó producto' : 'Desactivó producto', p.name);
      toast(p.name + (p.available ? ' activado.' : ' desactivado.'), 'success');
      renderBarAdmin('products');
    });
    $$('[data-menu]', tbody).forEach((btn) => btn.onclick = (e) => {
      e.stopPropagation();
      const menu = document.getElementById('prodMenu-' + btn.dataset.menu);
      if (!menu) return;
      const isHidden = menu.style.display === 'none';
      document.querySelectorAll('[id^="prodMenu-"]').forEach((m) => m.style.display = 'none');
      menu.style.display = isHidden ? 'block' : 'none';
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('[id^="prodMenu-"]').forEach((m) => m.style.display = 'none');
    }, { once: false });
  };

  $('#productSearch', el).addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    renderRows();
  });

  $$('[data-cat]', el).forEach((t) => t.onclick = () => {
    $$('[data-cat]', el).forEach((x) => x.classList.remove('active'));
    t.classList.add('active'); cat = t.dataset.cat; renderRows();
  });

  $('#addProduct', el).onclick = () => productFormModal(null);
  renderRows();
}

function productFormModal(p) {
  const isEdit = !!p;
  const cats = CATEGORIES;
  const originalValues = isEdit ? {
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    prepMin: p.prepMin,
    minStock: p.minStock,
    desc: p.desc,
    available: p.available,
    allowExtras: p.allowExtras || false,
    image: p.image || ''
  } : null;
  let hasUnsavedChanges = false;

  function setFieldError(fieldId, msg) {
    const field = $('#' + fieldId, ov);
    const err = $('#' + fieldId + 'Err', ov);
    if (field) field.classList.add('field-has-error');
    if (err) err.textContent = msg || '';
  }
  function clearFieldError(fieldId) {
    const field = $('#' + fieldId, ov);
    const err = $('#' + fieldId + 'Err', ov);
    if (field) field.classList.remove('field-has-error');
    if (err) err.textContent = '';
  }

  const ov = modal(`
    <div class="pf-header">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="pf-header-title">${isEdit ? 'Editar producto' : 'Nuevo producto'}</div>
          <div class="tiny" style="color:rgba(255,255,255,.8)">${isEdit ? 'Actualiza la información del producto' : 'Registra un nuevo producto'}</div>
        </div>
        <button class="modal-close" data-mclose style="color:#fff;background:rgba(255,255,255,.12);width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;border-radius:var(--r-sm);border:none;cursor:pointer" aria-label="Cerrar">×</button>
      </div>
    </div>
    <div class="pf-cols">
      <div class="pf-left">
        <div class="field" id="pfNameFld">
          <label class="label">Nombre</label>
          <input class="input" id="pfName" value="${isEdit ? esc(p.name) : ''}">
          <div class="input-err-msg" id="pfNameErr"></div>
        </div>
        <div class="field" id="pfDescFld">
          <label class="label">Descripción</label>
          <textarea class="input" id="pfDesc" rows="3">${isEdit ? esc(p.desc) : ''}</textarea>
          <div class="input-err-msg" id="pfDescErr"></div>
        </div>
        <div class="grid grid-2">
          <div class="field" id="pfPriceFld">
            <label class="label">Precio ($)</label>
            <input class="input" type="number" step="0.05" id="pfPrice" value="${isEdit ? p.price : ''}">
            <div class="input-err-msg" id="pfPriceErr"></div>
          </div>
          <div class="field" id="pfCatFld">
            <label class="label">Categoría</label>
            <select class="input" id="pfCat">${cats.map((c) => `<option ${isEdit && p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="field" id="pfPrepFld">
            <label class="label">Tiempo prep (min)</label>
            <input class="input" type="number" id="pfPrep" value="${isEdit ? p.prepMin : ''}">
            <div class="input-err-msg" id="pfPrepErr"></div>
          </div>
          <div class="field" id="pfStockFld">
            <label class="label">Stock</label>
            <input class="input" type="number" id="pfStock" value="${isEdit ? p.stock : ''}">
            <div class="input-err-msg" id="pfStockErr"></div>
          </div>
        </div>
        <div class="field" id="pfMinFld">
          <label class="label">Stock mínimo</label>
          <input class="input" type="number" id="pfMin" value="${isEdit ? p.minStock : ''}">
          <div class="input-err-msg" id="pfMinErr"></div>
        </div>
        <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:12px">
          <label class="checkbox-row"><input type="checkbox" id="pfExtras" ${isEdit && p.allowExtras ? 'checked' : ''}> <b>Permitir adicionales/observaciones</b></label>
          <div class="tiny muted" style="margin-left:26px;margin-top:4px">El cliente podrá agregar notas o extras al producto.</div>
        </div>
        ${isEdit ? `
        <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:12px">
          <div class="pf-switch-label">
            <label class="switch"><input type="checkbox" id="pfActive" ${p.available ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></label>
            <span style="font-weight:600">Producto activo</span>
          </div>
          <div class="tiny muted" style="margin-left:36px;margin-top:4px">Desactiva para ocultar del menú sin eliminarlo.</div>
        </div>
        ` : ''}
      </div>
      <div class="pf-right">
        <div class="field">
          <label class="label">Imagen del producto</label>
          <div id="pfDropZone" style="border:2px dashed var(--border-strong);border-radius:var(--r-lg);padding:28px 20px;text-align:center;cursor:pointer;background:var(--surface-2);transition:all var(--t-fast);position:relative">
            <div id="pfDropPlaceholder" style="${p?.image ? 'display:none' : ''}">
              <div style="font-size:2.4rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-cloud-upload"></i></div>
              <div style="font-weight:600;color:var(--text-2)">Arrastra una imagen o haz clic para seleccionar</div>
              <div class="tiny muted" style="margin-top:4px">PNG, JPG — se guarda en base64 local</div>
            </div>
            <img id="pfImagePreview" src="${p?.image || ''}" style="max-width:200px;max-height:200px;border-radius:10px;margin:0 auto;${p?.image ? 'display:block' : 'display:none'};object-fit:cover;box-shadow:var(--shadow-sm)" onload="if(this.getAttribute('src')) this.style.display='block'">
            <button type="button" id="pfRemoveImage" title="Quitar imagen" aria-label="Quitar imagen" style="position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:var(--surface);border:1px solid var(--border-strong);${p?.image ? 'display:flex' : 'display:none'};align-items:center;justify-content:center;color:var(--text-2);box-shadow:var(--shadow-sm)"><i class="bx bx-x" style="font-size:1.1rem"></i></button>
          </div>
          <input class="input" type="file" id="pfImage" accept="image/*" style="display:none">
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;padding-top:18px;border-top:1px solid var(--border)">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn btn-primary" id="btnSaveProduct" ${isEdit && !hasUnsavedChanges ? 'disabled style="opacity:0.6"' : ''}>${isEdit ? 'Guardar cambios' : 'Crear producto'}</button>
    </div>`, { wide: true });

  const btnSave = $('#btnSaveProduct', ov);
  const fields = ['pfName', 'pfCat', 'pfPrice', 'pfStock', 'pfPrep', 'pfMin', 'pfDesc', 'pfExtras'];
  if (isEdit) fields.push('pfActive');

  const checkChanges = () => {
    if (!isEdit || !originalValues) return;
    const currentValues = {
      name: $('#pfName', ov).value.trim(),
      category: $('#pfCat', ov).value,
      price: parseFloat($('#pfPrice', ov).value),
      stock: parseInt($('#pfStock', ov).value),
      prepMin: parseInt($('#pfPrep', ov).value),
      minStock: parseInt($('#pfMin', ov).value),
      desc: $('#pfDesc', ov).value,
      available: $('#pfActive', ov)?.checked ?? true,
      allowExtras: $('#pfExtras', ov).checked
    };
    hasUnsavedChanges = Object.keys(originalValues).some(key => {
      if (key === 'price') return currentValues[key] !== originalValues[key];
      if (key === 'stock' || key === 'prepMin' || key === 'minStock') return currentValues[key] !== originalValues[key];
      return currentValues[key] !== originalValues[key];
    });
    btnSave.disabled = !hasUnsavedChanges;
    btnSave.style.opacity = hasUnsavedChanges ? '1' : '0.6';
  };

  fields.forEach(id => {
    const field = $('#' + id, ov);
    if (field) {
      field.addEventListener('input', checkChanges);
      field.addEventListener('change', checkChanges);
    }
  });

  const pfImage = $('#pfImage', ov);
  const pfImagePreview = $('#pfImagePreview', ov);
  const pfDropZone = $('#pfDropZone', ov);
  const pfDropPlaceholder = $('#pfDropPlaceholder', ov);
  const pfRemoveImage = $('#pfRemoveImage', ov);
  const showPreview = (src) => {
    pfImagePreview.src = src;
    pfImagePreview.style.display = 'block';
    if (pfDropPlaceholder) pfDropPlaceholder.style.display = 'none';
    if (pfRemoveImage) pfRemoveImage.style.display = 'flex';
    if (pfDropZone) { pfDropZone.style.borderColor = 'var(--border-strong)'; pfDropZone.style.background = 'var(--surface-2)'; }
  };
  const clearPreview = () => {
    pfImage.value = '';
    pfImagePreview.src = '';
    pfImagePreview.style.display = 'none';
    if (pfDropPlaceholder) pfDropPlaceholder.style.display = '';
    if (pfRemoveImage) pfRemoveImage.style.display = 'none';
  };
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => showPreview(e.target.result);
    reader.readAsDataURL(file);
  };
  if (pfImage && pfImagePreview && pfDropZone) {
    pfImage.addEventListener('change', (e) => handleFile(e.target.files?.[0]));
    pfDropZone.addEventListener('click', (e) => { if (e.target.closest('#pfRemoveImage')) return; pfImage.click(); });
    pfDropZone.addEventListener('dragover', (e) => { e.preventDefault(); pfDropZone.style.borderColor = 'var(--primary)'; pfDropZone.style.background = 'var(--primary-soft)'; });
    pfDropZone.addEventListener('dragleave', () => { pfDropZone.style.borderColor = 'var(--border-strong)'; pfDropZone.style.background = 'var(--surface-2)'; });
    pfDropZone.addEventListener('drop', (e) => { e.preventDefault(); pfDropZone.style.borderColor = 'var(--border-strong)'; pfDropZone.style.background = 'var(--surface-2)'; handleFile(e.dataTransfer.files?.[0]); });
    if (pfRemoveImage) pfRemoveImage.addEventListener('click', (e) => { e.stopPropagation(); clearPreview(); });
    if (pfImagePreview.getAttribute('src')) { showPreview(pfImagePreview.getAttribute('src')); }
  }

  ['pfName', 'pfPrice', 'pfStock', 'pfPrep', 'pfMin'].forEach(id => {
    const field = $('#' + id, ov);
    if (field) {
      field.addEventListener('input', () => clearFieldError(id));
      field.addEventListener('change', () => clearFieldError(id));
    }
  });

  $('[data-cancel]', ov).onclick = () => ov.remove();
  btnSave.onclick = () => {
    const name = $('#pfName', ov).value.trim();
    const price = parseFloat($('#pfPrice', ov).value);
    const stock = parseInt($('#pfStock', ov).value);
    const prep = parseInt($('#pfPrep', ov).value);
    const mn = parseInt($('#pfMin', ov).value);
    let ok = true;

    ['pfName', 'pfPrice', 'pfStock', 'pfPrep', 'pfMin'].forEach(clearFieldError);

    if (!name) { setFieldError('pfName', 'Requerido'); ok = false; }
    if (isNaN(price) || price <= 0) { setFieldError('pfPrice', 'Requerido'); ok = false; }
    if (isNaN(stock) || stock < 0) { setFieldError('pfStock', 'Requerido'); ok = false; }
    if (isNaN(prep) || prep <= 0) { setFieldError('pfPrep', 'Requerido'); ok = false; }
    if (isNaN(mn) || mn < 0) { setFieldError('pfMin', 'Requerido'); ok = false; }
    if (!ok) return;

    const originalText = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2.5px;margin-right:8px"></span>Guardando...';

    setTimeout(() => {
      const products = Store.products;
      const allowExtras = $('#pfExtras', ov).checked;
      const available = isEdit ? ($('#pfActive', ov)?.checked ?? true) : (stock > 0);
      if (isEdit) {
        Object.assign(p, { name, category: $('#pfCat', ov).value, price, stock, prepMin: prep, minStock: mn, desc: $('#pfDesc', ov).value, available, allowExtras, image: pfImagePreview.src });
        logAudit('Editó producto', name);
        toast('Producto actualizado.', 'success');
      } else {
        products.push({ id: 'p' + Date.now(), name, category: $('#pfCat', ov).value, price, stock, minStock: mn, prepMin: prep, available, desc: $('#pfDesc', ov).value, emoji: '', image: pfImagePreview.src || '', allowExtras });
        logAudit('Creó producto', name);
        toast('Producto creado.', 'success');
      }
      Store.products = products;

      btnSave.innerHTML = '<i class="bx bx-check" style="margin-right:6px"></i>' + (isEdit ? 'Guardado' : 'Creado');
      btnSave.classList.add('btn-success');
      btnSave.classList.remove('btn-primary');

      setTimeout(() => {
        ov.remove();
        renderBarAdmin('products');
      }, 600);
    }, 500);
  };
}
