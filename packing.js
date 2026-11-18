(function (root) {
  'use strict';
  const containers = {
    '20GP': { name: '20尺标准柜', length: 589.8, width: 235.2, height: 239.3, doorWidth: 234, doorHeight: 228, payload: 28200 },
    '40HQ': { name: '40尺高柜', length: 1203.2, width: 235.2, height: 269.8, doorWidth: 234, doorHeight: 258, payload: 26500 }
  };
  const colors = ['#168b82', '#df9d39', '#667cc2', '#bd6e80', '#72a45a', '#509ab7', '#a785bd'];
  const references = [
    ['A0/B0', 20, 11.2, 14, 20, 10, 24, 15, 20, 20, ''],
    ['B0', 25, 12, 12, 25, 10, 26, 13, 25, 20, ''],
    ['A0', 25, 13, 13, 25, 10, 27.5, 14, 25, 20, '袋子很鼓'],
    ['颗粒', 25, 14, 14, 25, 10, 27.5, 14, 25, 10, '40HQ原表写10托；保留原文'],
    ['A20-A30', 20, 12, 12, 25, 10, 26, 13, 25, 20, '袋子很鼓；规格20kg，算式25kg'],
    ['A10-A30', 25, 13, 12, 25, 10, 27.5, 14, 25, 20, '袋子很鼓'],
    ['A10-A30 涂料', 25, 13, 12, 25, 10, 26, 13, 25, 20, '袋子很鼓'],
    ['A40-A50 涂料', 25, 14, 13, 25, 10, 26, 13, 25, 20, ''],
    ['A40-A50/B20', 25, 14, 13, 25, 10, 27.5, 14, 25, 20, ''],
    ['A60', 25, 15, 15, 25, 10, 27.5, 14, 25, 20, '']
  ];
  function defaults() {
    const products = references.map((r, i) => ({ id: 'bag-' + i, name: r[0], phase: 'solid', unit: '袋', unitWeight: r[1], perLoad: r[3] * 4, length: 110, width: 110, height: 160, tare: 25, maxStack: 1, verified: false, note: `每托${r[3]}层×4袋参考20GP；110×110×160cm、包装含托皮重25kg为占位估值。${r[10]}` }));
    products.push(
      { id: 'emulsion', name: '乳液 · 800kg/托', phase: 'liquid', unit: '桶', unitWeight: 200, perLoad: 4, length: 120, width: 110, height: 110, tare: 65, maxStack: 1, verified: false, note: '已知4桶×200kg/托。尺寸、桶皮重及托盘皮重待实测；默认总皮重65kg/托。' },
      { id: 'emulsion-600', name: '乳液 · 600kg/托', phase: 'liquid', unit: '桶', unitWeight: 200, perLoad: 3, length: 120, width: 110, height: 110, tare: 55, maxStack: 1, verified: false, note: '已知600kg占1托，仍有空余；按完整托盘占地，不将空余自动挪给其他货物。尺寸和总皮重待确认。' },
      { id: 'nucleating', name: '成核剂 · PE厚袋', phase: 'solid', unit: '袋', unitWeight: 10, perLoad: 30, length: 110, width: 110, height: 100, tare: 25, maxStack: 2, verified: false, note: '已知10kg/袋、300kg/托；已确认上下叠托，总共2层。每托外廓110×110×100cm与总皮重25kg仍为待实测估值。' },
      { id: 'thermal', name: '热辅 · 20kg纸箱', phase: 'solid', unit: '箱', unitWeight: 20, perLoad: 1, length: 75, width: 39, height: 37, tare: 1.5, maxStack: 1, verified: false, note: '纸箱75×39×37cm；黄空白袋平铺98×65cm，20kg斜放。建议实测更宽纸箱后更新外廓；皮重及叠放承重未确认。' },
      { id: 'calcium', name: '硬脂酸钙 · 袋装', phase: 'solid', unit: '袋', unitWeight: 25, perLoad: 1, length: 62, width: 60, height: 17, tare: 0.2, maxStack: 1, verified: false, note: '已知包装62×60×17cm；25kg/袋、皮重0.2kg为待确认估值。默认不叠放，确认承重后可修改。' }
    );
    return { version: 1, name: '固液混装 · 试算方案', type: '20GP', container: { ...containers['20GP'] }, gap: 2, compatible: false, products, cargo: [{ id: 'demo-a', productId: 'bag-0', quantity: 224 }, { id: 'demo-b', productId: 'emulsion', quantity: 12 }, { id: 'demo-c', productId: 'nucleating', quantity: 60 }] };
  }
  const positive = v => typeof v === 'number' && Number.isFinite(v) && v > 0;
  function validate(s) {
    if (!s || s.version !== 1 || !['20GP', '40HQ'].includes(s.type) || typeof s.name !== 'string' || s.name.length > 120 || typeof s.compatible !== 'boolean') throw new Error('方案格式不正确。');
    for (const k of ['length', 'width', 'height', 'doorWidth', 'doorHeight', 'payload']) if (!positive(s.container?.[k]) || s.container[k] > 100000) throw new Error('集装箱参数须为有效正数。');
    if (!Number.isFinite(s.gap) || s.gap < 0 || s.gap > 30) throw new Error('间隙须为0–30cm。');
    if (!Array.isArray(s.products) || !s.products.length || s.products.length > 200 || !Array.isArray(s.cargo) || s.cargo.length > 100) throw new Error('包装或货物条目数量不正确。');
    const ids = new Set();
    for (const p of s.products) {
      if (typeof p.id !== 'string' || !p.id || ids.has(p.id)) throw new Error('包装编号重复或缺失。');
      ids.add(p.id);
      if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 120 || !['solid', 'liquid'].includes(p.phase) || typeof p.unit !== 'string' || p.unit.length > 12 || typeof p.note !== 'string' || p.note.length > 2000 || typeof p.verified !== 'boolean') throw new Error('包装资料不完整。');
      for (const k of ['unitWeight', 'perLoad', 'length', 'width', 'height', 'maxStack']) if (!positive(p[k]) || p[k] > 100000) throw new Error(`${p.name}：包装参数须为有效正数。`);
      if (!Number.isInteger(p.perLoad) || !Number.isInteger(p.maxStack) || p.maxStack > 30 || !Number.isFinite(p.tare) || p.tare < 0 || p.tare > 100000) throw new Error(`${p.name}：件数、叠放层数或皮重无效。`);
      if (p.phase === 'liquid' && p.maxStack !== 1) throw new Error('液体托盘不支持上下叠放。');
    }
    const cargoIds = new Set();
    for (const row of s.cargo) {
      if (typeof row.id !== 'string' || !row.id || cargoIds.has(row.id) || !ids.has(row.productId) || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 100000) throw new Error('货物件数须为1–100000的整数，且包装须存在、行编号须唯一。');
      if (row.inputMode !== undefined && !['tonnes', 'units', 'loads'].includes(row.inputMode)) throw new Error('货物录入单位无效。');
      cargoIds.add(row.id);
    }
    return true;
  }
  function splitFree(rects, used) {
    const out = [];
    for (const r of rects) {
      if (used.x >= r.x + r.w || used.x + used.w <= r.x || used.y >= r.y + r.h || used.y + used.h <= r.y) { out.push(r); continue; }
      if (used.x > r.x) out.push({ x: r.x, y: r.y, w: used.x - r.x, h: r.h });
      if (used.x + used.w < r.x + r.w) out.push({ x: used.x + used.w, y: r.y, w: r.x + r.w - used.x - used.w, h: r.h });
      if (used.y > r.y) out.push({ x: r.x, y: r.y, w: r.w, h: used.y - r.y });
      if (used.y + used.h < r.y + r.h) out.push({ x: r.x, y: used.y + used.h, w: r.w, h: r.y + r.h - used.y - used.h });
    }
    return out.filter((a, i) => a.w > 0.001 && a.h > 0.001 && !out.some((b, j) => j !== i && b.x <= a.x && b.y <= a.y && b.x + b.w >= a.x + a.w && b.y + b.h >= a.y + a.h && (j < i || b.w * b.h > a.w * a.h)));
  }
  function simulate(s) {
    validate(s);
    const c = s.container, items = [], overflow = [], rows = [];
    let requestedNet = 0, requestedGross = 0, requestedLoads = 0;
    for (const [index, row] of s.cargo.entries()) {
      const p = s.products.find(x => x.id === row.productId), count = Math.ceil(row.quantity / p.perLoad);
      requestedNet += row.quantity * p.unitWeight;
      requestedGross += row.quantity * p.unitWeight + count * p.tare;
      requestedLoads += count;
      rows.push({ ...row, p, color: colors[index % colors.length], loads: count, loaded: 0, loadedUnits: 0 });
    }
    if (requestedLoads > 2000) throw new Error('单次最多计算2000个装载单元，请拆分方案或改用托盘包装。');
    for (const row of rows) {
      for (let i = 0; i < row.loads; i++) {
        const units = Math.min(row.p.perLoad, row.quantity - i * row.p.perLoad);
        items.push({ rowId: row.id, p: row.p, color: row.color, units, net: units * row.p.unitWeight, gross: units * row.p.unitWeight + row.p.tare, serial: i + 1 });
      }
    }
    const strategies = [
      (a, b) => b.p.length * b.p.width - a.p.length * a.p.width || b.gross - a.gross,
      (a, b) => Math.max(b.p.length, b.p.width) - Math.max(a.p.length, a.p.width) || b.gross - a.gross,
      (a, b) => b.gross - a.gross,
      (a, b) => a.gross - b.gross
    ];
    let best;
    for (const compare of strategies) {
      let free = [{ x: 0, y: 0, w: c.length + s.gap, h: c.width + s.gap }], gross = 0, net = 0;
      const placed = [], rejected = [];
      for (const item of [...items].sort(compare)) {
        const p = item.p;
        if (p.height > Math.min(c.height, c.doorHeight) || Math.min(p.length, p.width) > c.doorWidth) { rejected.push({ ...item, reason: '超出柜门/柜内尺寸' }); continue; }
        if (gross + item.gross > c.payload + 1e-7) { rejected.push({ ...item, reason: '超过货物允许毛重' }); continue; }
        const under = p.maxStack > 1 && p.phase === 'solid' ? placed.find(a => a.rowId === item.rowId && a.level + 1 < p.maxStack && a.units === p.perLoad && a.z + 2 * p.height <= Math.min(c.height, c.doorHeight) && !placed.some(b => b.support === a.id)) : null;
        if (under) {
          placed.push({ ...item, id: 'load-' + (placed.length + 1), x: under.x, y: under.y, z: under.z + p.height, length: under.length, width: under.width, height: p.height, level: under.level + 1, support: under.id, rotated: under.rotated });
          gross += item.gross; net += item.net; continue;
        }
        let candidate;
        for (const r of free) for (const rotated of [false, true]) {
          const length = rotated ? p.width : p.length, width = rotated ? p.length : p.width;
          if (width > c.doorWidth) continue;
          const w = length + s.gap, h = width + s.gap;
          if (w > r.w + 1e-7 || h > r.h + 1e-7) continue;
          const score = Math.min(r.w - w, r.h - h) * 1000000 + r.x * 100 + r.y;
          if (!candidate || score < candidate.score) candidate = { x: r.x, y: r.y, w, h, length, width, rotated, score };
        }
        if (!candidate) { rejected.push({ ...item, reason: '当前排布下空间不足' }); continue; }
        free = splitFree(free, candidate);
        placed.push({ ...item, id: 'load-' + (placed.length + 1), x: candidate.x, y: candidate.y, z: 0, length: candidate.length, width: candidate.width, height: p.height, level: 0, rotated: candidate.rotated });
        gross += item.gross; net += item.net;
      }
      const result = { placed, rejected, gross, net };
      if (!best || result.net > best.net || (result.net === best.net && result.placed.length > best.placed.length)) best = result;
    }
    overflow.push(...best.rejected);
    for (const item of best.placed) { const r = rows.find(x => x.id === item.rowId); r.loaded++; r.loadedUnits += item.units; }
    const area = best.placed.filter(x => x.z === 0).reduce((a, x) => a + x.length * x.width, 0);
    const volume = best.placed.reduce((a, x) => a + x.length * x.width * x.height, 0);
    const cx = best.gross ? best.placed.reduce((a, x) => a + (x.x + x.length / 2) * x.gross, 0) / best.gross : c.length / 2;
    const cy = best.gross ? best.placed.reduce((a, x) => a + (x.y + x.width / 2) * x.gross, 0) / best.gross : c.width / 2;
    return { ...best, overflow, rows, requestedNet, requestedGross, requestedLoads, areaRatio: area / (c.length * c.width), volume, volumeRatio: volume / (c.length * c.width * c.height), cx, cy, unverified: rows.filter(r => !r.p.verified).map(r => r.p.name), mixed: rows.some(r => r.p.phase === 'solid') && rows.some(r => r.p.phase === 'liquid') };
  }
  function quantityFromTonnes(tonnes, unitWeight) {
    if (!positive(tonnes) || !positive(unitWeight)) throw new Error('请输入大于0的净重吨数。');
    const quantity = Math.floor(tonnes * 1000 / unitWeight + 1e-9);
    if (quantity < 1) throw new Error(`输入重量不足一整件包装（${unitWeight}kg）。`);
    if (quantity > 100000) throw new Error('折算后超过100000件，请拆分方案。');
    return quantity;
  }
  function quantityFromInput(value, mode, p) {
    if (mode === 'tonnes') return quantityFromTonnes(value, p.unitWeight);
    if (!['units', 'loads'].includes(mode) || !positive(value)) throw new Error('请输入大于0的数量。');
    if (mode === 'units' && !Number.isInteger(value)) throw new Error('袋/桶/箱数量必须是整数。');
    const quantity = mode === 'units' ? value : Math.floor(value * p.perLoad + 1e-9);
    if (quantity < 1 || quantity > 100000) throw new Error('折算后的整包装件数须为1–100000。');
    return quantity;
  }
  function fillRemaining(s, productIds) {
    const initial = simulate(s);
    if (initial.overflow.length) throw new Error('现有货物尚未全部装入，请先调整超重或超尺寸货物，再填满。');
    if (!Array.isArray(productIds) || !productIds.length || new Set(productIds).size !== productIds.length || productIds.some(id => !s.products.some(p => p.id === id))) throw new Error('请选择有效且不重复的填装货物。');
    let work = { ...s, cargo: s.cargo.map(r => ({ ...r })) }, current = initial;
    const targets = productIds.map(productId => {
      const p = s.products.find(p => p.id === productId);
      let row = work.cargo.find(r => r.productId === productId);
      const seed = row ? 0 : 1;
      if (!row) {
        if (work.cargo.length >= 100) throw new Error('单个方案最多100条货物。');
        let id = 'fill-' + work.cargo.length;
        while (work.cargo.some(r => r.id === id)) id += '-new';
        row = { id, productId, quantity: 1 };
        work.cargo.push(row);
      }
      return { p, id: row.id, seed };
    });
    current = simulate(work);
    if (current.overflow.length) throw new Error('剩余空间或限重不足，无法同时加入所选货物的最小整包装；请减少种类或调整现有货物。');
    const trial = additions => ({ ...work, cargo: work.cargo.map(r => ({ ...r, quantity: r.quantity + (additions.get(r.id) || 0) })) });
    function search(high, additions) {
      let low = 0, bestState = work, bestResult = current;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2), next = trial(additions(mid)), computed = simulate(next);
        if (!computed.overflow.length) { low = mid; bestState = next; bestResult = computed; }
        else high = mid - 1;
      }
      work = bestState; current = bestResult;
    }
    if (targets.length > 1) {
      const fullNet = targets.reduce((n, t) => n + t.p.perLoad * t.p.unitWeight, 0);
      const high = Math.min(Math.floor((2000 - initial.requestedLoads) / targets.length), Math.floor((s.container.payload - initial.gross + 1e-7) / fullNet), ...targets.map(t => Math.floor((100000 - work.cargo.find(r => r.id === t.id).quantity + t.seed) / t.p.perLoad)));
      search(Math.max(0, high), n => new Map(targets.map(t => [t.id, n * t.p.perLoad - t.seed])));
    }
    for (const target of targets) {
      const row = work.cargo.find(r => r.id === target.id), p = target.p;
      const otherLoads = current.requestedLoads - Math.ceil(row.quantity / p.perLoad);
      const high = Math.min(100000 - row.quantity, (2000 - otherLoads) * p.perLoad - row.quantity, Math.floor((s.container.payload - current.gross + 1e-7) / p.unitWeight));
      search(Math.max(0, high), n => new Map([[target.id, n]]));
    }
    const added = targets.map(t => ({ productId: t.p.id, quantity: work.cargo.find(r => r.id === t.id).quantity - (s.cargo.find(r => r.id === t.id)?.quantity || 0) }));
    return { state: work, result: current, added, addedNet: current.net - initial.net, limited: current.requestedLoads === 2000 || targets.some(t => work.cargo.find(r => r.id === t.id).quantity === 100000) };
  }
  root.Packing = { containers, references, defaults, validate, simulate, colors, quantityFromTonnes, quantityFromInput, fillRemaining };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Packing;
})(typeof globalThis !== 'undefined' ? globalThis : window);
