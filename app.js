(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = (n, digits = 0) => n.toLocaleString('zh-CN', { maximumFractionDigits: digits });
  const tonnes = n => number(n / 1000, 8);
  const inputValue = (quantity, p, mode = 'tonnes') => mode === 'units' ? quantity : mode === 'loads' ? quantity / p.perLoad : quantity * p.unitWeight / 1000;
  const modeOptions = (p, mode = 'tonnes') => [['tonnes', '吨'], ['units', p.unit], ['loads', '托/单元']].map(([value, label]) => `<option value="${value}" ${value === mode ? 'selected' : ''}>${escape(label)}</option>`).join('');
  const key = 'loadwise-local-v1';
  let state = Packing.defaults(), result, view = 'iso', selected = null, toastTimer, storageWarning = '';
  try {
    const saved = localStorage.getItem(key);
    if (saved) { const parsed = JSON.parse(saved); Packing.validate(parsed); Packing.simulate(parsed); state = parsed; }
  } catch { storageWarning = '无法读取本地存储或保存数据已损坏，当前使用示例；请使用JSON导出备份。'; }
  const uid = () => 'id-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  function toast(message) { (document.querySelector('dialog[open]') || document.body).appendChild($('toast')); $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200); }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); $('save-state').textContent = '已自动保存到本机'; }
    catch { $('save-state').textContent = '自动保存不可用 · 请导出备份'; toast('浏览器未允许本地存储，请导出JSON备份方案。'); }
  }
  function commit(next, preserveCargo = false) {
    try { const computed = Packing.simulate(next); state = next; result = computed; selected = null; $('fill-summary').hidden = true; save(); render(preserveCargo); return true; }
    catch (e) { toast(e.message); return false; }
  }
  function changePage(name) {
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + name));
    document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === name));
    $('page-title').textContent = { planner: '装柜工作台', products: '包装资料库', reference: '历史装柜参考', guide: '使用与计算说明' }[name];
    window.scrollTo({ top: 0 });
  }
  function render(preserveCargo = false) {
    $('plan-name').value = state.name;
    $('compatible').checked = state.compatible;
    document.querySelectorAll('[data-type]').forEach(el => el.classList.toggle('active', el.dataset.type === state.type));
    $('metric-net').innerHTML = `${tonnes(result.net)} <em>t</em>`;
    $('metric-net-sub').textContent = `计划净重 ${tonnes(result.requestedNet)} t`;
    $('metric-gross').innerHTML = `${tonnes(result.gross)} <em>t</em>`;
    $('metric-gross-sub').textContent = `限重 ${tonnes(state.container.payload)} t · 余量 ${tonnes(state.container.payload - result.gross)} t`;
    $('weight-bar').style.width = Math.min(100, result.gross / state.container.payload * 100) + '%';
    $('weight-bar').style.background = result.gross > state.container.payload * 0.95 ? '#d99f52' : '#79a886';
    $('metric-area').innerHTML = `${number(result.areaRatio * 100, 1)} <em>%</em>`;
    $('metric-volume').textContent = `外廓体积 ${number(result.volume / 1000000, 2)} m³ · 占柜容 ${number(result.volumeRatio * 100, 1)}%`;
    $('metric-loads').innerHTML = `${number(result.placed.length)} <em>/ ${number(result.requestedLoads)}</em>`;
    $('metric-loads-sub').textContent = result.overflow.length ? `${result.overflow.length} 个单元未装入` : result.requestedLoads ? '全部排入 · 仍需复核参数' : '添加货物，开始装柜';
    $('cargo-count').textContent = state.cargo.length;
    if (preserveCargo) {
      document.querySelectorAll('[data-quantity]').forEach(input => {
        const r = result.rows.find(row => row.id === input.dataset.quantity);
        input.value = inputValue(r.quantity, r.p, r.inputMode);
        input.closest('.cargo-card').querySelector('.cargo-summary').innerHTML = `${number(r.quantity)} ${escape(r.p.unit)} · ${r.loads} 个单元<br>${tonnes(r.quantity * r.p.unitWeight)} t 净重`;
      });
    } else $('cargo-list').innerHTML = result.rows.length ? result.rows.map(r => `<article class="cargo-card" style="--cargo-color:${r.color}"><div class="cargo-card-top"><div class="cargo-name">${escape(r.p.name)}</div><button class="remove-cargo" data-remove="${escape(r.id)}" aria-label="移除${escape(r.p.name)}">×</button></div><div class="cargo-meta">${r.p.unitWeight}kg/${escape(r.p.unit)} · ${r.p.perLoad}${escape(r.p.unit)}/单元 · ${r.p.length}×${r.p.width}×${r.p.height}cm</div><div class="cargo-bottom"><div class="quantity-wrap"><input type="number" min="${r.inputMode === 'units' ? 1 : '0.00000001'}" step="${r.inputMode === 'units' ? 1 : 'any'}" value="${inputValue(r.quantity, r.p, r.inputMode)}" data-quantity="${escape(r.id)}" aria-label="${escape(r.p.name)}装货数量"><select class="unit-select" data-input-mode="${escape(r.id)}" aria-label="${escape(r.p.name)}录入单位">${modeOptions(r.p, r.inputMode)}</select></div><div class="cargo-summary">${number(r.quantity)} ${escape(r.p.unit)} · ${r.loads} 个单元<br>${tonnes(r.quantity * r.p.unitWeight)} t 净重</div></div><button class="cargo-edit" data-edit="${escape(r.p.id)}">${r.p.verified ? '已核实参数' : '参数待确认'} · 编辑包装 ↗</button></article>`).join('') : '<div class="empty-state">还没有待装货物<br>添加包装，开始你的第一个方案。</div>';
    const c = state.container;
    $('container-info').textContent = `${state.type} · 内尺寸 ${number(c.length, 1)} × ${number(c.width, 1)} × ${number(c.height, 1)} cm`;
    $('canvas-status').textContent = result.overflow.length ? `已排入 ${result.placed.length} / ${result.requestedLoads} 单元` : result.requestedLoads ? '几何排布完成 · 待运输复核' : '空柜 · 等待添加货物';
    $('legend').innerHTML = result.rows.map(r => `<span class="legend-item"><i class="color-dot" style="background:${r.color}"></i>${escape(r.p.name)}</span>`).join('');
    $('manifest-body').innerHTML = result.rows.length ? result.rows.map(r => `<tr><td><i class="color-dot" style="background:${r.color};margin-right:7px"></i>${escape(r.p.name)}<small>${r.p.unitWeight} kg/${escape(r.p.unit)} · ${r.p.perLoad} ${escape(r.p.unit)}/单元</small></td><td><span class="phase-pill ${r.p.phase}">${r.p.phase === 'solid' ? '固体' : '液体'}</span></td><td>${number(r.quantity)} ${escape(r.p.unit)}</td><td>${number(r.loadedUnits)} ${escape(r.p.unit)}</td><td>${r.loaded} / ${r.loads}</td><td>${tonnes(r.loadedUnits * r.p.unitWeight)} t</td><td class="${r.quantity > r.loadedUnits ? 'text-error' : ''}">${r.quantity - r.loadedUnits}${escape(r.p.unit)}</td></tr>`).join('') : '<tr><td colspan="7" class="empty-state">暂无货物</td></tr>';
    $('manifest-foot').textContent = `计划净重 ${number(result.requestedNet, 2)} kg · 计划货物毛重 ${number(result.requestedGross, 2)} kg ｜ 已装净重 ${number(result.net, 2)} kg + 包装/托盘皮重 ${number(result.gross - result.net, 2)} kg = 已装货物毛重 ${number(result.gross, 2)} kg`;
    renderWarnings(); renderVisual(); renderProducts(); renderReference();
  }
  function warningData() {
    const messages = [];
    if (result.overflow.length) {
      const reasons = {};
      result.overflow.forEach(x => { reasons[x.reason] = (reasons[x.reason] || 0) + 1; });
      messages.push(['error', `尚有 ${result.overflow.length} 个装载单元未装入：${Object.entries(reasons).map(([k, v]) => `${k} ${v}个`).join('；')}。当前结果是启发式试排，不是最大容量证明。`]);
    }
    if (result.requestedGross > state.container.payload) messages.push(['error', `计划货物毛重 ${tonnes(result.requestedGross)} t，超过当前限重 ${tonnes(state.container.payload)} t；至少需要减重 ${number(result.requestedGross - state.container.payload, 2)} kg 或拆柜。`]);
    if (result.unverified.length) messages.push(['', `待确认包装参数：${[...new Set(result.unverified)].join('、')}。默认托盘外廓与皮重为估值，请在包装资料库替换为实测值。`]);
    if (result.mixed) messages.push([state.compatible ? '' : 'error', state.compatible ? '本方案已人工勾选固液可混装；仍需落实液体防漏、隔离、绑扎及SDS/运输要求。几何间隙不代表安全隔离距离。' : '本方案包含固液混装，尚未确认化学相容性与运输条件。布局仅供试算，请先核实SDS、防漏隔离及承运人要求。']);
    if (result.placed.some(x => x.z > 0)) messages.push(['', '本方案使用了上下叠放。请核实底层承重、包装稳定性及现场装卸条件；系统不进行承重结构校验。']);
    if (result.gross && (Math.abs(result.cx / state.container.length - 0.5) > 0.15 || Math.abs(result.cy / state.container.width - 0.5) > 0.15)) messages.push(['', `重量几何中心偏离柜体中心：纵向 ${number((result.cx / state.container.length - 0.5) * 100, 1)}%、横向 ${number((result.cy / state.container.width - 0.5) * 100, 1)}%。请人工复核均衡配载；本工具未校验轴载或局部地板载荷。`]);
    if (!result.overflow.length && result.requestedLoads && !result.unverified.length && (!result.mixed || state.compatible)) messages.unshift(['success', '当前货物通过已填写尺寸和限重的几何试算。实际装运仍须人工核实绑扎、装卸路径、地板载荷及运输合规。']);
    return messages;
  }
  function renderWarnings() { $('warnings').innerHTML = warningData().map(([type, message]) => `<div class="notice ${type}">${escape(message)}</div>`).join(''); }
  function polygon(points, fill, extra = '') { return `<polygon points="${points.map(p => p.map(n => n.toFixed(2)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`; }
  function renderVisual() {
    const c = state.container, svg = $('packing-view');
    let shapes = '';
    if (view === 'top') {
      const scale = Math.min(735 / c.length, 265 / c.width), ox = (880 - c.length * scale) / 2, oy = (410 - c.width * scale) / 2;
      const rect = (x, y, w, h, fill, extra = '') => `<rect x="${ox + x * scale}" y="${oy + y * scale}" width="${w * scale}" height="${h * scale}" fill="${fill}" ${extra}/>`;
      shapes += rect(0, 0, c.length, c.width, '#e8eee0', 'stroke="#96ad88" stroke-width="2"');
      for (let x = 50; x < c.length; x += 50) shapes += `<line x1="${ox + x * scale}" y1="${oy}" x2="${ox + x * scale}" y2="${oy + c.width * scale}" stroke="#d7e0cd" stroke-width=".6"/>`;
      for (const [i, a] of result.placed.entries()) {
        shapes += `<g class="load-shape ${a.id === selected ? 'selected' : ''}" data-load="${a.id}" tabindex="0" role="button" aria-label="${escape(a.p.name)} 第${i + 1}单元"><title>${escape(a.p.name)} · ${a.units}${escape(a.p.unit)} · ${a.net}kg净重 · 第${a.level + 1}层</title>${rect(a.x, a.y, a.length, a.width, a.color, `rx="3" fill-opacity="${a.z ? '.93' : '.83'}" stroke="${a.id === selected ? '#183c34' : 'white'}" stroke-width="${a.id === selected ? 3 : 1.3}"`)}<text x="${ox + (a.x + a.length / 2) * scale}" y="${oy + (a.y + a.width / 2) * scale + 4}" text-anchor="middle" fill="white" font-size="12" font-family="Segoe UI">${i + 1}${a.level ? '·' + (a.level + 1) + '层' : ''}</text></g>`;
      }
      shapes += `<text x="440" y="${oy + c.width * scale + 27}" text-anchor="middle" fill="#879878" font-size="11">${number(c.length, 1)} cm</text><text x="${ox + c.length * scale + 12}" y="${oy + c.width * scale / 2}" fill="#7c916d" font-size="11">柜门</text>`;
      if (result.gross) shapes += `<circle cx="${ox + result.cx * scale}" cy="${oy + result.cy * scale}" r="5" fill="#fff" stroke="#244d3f" stroke-width="2"><title>重量几何中心</title></circle>`;
    } else {
      const rawWidth = c.length + .58 * c.width, rawHeight = .22 * c.length + .48 * c.width + .68 * c.height;
      const scale = Math.min(750 / rawWidth, 290 / rawHeight), ox = (880 - rawWidth * scale) / 2, oy = (410 - rawHeight * scale) / 2 + (.22 * c.length + .68 * c.height) * scale;
      const point = (x, y, z) => [ox + (x + .58 * y) * scale, oy + (-.22 * x + .48 * y - .68 * z) * scale];
      const floor = [point(0, 0, 0), point(c.length, 0, 0), point(c.length, c.width, 0), point(0, c.width, 0)];
      shapes += polygon(floor.map(([x, y]) => [x + 5, y + 10]), '#d4ddcb', 'opacity=".5"');
      shapes += polygon([point(0, 0, 0), point(c.length, 0, 0), point(c.length, 0, c.height), point(0, 0, c.height)], '#e5eddc', 'fill-opacity=".5" stroke="#b1c3a2" stroke-width="1"');
      for (let x = 35; x < c.length; x += 35) { const a = point(x, 0, 0), b = point(x, 0, c.height); shapes += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#c2d0b5" stroke-width=".6" opacity=".5"/>`; }
      shapes += polygon(floor, '#e3e9d9', 'stroke="#91aa7f" stroke-width="1.5"');
      for (let x = 50; x < c.length; x += 50) { const a = point(x, 0, 0), b = point(x, c.width, 0); shapes += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#c9d6bc" stroke-width=".6"/>`; }
      const ordered = result.placed.map((a, i) => ({ ...a, index: i + 1 })).sort((a, b) => (a.y - a.x) - (b.y - b.x) || a.z - b.z);
      for (const a of ordered) {
        const x = a.x, y = a.y, z = a.z, l = a.length, w = a.width, h = a.height;
        const top = [point(x, y, z + h), point(x + l, y, z + h), point(x + l, y + w, z + h), point(x, y + w, z + h)];
        const label = point(x + l / 2, y + w / 2, z + h);
        shapes += `<g class="load-shape ${a.id === selected ? 'selected' : ''}" data-load="${a.id}" tabindex="0" role="button" aria-label="${escape(a.p.name)} 第${a.index}单元"><title>${escape(a.p.name)} · ${a.units}${escape(a.p.unit)} · ${a.net}kg净重 · 第${a.level + 1}层</title>`;
        shapes += polygon([point(x, y, z), point(x, y + w, z), point(x, y + w, z + h), point(x, y, z + h)], a.color, 'stroke="#ffffff" stroke-width=".6"');
        shapes += polygon([point(x, y, z), point(x, y + w, z), point(x, y + w, z + h), point(x, y, z + h)], '#123b32', 'opacity=".23"');
        shapes += polygon([point(x, y + w, z), point(x + l, y + w, z), point(x + l, y + w, z + h), point(x, y + w, z + h)], a.color, 'stroke="#ffffff" stroke-width=".6"');
        shapes += polygon(top, a.color, 'stroke="#ffffff" stroke-width=".9"');
        shapes += polygon(top, '#ffffff', 'opacity=".18"');
        shapes += `<text x="${label[0]}" y="${label[1] + 3}" text-anchor="middle" fill="white" font-size="${Math.max(7, Math.min(13, l * scale / 5))}" font-weight="600" font-family="Segoe UI">${a.index}</text></g>`;
      }
      const frame = [point(0, 0, c.height), point(c.length, 0, c.height), point(c.length, c.width, c.height), point(0, c.width, c.height), point(0, 0, c.height)];
      shapes += `<polyline points="${frame.map(p => p.join(',')).join(' ')}" fill="none" stroke="#91aa7e" stroke-width="1" stroke-dasharray="5 4" opacity=".7"/>`;
      for (const [x, y] of [[0, c.width], [c.length, c.width], [c.length, 0]]) { const a = point(x, y, 0), b = point(x, y, c.height); shapes += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#98ad88" stroke-dasharray="4 4" opacity=".6"/>`; }
      const label = point(c.length / 2, c.width, 0), door = point(c.length, c.width / 2, 0);
      shapes += `<text x="${label[0]}" y="${label[1] + 24}" text-anchor="middle" fill="#8d9d7f" font-size="10">${number(c.length, 1)} cm</text><text x="${door[0] + 18}" y="${door[1] + 10}" fill="#83976f" font-size="10">柜门 →</text>`;
    }
    svg.innerHTML = shapes;
    const a = result.placed.find(x => x.id === selected);
    $('selected-load').textContent = a ? `${a.id.replace('load-', '#')} ${a.p.name} ｜ ${a.units}${a.p.unit} · 净重 ${number(a.net, 2)}kg · 毛重 ${number(a.gross, 2)}kg ｜ 位置(${number(a.x, 1)}, ${number(a.y, 1)}, ${number(a.z, 1)})cm · ${a.length}×${a.width}×${a.height}cm · ${a.rotated ? '已水平旋转90°' : '原始方向'}` : '选择一个装载单元，查看位置、包装和重量。';
  }
  function renderProducts() {
    $('product-grid').innerHTML = state.products.map(p => `<article class="panel product-card"><span class="verified-tag ${p.verified ? 'confirmed' : ''}">${p.verified ? '参数已人工确认' : '含待确认参数'}</span><h2>${escape(p.name)}</h2><p>${p.phase === 'solid' ? '固体' : '液体'} · ${p.unitWeight}kg/${escape(p.unit)} · ${p.perLoad}${escape(p.unit)}/单元</p><div class="product-size">${p.length} × ${p.width} × ${p.height} <small>cm</small></div><p>整单元净重 ${number(p.unitWeight * p.perLoad)}kg · 总皮重 ${number(p.tare, 2)}kg · 最多${p.maxStack}层</p><p class="product-note">${escape(p.note)}</p><button class="button" data-edit="${escape(p.id)}">编辑包装参数</button></article>`).join('');
  }
  function renderReference() {
    const calculation = (r, offset) => {
      const total = r[offset], layers = r[offset + 1], weight = r[offset + 2], pallets = r[offset + 3], actual = layers * weight * 4 * pallets / 1000;
      return `<strong>${total} t</strong><small>${layers}层 × ${weight}kg × 4 × ${pallets}托 = ${number(actual, 2)}t</small>${Math.abs(actual - total) > .001 ? '<div class="mismatch">吨数与原算式不一致 · 待核实</div>' : '<small>算式一致</small>'}`;
    };
    $('reference-body').innerHTML = Packing.references.map(r => `<tr><td>${escape(r[0])}</td><td>${r[1]} kg/袋</td><td>${calculation(r, 2)}</td><td>${calculation(r, 6)}</td><td>${escape(r[10] || '—')}</td></tr>`).join('');
  }
  function openProduct(id) {
    const p = state.products.find(x => x.id === id) || { id: uid(), name: '', phase: 'solid', unit: '袋', unitWeight: 25, perLoad: 40, length: 110, width: 110, height: 150, tare: 25, maxStack: 1, verified: false, note: '' };
    const form = $('product-form');
    form.reset();
    for (const [k, v] of Object.entries(p)) if (form.elements.namedItem(k)) { const el = form.elements.namedItem(k); if (el.type === 'checkbox') el.checked = v; else el.value = v; }
    $('product-dialog-title').textContent = id ? '编辑包装参数' : '新增包装';
    form.elements.maxStack.disabled = p.phase === 'liquid';
    $('product-dialog').showModal();
  }
  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a');
    link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const fileName = () => (state.name.trim() || '装柜方案').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 80);
  function exportCsv() {
    const data = [['装柜有数 · 本地模拟装箱明细'], ['方案', state.name], ['柜型', state.type], ['柜内尺寸cm', `${state.container.length}×${state.container.width}×${state.container.height}`], ['货物允许毛重kg', state.container.payload], ['计划货物毛重kg', result.requestedGross], ['已装净重kg', result.net], ['已装货物毛重kg', result.gross], [], ['单元编号', '货物', '类型', '数量', '单位', '净重kg', '毛重kg', '长cm', '宽cm', '高cm', 'Xcm', 'Ycm', 'Zcm', '状态', '参数状态']];
    for (const a of result.placed) data.push([a.id, a.p.name, a.p.phase === 'solid' ? '固体' : '液体', a.units, a.p.unit, a.net, a.gross, a.length, a.width, a.height, a.x, a.y, a.z, '已装入', a.p.verified ? '已人工确认' : '待确认']);
    for (const a of result.overflow) data.push(['', a.p.name, a.p.phase === 'solid' ? '固体' : '液体', a.units, a.p.unit, a.net, a.gross, a.p.length, a.p.width, a.p.height, '', '', '', a.reason, a.p.verified ? '已人工确认' : '待确认']);
    data.push([], ['复核提示']);
    warningData().forEach(([, message]) => data.push([message]));
    data.push(['几何试算不替代实际配载、轴载/地板载荷、绑扎和运输合规审核。']);
    const csv = data.map(row => row.map(value => { let str = String(value); if (/^[\s]*[=+@-]/.test(str)) str = "'" + str; return '"' + str.replace(/"/g, '""') + '"'; }).join(',')).join('\r\n');
    download(fileName() + '-装箱明细.csv', '\ufeff' + csv, 'text/csv;charset=utf-8'); toast('装箱明细已导出，包含未装入货物与复核提示。');
  }
  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-page]'); if (nav) changePage(nav.dataset.page);
    const close = event.target.closest('[data-close]'); if (close) close.closest('dialog').close();
    const edit = event.target.closest('[data-edit]'); if (edit) openProduct(edit.dataset.edit);
    const remove = event.target.closest('[data-remove]'); if (remove) commit({ ...state, cargo: state.cargo.filter(x => x.id !== remove.dataset.remove) });
    const toggle = event.target.closest('[data-type]');
    if (toggle && toggle.dataset.type !== state.type) {
      if (confirm('切换柜型将使用新柜型的默认柜体参数，货物清单保留。是否继续？')) commit({ ...state, type: toggle.dataset.type, container: { ...Packing.containers[toggle.dataset.type] } });
    }
    const camera = event.target.closest('[data-view]'); if (camera) { view = camera.dataset.view; document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el === camera)); renderVisual(); }
    const load = event.target.closest('[data-load]'); if (load) { selected = load.dataset.load; renderVisual(); }
  });
  $('packing-view').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const target = e.target.closest('[data-load]'); if (target) { e.preventDefault(); selected = target.dataset.load; renderVisual(); } } });
  $('cargo-list').addEventListener('change', e => {
    if (e.target.dataset.inputMode) {
      const id = e.target.dataset.inputMode, inputMode = e.target.value;
      commit({ ...state, cargo: state.cargo.map(r => r.id === id ? { ...r, inputMode } : r) });
      return;
    }
    if (!e.target.dataset.quantity) return;
    const id = e.target.dataset.quantity, row = state.cargo.find(r => r.id === id), p = state.products.find(p => p.id === row.productId), mode = row.inputMode || 'tonnes';
    try {
      const requested = Number(e.target.value), quantity = Packing.quantityFromInput(requested, mode, p);
      if (!commit({ ...state, cargo: state.cargo.map(r => r.id === id ? { ...r, quantity } : r) }, true)) e.target.value = inputValue(row.quantity, p, mode);
      else if (Math.abs(inputValue(quantity, p, mode) - requested) > 1e-9) toast(`已向下折算为 ${quantity}${p.unit}，实际 ${tonnes(quantity * p.unitWeight)} 吨。`);
    } catch (error) { toast(error.message); e.target.value = inputValue(row.quantity, p, mode); }
  });
  $('plan-name').addEventListener('change', e => commit({ ...state, name: e.target.value.trim() || '未命名装柜方案' }));
  $('compatible').addEventListener('change', e => commit({ ...state, compatible: e.target.checked }));
  $('add-btn').addEventListener('click', () => {
    if (state.cargo.length >= 100) { toast('单个方案最多100条货物。'); return; }
    $('cargo-product').innerHTML = state.products.map(p => `<option value="${escape(p.id)}">${escape(p.name)} · ${p.unitWeight}kg/${escape(p.unit)}</option>`).join('');
    $('cargo-quantity').value = 1; $('cargo-input-mode').value = 'tonnes'; updateCargoPreview(); $('cargo-dialog').showModal();
  });
  function updateCargoPreview() {
    const p = state.products.find(p => p.id === $('cargo-product').value);
    if (!p) return;
    const mode = $('cargo-input-mode').value;
    $('cargo-input-mode').innerHTML = modeOptions(p, mode);
    $('cargo-input-mode').dataset.previousMode = mode;
    $('cargo-amount-label').textContent = mode === 'tonnes' ? '净重（吨）' : mode === 'units' ? `数量（${p.unit}）` : '数量（托/单元，可小数）';
    $('cargo-quantity').step = mode === 'units' ? '1' : 'any';
    $('cargo-quantity').min = mode === 'units' ? '1' : '0.00000001';
    $('cargo-preview').textContent = `${p.perLoad}${p.unit}/装载单元 · ${p.length}×${p.width}×${p.height}cm · ${p.verified ? '已人工确认参数' : '外廓/皮重等参数待确认'}。尾托按整托占地；散装包装不会自动组成托盘。`;
    try {
      const requested = Number($('cargo-quantity').value), quantity = Packing.quantityFromInput(requested, mode, p);
      const actual = quantity * p.unitWeight, requestedNet = mode === 'tonnes' ? requested * 1000 : requested * (mode === 'loads' ? p.perLoad : 1) * p.unitWeight, delta = Math.max(0, requestedNet - actual);
      $('cargo-conversion').textContent = `折算 ${number(quantity)}${p.unit}，实际净重 ${tonnes(actual)} 吨，占 ${Math.ceil(quantity / p.perLoad)} 个装载单元。${delta > 1e-7 ? `不足整包装的 ${number(delta, 4)}kg 不计入装货。` : '与输入数量一致。'}`;
    } catch (error) { $('cargo-conversion').textContent = error.message; }
  }
  $('cargo-product').addEventListener('change', updateCargoPreview);
  $('cargo-input-mode').addEventListener('change', e => {
    const p = state.products.find(p => p.id === $('cargo-product').value);
    try { const quantity = Packing.quantityFromInput(Number($('cargo-quantity').value), e.target.dataset.previousMode || 'tonnes', p); $('cargo-quantity').value = inputValue(quantity, p, e.target.value); }
    catch { $('cargo-quantity').value = ''; }
    updateCargoPreview();
  });
  $('cargo-quantity').addEventListener('input', updateCargoPreview);
  $('cargo-form').addEventListener('submit', e => {
    e.preventDefault();
    try {
      const p = state.products.find(p => p.id === $('cargo-product').value), inputMode = $('cargo-input-mode').value, quantity = Packing.quantityFromInput(Number($('cargo-quantity').value), inputMode, p);
      if (commit({ ...state, cargo: [...state.cargo, { id: uid(), productId: p.id, quantity, inputMode }] })) { $('cargo-dialog').close(); toast(`已加入 ${tonnes(quantity * p.unitWeight)} 吨，合计 ${quantity}${p.unit}。`); }
    } catch (error) { toast(error.message); }
  });
  function runFill(productIds, button) {
    const label = button.textContent;
    button.disabled = true; button.textContent = '正在试算…';
    $('fill-error').textContent = '';
    setTimeout(() => {
      try {
        const filled = Packing.fillRemaining(state, productIds);
        if (commit(filled.state)) {
          const details = filled.added.map(a => { const p = state.products.find(p => p.id === a.productId); return `${p.name} +${tonnes(a.quantity * p.unitWeight)}吨（${a.quantity}${p.unit}）`; }).join('；');
          $('fill-summary').textContent = `本次新增 ${tonnes(filled.addedNet)} 吨；全柜净重 ${tonnes(result.net)} 吨，毛重 ${tonnes(result.gross)} 吨。${details}。${filled.limited ? '已达到计算数量上限，不能据此认定已填满。' : '当前启发式排布下的可装结果，不保证理论最大值。'}`;
          $('fill-summary').hidden = false;
          $('cargo-dialog').close(); $('fill-dialog').close();
          toast(filled.addedNet > 0 ? `试算完成：新增 ${tonnes(filled.addedNet)} 吨，全柜 ${tonnes(result.net)} 吨净重。` : '当前试排未找到可增加的整包装余量。');
        }
      } catch (error) { $('fill-error').textContent = error.message; toast(error.message); }
      finally { button.disabled = false; button.textContent = label; }
    }, 0);
  }
  $('cargo-fill-btn').addEventListener('click', () => runFill([$('cargo-product').value], $('cargo-fill-btn')));
  $('fill-btn').addEventListener('click', () => {
    $('fill-products').innerHTML = state.products.map(p => `<label class="fill-option"><input type="checkbox" name="fill-product" value="${escape(p.id)}"><span><strong>${escape(p.name)}</strong><small>${p.phase === 'solid' ? '固体' : '液体'} · ${tonnes(p.perLoad * p.unitWeight)}吨/整单元 · ${p.length}×${p.width}×${p.height}cm${p.verified ? '' : ' · 参数待确认'}</small></span></label>`).join('');
    $('fill-error').textContent = ''; $('fill-dialog').showModal();
  });
  $('fill-form').addEventListener('submit', e => { e.preventDefault(); const ids = [...$('fill-products').querySelectorAll('input:checked')].map(input => input.value); runFill(ids, $('fill-submit')); });
  $('container-btn').addEventListener('click', () => { const form = $('container-form'); for (const k of ['length', 'width', 'height', 'doorWidth', 'doorHeight', 'payload']) form.elements.namedItem(k).value = state.container[k]; form.elements.gap.value = state.gap; $('container-dialog').showModal(); });
  $('container-form').addEventListener('submit', e => { e.preventDefault(); const form = e.target, container = { ...state.container }; for (const k of ['length', 'width', 'height', 'doorWidth', 'doorHeight', 'payload']) container[k] = Number(form.elements.namedItem(k).value); if (commit({ ...state, container, gap: Number(form.elements.gap.value) })) $('container-dialog').close(); });
  $('new-product').addEventListener('click', () => openProduct());
  $('product-form').elements.phase.addEventListener('change', e => { const el = $('product-form').elements.maxStack; el.disabled = e.target.value === 'liquid'; if (el.disabled) el.value = 1; });
  $('product-form').addEventListener('submit', e => {
    e.preventDefault(); const form = e.target, p = {};
    for (const k of ['id', 'name', 'phase', 'unit', 'note']) p[k] = form.elements.namedItem(k).value.trim();
    for (const k of ['unitWeight', 'perLoad', 'length', 'width', 'height', 'tare', 'maxStack']) p[k] = Number(form.elements.namedItem(k).value);
    p.verified = form.elements.verified.checked;
    const found = state.products.some(x => x.id === p.id), products = found ? state.products.map(x => x.id === p.id ? p : x) : [...state.products, p];
    if (commit({ ...state, products })) { $('product-dialog').close(); toast('包装已保存，相关货物已重新计算。'); }
  });
  $('clear-btn').addEventListener('click', () => { if (state.cargo.length && confirm('清空当前待装货物？包装资料和柜体参数将保留。')) commit({ ...state, cargo: [] }); });
  $('new-btn').addEventListener('click', () => { if (confirm('新建会替换当前方案，包装资料保留。需要保留当前方案请先导出JSON。是否继续？')) commit({ ...state, name: '新的装柜方案', cargo: [], compatible: false }); });
  $('export-btn').addEventListener('click', () => { download(fileName() + '.json', JSON.stringify(state, null, 2), 'application/json'); toast('完整方案已导出；可在本机或其他电脑导入。'); });
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try { if (file.size > 2000000) throw new Error('方案文件超过2MB，请选择本工具导出的JSON。'); const next = JSON.parse(await file.text()); Packing.validate(next); Packing.simulate(next); if (confirm('导入将替换当前方案和包装资料库。是否继续？')) { if (commit(next)) { changePage('planner'); toast('方案已导入。'); } } }
    catch (error) { toast('导入失败：' + error.message); }
    e.target.value = '';
  });
  $('csv-btn').addEventListener('click', exportCsv);
  $('print-btn').addEventListener('click', () => window.print());
  result = Packing.simulate(state); render();
  if (storageWarning) toast(storageWarning);
})();
