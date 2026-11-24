const STORAGE_KEY = 'houchi-equipment-expansion-review-v1';
let DATA = null;
let REVIEWS = {};
try { REVIEWS = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { REVIEWS = {}; }

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(REVIEWS));
  updateStats();
}

function getRev(id) {
  if (!REVIEWS[id]) REVIEWS[id] = { imageDecision: 'unreviewed', textDecision: 'unreviewed', comment: '' };
  return REVIEWS[id];
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function overallClass(r) {
  if (r.imageDecision === 'rejected' || r.textDecision === 'rejected') return 'd-rejected';
  if (r.imageDecision === 'hold' || r.textDecision === 'hold') return 'd-hold';
  if (r.imageDecision === 'accepted' && r.textDecision === 'accepted') return 'd-accepted';
  return '';
}

function updateStats() {
  if (!DATA) return;
  let imgAcc = 0, txtAcc = 0, hold = 0, rej = 0, commented = 0;
  for (const it of DATA.items) {
    const r = getRev(it.id);
    if (r.imageDecision === 'accepted') imgAcc++;
    if (r.textDecision === 'accepted') txtAcc++;
    if (r.imageDecision === 'hold' || r.textDecision === 'hold') hold++;
    if (r.imageDecision === 'rejected' || r.textDecision === 'rejected') rej++;
    if ((r.comment || '').trim()) commented++;
  }
  const visible = document.querySelectorAll('.card').length;
  document.getElementById('stats').textContent =
    `表示 ${visible}/${DATA.total}件 · 画像生成済 ${DATA.images_ready}/${DATA.total} · 画像採用 ${imgAcc} · テキスト採用 ${txtAcc} · 保留 ${hold} · 不採用 ${rej} · コメント ${commented}`;
}

function render() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  const fType = document.getElementById('fType').value;
  const fBand = document.getElementById('fBand').value;
  const fBatch = document.getElementById('fBatch').value;
  const fStatus = document.getElementById('fStatus').value;
  const bgCls = document.getElementById('bgMode').value;

  const filtered = DATA.items.filter(it => {
    if (fType && it.type_id !== fType) return false;
    if (fBand && it.appearance_band !== fBand) return false;
    if (fBatch && it.batch !== fBatch) return false;
    if (fStatus === 'revised' && !it.review_revision) return false;
    const r = getRev(it.id);
    if (fStatus === 'unreviewed' && r.imageDecision !== 'unreviewed' && r.textDecision !== 'unreviewed') return false;
    if (fStatus === 'accepted' && !(r.imageDecision === 'accepted' && r.textDecision === 'accepted')) return false;
    if (fStatus === 'hold' && r.imageDecision !== 'hold' && r.textDecision !== 'hold') return false;
    if (fStatus === 'rejected' && r.imageDecision !== 'rejected' && r.textDecision !== 'rejected') return false;
    if (fStatus === 'commented' && !(r.comment || '').trim()) return false;
    if (q) {
      const hay = [
        it.id, it.name, it.type_name, it.lore?.summary, it.lore?.body,
        ...(it.added_skills || []), ...(it.passive_effects || []), ...(it.triggered_effects || []),
        it.mp_recovery, ...(it.provenance?.narrative_sources || []), ...(it.lore?.lore_links || [])
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const grid = document.getElementById('grid');
  grid.innerHTML = filtered.map((it, idx) => {
    const r = getRev(it.id);
    const attrs = Object.entries(it.attribute_vector || {}).map(([k, v]) => `${k}:${v}`).join(', ') || '無';
    const namingNote = it.naming?.source_type && it.naming.source_type !== 'original'
      ? `<div><b>命名由来:</b> ${esc(it.naming.source_type)} / ${esc(it.naming.original_spelling)} (${esc(it.naming.source_title_or_tradition)})</div>`
      : '';
    return `<article class="card ${overallClass(r)}" data-id="${esc(it.id)}">
      <div class="card-head">
        <div>
          <h2>${esc(it.name)}</h2>
          <code>${esc(it.id)} · ${esc(it.batch)}</code>
          <div class="badges">
            <span class="badge">${esc(it.type_name)}</span>
            <span class="badge band">${esc(it.appearance_band)}</span>
            <span class="badge">${esc(it.rarity_bias)}</span>
            <span class="badge">${esc(it.provenance?.origin_class || '')}</span>
            ${it.review_revision === 'image' ? '<span class="badge">画像修正版</span>' : ''}
            ${it.review_revision === 'text' ? '<span class="badge">本文修正済み</span>' : ''}
          </div>
        </div>
      </div>
      <div class="stage ${bgCls}" data-img="${esc(it.image)}">
        ${it.image ? `<img loading="lazy" src="${esc(it.image)}" alt="${esc(it.name)}">` : `<span class="pending">画像生成待ち</span>`}
      </div>
      <div class="body">
        <div class="summary">${esc(it.lore?.summary || '')}</div>
        <div class="lore">${esc(it.lore?.body || '')}</div>
        <div class="meta">
          <div><b>記録元:</b> ${esc((it.provenance?.narrative_sources || []).join(' / '))} · <b>接続:</b> ${esc((it.lore?.lore_links || []).join(', '))}</div>
          <div><b>属性:</b> ${esc(attrs)} · <b>倍率:</b> ${esc(it.value_multiplier)}</div>
          ${it.added_skills?.length ? `<div><b>固有技:</b> ${esc(it.added_skills.join(' / '))}</div>` : ''}
          ${it.mp_recovery ? `<div><b>MP回復:</b> ${esc(it.mp_recovery)}</div>` : ''}
          ${it.passive_effects?.length ? `<div><b>パッシブ:</b> ${esc(it.passive_effects.join(' / '))}</div>` : ''}
          ${it.triggered_effects?.length ? `<div><b>付随効果:</b> ${esc(it.triggered_effects.join(' / '))}</div>` : ''}
          ${namingNote}
        </div>
      </div>
      <div class="review">
        <div class="review-row">
          <label>画像判定
            <select class="imgDec">
              <option value="unreviewed" ${r.imageDecision==='unreviewed'?'selected':''}>未確認</option>
              <option value="accepted" ${r.imageDecision==='accepted'?'selected':''}>採用</option>
              <option value="hold" ${r.imageDecision==='hold'?'selected':''}>保留</option>
              <option value="rejected" ${r.imageDecision==='rejected'?'selected':''}>不採用</option>
            </select>
          </label>
          <label>フレーバー判定
            <select class="txtDec">
              <option value="unreviewed" ${r.textDecision==='unreviewed'?'selected':''}>未確認</option>
              <option value="accepted" ${r.textDecision==='accepted'?'selected':''}>採用</option>
              <option value="hold" ${r.textDecision==='hold'?'selected':''}>保留</option>
              <option value="rejected" ${r.textDecision==='rejected'?'selected':''}>不採用</option>
            </select>
          </label>
        </div>
        <label>コメント
          <textarea class="comment" placeholder="画像・テキスト・効果についての修正指示やコメント">${esc(r.comment || '')}</textarea>
        </label>
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const imgSel = card.querySelector('.imgDec');
    const txtSel = card.querySelector('.txtDec');
    const ta = card.querySelector('.comment');
    const sync = () => {
      REVIEWS[id] = { imageDecision: imgSel.value, textDecision: txtSel.value, comment: ta.value };
      card.className = 'card ' + overallClass(REVIEWS[id]);
      saveLocal();
    };
    imgSel.addEventListener('change', sync);
    txtSel.addEventListener('change', sync);
    ta.addEventListener('input', sync);
    const stage = card.querySelector('.stage');
    stage.addEventListener('click', () => {
      if (!stage.dataset.img) return;
      const modal = document.getElementById('modal');
      const mImg = document.getElementById('modalImg');
      mImg.src = stage.dataset.img;
      mImg.className = document.getElementById('bgMode').value;
      modal.hidden = false;
    });
  });
  updateStats();
}

function exportPayload() {
  return JSON.stringify({
    collection: 'equipment-expansion-review-v1',
    exported_at: new Date().toISOString(),
    items: DATA.items.map(it => ({
      id: it.id,
      name: it.name,
      type_id: it.type_id,
      ...getRev(it.id),
    })),
  }, null, 2);
}

async function init() {
  DATA = await (await fetch('data.json')).json();
  if (new URLSearchParams(window.location.search).get('review') === 'revised') {
    document.getElementById('fStatus').value = 'revised';
  }
  const typeMap = new Map();
  const batches = new Set();
  for (const it of DATA.items) {
    typeMap.set(it.type_id, it.type_name);
    batches.add(it.batch);
  }
  const fType = document.getElementById('fType');
  for (const [k, v] of typeMap.entries()) {
    const o = document.createElement('option'); o.value = k; o.textContent = `${v} (${k})`; fType.appendChild(o);
  }
  const fBatch = document.getElementById('fBatch');
  for (const b of Array.from(batches).sort()) {
    const o = document.createElement('option'); o.value = b; o.textContent = b; fBatch.appendChild(o);
  }
  ['q','fType','fBand','fBatch','fStatus','bgMode'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'q' ? 'input' : 'change', render);
  });
  document.getElementById('modal').addEventListener('click', () => { document.getElementById('modal').hidden = true; });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([exportPayload()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'equipment-expansion-review-decisions.json';
    a.click();
  });
  document.getElementById('copyBtn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(exportPayload());
    alert('レビュー結果JSONをクリップボードにコピーしました');
  });
  document.getElementById('importInput').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const parsed = JSON.parse(await file.text());
    for (const row of parsed.items || []) {
      REVIEWS[row.id] = {
        imageDecision: row.imageDecision || 'unreviewed',
        textDecision: row.textDecision || 'unreviewed',
        comment: row.comment || '',
      };
    }
    saveLocal();
    render();
  });
  render();
}
init();
