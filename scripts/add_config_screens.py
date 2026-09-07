with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find end of barConfig function
idx = content.find('function barConfig(el)')
if idx < 0:
    print("Could not find barConfig")
    exit(1)

brace_count = 0
end_idx = -1
for i in range(idx, len(content)):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            end_idx = i
            break

if end_idx < 0:
    print("Could not find end of barConfig")
    exit(1)

new_functions = '\n\n/* ============================================================\n   CONFIGURACIÓN - HORARIOS\n   ============================================================ */\nfunction barConfigHours(el) {\n  const cfg = Store.config;\n  el.innerHTML = `\n    <div class="page-title"><h1>Configuración - Horarios</h1></div>\n    <div class="card">\n      <h3 style="margin-bottom:14px">Horario de pedidos</h3>\n      <div class="grid grid-2">\n        <div class="field"><label class="label">Pedidos desde</label><input class="input" type="time" id="ohOpen" value="${cfg.orderOpen}"></div>\n        <div class="field"><label class="label">Pedidos hasta</label><input class="input" type="time" id="ohClose" value="${cfg.orderClose}"></div>\n      </div>\n      <h3 style="margin:20px 0 14px">Horario de receso</h3>\n      <div class="grid grid-2">\n        <div class="field"><label class="label">Receso desde</label><input class="input" type="time" id="brStart" value="${cfg.breakStart}"></div>\n        <div class="field"><label class="label">Receso hasta</label><input class="input" type="time" id="brEnd" value="${cfg.breakEnd}"></div>\n      </div>\n      <div class="field"><label class="label">Capacidad de preparación (pedidos)</label><input class="input" type="number" id="cpCap" value="${cfg.capacity}"><div class="tiny muted">Máximo de pedidos simultáneos que la administradora puede preparar.</div></div>\n      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px">\n        <button class="btn" onclick="setRoute(\'adminbar/config\')">Volver</button>\n        <button class="btn btn-primary" onclick="saveConfigHours()">Guardar cambios</button>\n      </div>\n    </div>\n`;\nfunction saveConfigHours() {\n  const cfg = Store.config;\n  cfg.orderOpen = $(\'#ohOpen\').value || cfg.orderOpen;\n  cfg.orderClose = $(\'#ohClose\').value || cfg.orderClose;\n  cfg.breakStart = $(\'#brStart\').value || cfg.breakStart;\n  cfg.breakEnd = $(\'#brEnd\').value || cfg.breakEnd;\n  cfg.capacity = parseInt($(\'#cpCap\').value) || cfg.capacity;\n  Store.config = cfg;\n  logAudit(\'Actualizó horarios\', \'Horario de pedidos y receso\');\n  toast(\'Horarios guardados.\', \'success\');\n  renderBarAdmin(\'config-hours\');\n}\n\n/* ============================================================\n   CONFIGURACIÓN - ESTADO ABIERTO/CERRADO\n   ============================================================ */\nfunction barConfigStatus(el) {\n  const cfg = Store.config;\n  const isOpen = cfg.cafeOpen;\n  el.innerHTML = `\n    <div class="page-title"><h1>Configuración - Estado</h1></div>\n    <div class="card">\n      <div style="text-align:center;margin-bottom:24px">\n        <span class="badge ${isOpen ? \'badge-success\' : \'badge-danger\'}" style="font-size:1.5rem;margin-bottom:8px">${isOpen ? \'● ABIERTA\' : \'● CERRADA\'}</span>\n      </div>\n      <div style="text-align:center">\n        <button class="btn ${isOpen ? \'btn-secondary\' : \'btn-primary\'}" style="width:100%;padding:12px;font-size:var(--fs-lg)" onclick="confirmToggleState(!${isOpen})">\n          ${isOpen ? \'Cambiar a CERRADA\' : \'Cambiar a ABIERTA\'}\n        </button>\n      </div>\n      <div style="margin-top:16px;text-align:center;color:var(--text-2);font-size:var(--fs-sm)">\n        <b>Nota:</b> Si la cafetería está cerrada, los usuarios pueden ver el menú pero no realizar pedidos.\n      </div>\n    </div>\n`;\nfunction confirmToggleState(toOpen) {\n  const msg = toOpen ? \'¿Seguro que quieres abrir la cafetería?\' : \'¿Seguro que quieres cerrar la cafetería?\';\n  confirmDialog(msg, msg, \'Confirmar\', false).then((ok) => {\n    if (!ok) return;\n    const cfg = Store.config;\n    cfg.cafeOpen = toOpen;\n    Store.config = cfg;\n    logAudit(\'Cambió estado de la cafetería\', toOpen ? \'Abierta\' : \'Cerrada\');\n    toast(\'La cafetería está \' + (toOpen ? \'ABIERTA\' : \'CERRADA\') + \'.\', toOpen ? \'success\' : \'warning\');\n    renderBarAdmin(\'config-status\');\n  });\n}\n'

# Insert after the closing } of barConfig
new_content = content[:end_idx+1] + new_functions + content[end_idx+1:]
with open(r'C:\Users\USER\OneDrive\Documents\GitHub\Cafeteria\frontend\js\admin.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Functions inserted successfully")