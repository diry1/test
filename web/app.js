const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const silhouette = `<div class="visual"><svg viewBox="0 0 200 90" fill="none" aria-hidden="true"><path d="M22 59V48l20-7 24-24h59l30 24 25 7v18H22Z" fill="currentColor" opacity=".3"/><path d="m58 40 17-17h45l21 17H58Z" fill="currentColor" opacity=".5"/><circle cx="53" cy="65" r="13" fill="currentColor"/><circle cx="150" cy="65" r="13" fill="currentColor"/><circle cx="53" cy="65" r="6" fill="#eef0e8"/><circle cx="150" cy="65" r="6" fill="#eef0e8"/></svg><span class="placeholder">Reference photo not available</span></div>`;
let selectedBrand = null, selectedGeneration = null, selectedSpecification = null;
let cars = [], sightings = [], db, activeCar, pageSize = 48, photoData = null, photoLoading = false, photoRevision = 0;
const englishGeneration = label => String(label ?? '').replace(/покол[іi]ння/gi, 'Generation').replace(/рестайл[іi]нг/gi, 'Facelift').replace(/^[IVXІ]+(?=[ -]Generation)/, prefix => prefix.replaceAll('І', 'I'));
const formatGeneration = g => `${englishGeneration(g.name)}${g.yearFrom ? ` · ${g.yearFrom}–${g.yearTo ?? 'unspecified'}` : ''}`;
const request = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
async function openDB() {
  const req = indexedDB.open('car-spotter', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('sightings', { keyPath: 'id' });
  return request(req);
}
async function mutate(operation) {
  await new Promise((resolve, reject) => {
    const tx = db.transaction('sightings', 'readwrite');
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    operation(tx.objectStore('sightings'));
  });
  sightings = await request(db.transaction('sightings').objectStore('sightings').getAll());
  render();
}
function render() {
  const spotted = new Set(sightings.map(s => s.carID));
  $('count').textContent = spotted.size;
  $('progress').textContent = `${spotted.size.toLocaleString()} / ${cars.length.toLocaleString()} models spotted`;
  renderFolder(spotted);
  $('sightings').innerHTML = [...sightings].sort((a,b) => b.date.localeCompare(a.date)).map(s => `<article class="card">${s.photo ? `<img class="sighting-photo" src="${s.photo}" alt="Your photo of ${escapeHTML(s.carTitle)}">` : silhouette}<div class="card-body"><div class="car-name">${escapeHTML(s.carTitle)}</div>${s.specificationLabel ? `<p class="meta">${escapeHTML(s.specificationLabel)}</p>` : ''}${s.generationLabel ? `<p class="meta">${escapeHTML(englishGeneration(s.generationLabel))}</p>` : ''}<p class="date">${escapeHTML(new Date(s.date).toLocaleString())}</p>${s.note ? `<p class="note">${escapeHTML(s.note)}</p>` : ''}<button class="delete" data-delete="${escapeHTML(s.id)}">Delete sighting</button></div></article>`).join('') || '<div class="empty"><h3>Your collection starts here</h3><p>Find a car in the catalogue and log your first sighting.</p></div>';
  $('export').hidden = !sightings.length;
}
function tab(garage) {
  $('garage-view').hidden = !garage; $('catalogue-view').hidden = garage;
  $('garage-tab').classList.toggle('active', garage); $('catalogue-tab').classList.toggle('active', !garage);
}
$('catalogue-tab').onclick = () => tab(false);
$('garage-tab').onclick = () => tab(true);
$('search').addEventListener('input', () => { pageSize = 48; render(); });
$('more').onclick = () => { pageSize += 48; render(); };
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').onclick = () => dialog.close();
}
function navigate(level, value) {
  selectedSpecification = null;
  if (level === 'root') { selectedBrand = null; activeCar = null; selectedGeneration = null; }
  if (level === 'brand') { selectedBrand = value; activeCar = null; selectedGeneration = null; }
  if (level === 'model') { activeCar = cars.find(c => c.id === value); selectedGeneration = null; }
  if (level === 'generation') { selectedGeneration = activeCar.generations.find(g => g.id === value); }
  $('search').value = ''; pageSize = 48; render();
}
$('breadcrumbs').onclick = event => {
  const button = event.target.closest('[data-level]');
  if (button) navigate(button.dataset.level, button.dataset.value);
};
$('cars').onclick = event => {
  const specButton = event.target.closest('[data-spec]');
  if (specButton) {
    selectedSpecification = selectedGeneration.specifications.find(s => s.id === specButton.dataset.spec);
    $('detail-content').innerHTML = `<p class="eyebrow">${escapeHTML(activeCar.brand)} · ${escapeHTML(activeCar.name)}</p><h2>${escapeHTML(selectedSpecification.name)}</h2><p>${escapeHTML(formatGeneration(selectedGeneration))}</p><div class="detail-visual">${silhouette}</div><p class="meta">Source record ${escapeHTML(selectedSpecification.sourceID)}</p><p class="muted">Body style and detailed technical fields were not supplied separately.</p><button id="log-spec" class="primary" ${db ? '' : 'disabled'}>Log this specification</button>`;
    $('log-spec').onclick = () => { $('detail').close(); openLog(); };
    $('detail').showModal();
    return;
  }
  const button = event.target.closest('[data-level]');
  if (button) navigate(button.dataset.level, button.dataset.value);
};
function folderCard(level, value, title, subtitle, spotted = false) {
  return `<button class="card folder-card" data-level="${level}" data-value="${escapeHTML(value)}"><div class="folder-icon" aria-hidden="true">▱</div><div class="card-body"><div class="car-name">${escapeHTML(title)}</div><span class="meta">${escapeHTML(subtitle)}</span>${spotted ? '<span class="badge">✓ Spotted</span>' : ''}</div></button>`;
}
function renderFolder(spotted) {
  const crumb = (level, value, title) => `<button data-level="${level}" data-value="${escapeHTML(value)}">${escapeHTML(title)}</button>`;
  $('breadcrumbs').innerHTML = crumb('root', '', 'All brands') +
    (selectedBrand ? ' / ' + crumb('brand', selectedBrand, selectedBrand) : '') +
    (activeCar ? ' / ' + crumb('model', activeCar.id, activeCar.name) : '') +
    (selectedGeneration ? ' / ' + crumb('generation', selectedGeneration.id, selectedGeneration.name) : '');
  const query = $('search').value.trim().toLocaleLowerCase();
  let entries = [];
  $('folder-info').innerHTML = '';
  $('search').closest('.filters').hidden = false;
  if (!selectedBrand) {
    $('folder-title').textContent = 'Brand folders';
    $('search').placeholder = 'Find a brand…';
    const groups = new Map();
    for (const car of cars) { if (!groups.has(car.brand)) groups.set(car.brand, []); groups.get(car.brand).push(car); }
    entries = [...groups].sort(([a], [b]) => a.localeCompare(b)).filter(([brand]) => brand.toLocaleLowerCase().includes(query)).map(([brand, models]) => folderCard('brand', brand, brand, `${models.length} models · ${models.filter(c => spotted.has(c.id)).length} spotted`));
  } else if (!activeCar) {
    $('folder-title').textContent = `${selectedBrand} models`;
    $('search').placeholder = `Find a ${selectedBrand} model…`;
    entries = cars.filter(c => c.brand === selectedBrand && c.name.toLocaleLowerCase().includes(query)).map(c => folderCard('model', c.id, c.name, `${c.generations.length} known generations`, spotted.has(c.id)));
  } else if (!selectedGeneration) {
    $('folder-title').textContent = `${activeCar.name} generations`;
    $('search').placeholder = 'Find a generation…';
    entries = activeCar.generations.filter(g => formatGeneration(g).toLocaleLowerCase().includes(query)).map(g => folderCard('generation', g.id, g.name, `${g.yearFrom ?? 'Unknown start'}–${g.yearTo ?? 'unspecified end'} · View specifications`, sightings.some(s => s.generationID === g.id)));
    $('folder-info').innerHTML = `<p class="muted">${activeCar.generations.length ? 'Choose a generation to view its specifications, or log the model if you are unsure.' : 'Generation records are missing for this model. You can still log a model-level sighting.'}</p><button id="open-log" class="primary" ${db ? '' : 'disabled'}>Log this model</button>`;
  } else {
    $('folder-title').textContent = `${activeCar.name} · Specifications`;
    $('search').placeholder = 'Find an engine or specification…';
    const specs = selectedGeneration.specifications ?? [];
    entries = specs.filter(spec => spec.name.toLocaleLowerCase().includes(query)).map(spec => `<button class="card" data-spec="${escapeHTML(spec.id)}"><div class="card-body"><h3>${escapeHTML(spec.name)}</h3><p class="meta">Source record ${escapeHTML(spec.sourceID)}</p><span class="meta">View specification →</span></div></button>`);
    $('folder-info').innerHTML = `<div class="spec-panel"><div class="detail-visual">${silhouette}</div><h3>${escapeHTML(formatGeneration(selectedGeneration))}</h3><p class="muted">${specs.length ? 'Available specifications for this generation.' : 'Engine, trim, and specification records are not available in the source catalogue yet.'}</p><button id="open-log" class="primary" ${db ? '' : 'disabled'}>Log this generation</button></div>`;
  }
  $('results').textContent = selectedGeneration ? `${entries.length} specifications` : `${entries.length.toLocaleString()} ${!selectedBrand ? 'brands' : !activeCar ? 'models' : 'generations'}`;
  $('cars').innerHTML = entries.slice(0, pageSize).join('') || (selectedGeneration || activeCar && !activeCar.generations.length ? '' : '<div class="empty">No matching folders. Try another search.</div>');
  $('more').hidden = entries.length <= pageSize;
  $('more').textContent = 'Show more folders';
  const log = $('open-log'); if (log) log.onclick = openLog;
}
function openLog() {
  $('log-form').reset(); photoData = null; photoRevision++; photoLoading = false;
  $('preview').hidden = true; $('preview').removeAttribute('src'); $('form-error').textContent = '';
  $('log-form').querySelector('[type=submit]').disabled = false;
  $('log-title').textContent = `${activeCar.brand} ${activeCar.name}`;
  $('generation').innerHTML = '<option value="">Not sure / model only</option>' + activeCar.generations.map(g => `<option value="${escapeHTML(g.id)}">${escapeHTML(formatGeneration(g))}</option>`).join('');
  $('generation').value = selectedGeneration?.id ?? '';
  populateSpecifications(selectedSpecification?.id);
  $('log').showModal();
}
function populateSpecifications(selectedID = '') {
  const generation = activeCar.generations.find(g => g.id === $('generation').value);
  $('specification').innerHTML = '<option value="">Not sure / generation only</option>' + (generation?.specifications ?? []).map(spec => `<option value="${escapeHTML(spec.id)}">${escapeHTML(spec.name)} · #${escapeHTML(spec.sourceID)}</option>`).join('');
  $('specification').value = selectedID || '';
  $('specification').disabled = !generation?.specifications?.length;
}
$('generation').onchange = () => populateSpecifications();
$('photo').onchange = async () => {
  const revision = ++photoRevision;
  photoData = null; $('preview').hidden = true; $('form-error').textContent = '';
  const file = $('photo').files[0]; if (!file) return;
  const submit = $('log-form').querySelector('[type=submit]'); photoLoading = true; submit.disabled = true;
  let url;
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error('Choose an image smaller than 25 MB.');
    url = URL.createObjectURL(file);
    const image = new Image(); image.src = url; await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    if (revision !== photoRevision) return;
    photoData = canvas.toDataURL('image/jpeg', .8); $('preview').src = photoData; $('preview').hidden = false;
  } catch (error) { if (revision === photoRevision) $('form-error').textContent = error.message.startsWith('Choose') ? error.message : 'Could not read this photo. Try a JPEG or PNG.'; }
  finally { if (url) URL.revokeObjectURL(url); if (revision === photoRevision) { photoLoading = false; submit.disabled = false; } }
};
$('log-form').onsubmit = async event => {
  event.preventDefault(); if (photoLoading || !db) return;
  const submit = $('log-form').querySelector('[type=submit]'); submit.disabled = true;
  const g = activeCar.generations.find(g => g.id === $('generation').value);
  const spec = g?.specifications?.find(s => s.id === $('specification').value);
  try {
    await mutate(store => store.put({ id: crypto.randomUUID(), carID: activeCar.id, carTitle: `${activeCar.brand} ${activeCar.name}`, specificationID: spec?.id ?? null, specificationLabel: spec?.name ?? null, generationID: g?.id ?? null, generationLabel: g ? formatGeneration(g) : null, date: new Date().toISOString(), note: $('note').value.trim(), photo: photoData }));
    $('log').close(); $('status').textContent = 'Sighting saved to this browser.';
  } catch { $('form-error').textContent = 'Could not save. Browser storage may be full or unavailable. Your draft is still here.'; }
  finally { submit.disabled = false; }
};
$('sightings').onclick = async event => {
  const button = event.target.closest('[data-delete]'); if (!button || !confirm('Delete this sighting and its photo?')) return;
  try { await mutate(store => store.delete(button.dataset.delete)); $('status').textContent = 'Sighting deleted.'; }
  catch { $('status').textContent = 'Could not delete the sighting. Please try again.'; }
};
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, sightings: sightings.map(s => ({...s, generationLabel: s.generationLabel ? englishGeneration(s.generationLabel) : null})) }, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = `car-spotter-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
try {
  const response = await fetch('./catalogue.json'); if (!response.ok) throw new Error('Catalogue request failed');
  cars = await response.json();
  try { db = await openDB(); sightings = await request(db.transaction('sightings').objectStore('sightings').getAll()); }
  catch { $('status').textContent = 'Browser storage is unavailable. You can browse, but cannot save sightings.'; }
  render();
} catch { $('status').textContent = 'Could not load the catalogue. Start the web server and reload this page.'; }
