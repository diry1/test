const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const silhouette = `<div class="visual"><svg viewBox="0 0 200 90" fill="none" aria-hidden="true"><path d="M22 59V48l20-7 24-24h59l30 24 25 7v18H22Z" fill="currentColor" opacity=".3"/><path d="m58 40 17-17h45l21 17H58Z" fill="currentColor" opacity=".5"/><circle cx="53" cy="65" r="13" fill="currentColor"/><circle cx="150" cy="65" r="13" fill="currentColor"/><circle cx="53" cy="65" r="6" fill="#eef0e8"/><circle cx="150" cy="65" r="6" fill="#eef0e8"/></svg><span class="placeholder">Reference photo not available</span></div>`;
let cars = [], sightings = [], db, activeCar, pageSize = 48, photoData = null, photoLoading = false, photoRevision = 0;
const formatGeneration = g => `${g.name}${g.yearFrom ? ` · ${g.yearFrom}–${g.yearTo ?? 'unspecified'}` : ''}`;
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
  const search = $('search').value.trim().toLocaleLowerCase();
  const filtered = cars.filter(c => (!$('brand').value || c.brand === $('brand').value) && `${c.brand} ${c.name}`.toLocaleLowerCase().includes(search));
  $('results').textContent = `${filtered.length.toLocaleString()} models`;
  $('cars').innerHTML = filtered.slice(0, pageSize).map(c => `<button class="card" data-car="${escapeHTML(c.id)}" aria-label="Open ${escapeHTML(c.brand)} ${escapeHTML(c.name)}">${silhouette}<div class="card-body"><div class="brand-name">${escapeHTML(c.brand)}</div><div class="car-name">${escapeHTML(c.name)}</div><span class="meta">${c.generations.length ? `${c.generations.length} generations` : 'Model details'} </span>${spotted.has(c.id) ? '<span class="badge">✓ Spotted</span>' : ''}</div></button>`).join('') || '<div class="empty">No matching cars. Try another brand or model.</div>';
  $('more').hidden = filtered.length <= pageSize;
  $('sightings').innerHTML = [...sightings].sort((a,b) => b.date.localeCompare(a.date)).map(s => `<article class="card">${s.photo ? `<img class="sighting-photo" src="${s.photo}" alt="Your photo of ${escapeHTML(s.carTitle)}">` : silhouette}<div class="card-body"><div class="car-name">${escapeHTML(s.carTitle)}</div>${s.generationLabel ? `<p class="meta">${escapeHTML(s.generationLabel)}</p>` : ''}<p class="date">${escapeHTML(new Date(s.date).toLocaleString())}</p>${s.note ? `<p class="note">${escapeHTML(s.note)}</p>` : ''}<button class="delete" data-delete="${escapeHTML(s.id)}">Delete sighting</button></div></article>`).join('') || '<div class="empty"><h3>Your collection starts here</h3><p>Find a car in the catalogue and log your first sighting.</p></div>';
  $('export').hidden = !sightings.length;
}
function tab(garage) {
  $('garage-view').hidden = !garage; $('catalogue-view').hidden = garage;
  $('garage-tab').classList.toggle('active', garage); $('catalogue-tab').classList.toggle('active', !garage);
}
$('catalogue-tab').onclick = () => tab(false);
$('garage-tab').onclick = () => tab(true);
for (const id of ['search', 'brand']) $(id).addEventListener('input', () => { pageSize = 48; render(); });
$('more').onclick = () => { pageSize += 48; render(); };
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
}
$('cars').onclick = event => {
  const button = event.target.closest('[data-car]'); if (!button) return;
  activeCar = cars.find(c => c.id === button.dataset.car);
  const count = sightings.filter(s => s.carID === activeCar.id).length;
  $('detail-content').innerHTML = `<p class="eyebrow">${escapeHTML(activeCar.brand)}</p><h2>${escapeHTML(activeCar.name)}</h2><div class="detail-visual">${silhouette}</div><h3>Generations</h3>${activeCar.generations.length ? `<ul>${activeCar.generations.map(g => `<li>${escapeHTML(formatGeneration(g))}</li>`).join('')}</ul>` : '<p class="muted">Generation details are not available yet. You can still log this model.</p>'}<p class="meta">${count} sighting${count === 1 ? '' : 's'} in your collection</p><button class="primary" id="open-log" ${db ? '' : 'disabled'}>+ Log a sighting</button>`;
  $('open-log').onclick = () => {
    $('detail').close(); $('log-form').reset(); photoData = null; photoRevision++; photoLoading = false;
    $('preview').hidden = true; $('preview').removeAttribute('src'); $('form-error').textContent = '';
    $('log-form').querySelector('[type=submit]').disabled = false;
    $('log-title').textContent = `${activeCar.brand} ${activeCar.name}`;
    $('generation').innerHTML = '<option value="">Not sure / model only</option>' + activeCar.generations.map(g => `<option value="${escapeHTML(g.id)}">${escapeHTML(formatGeneration(g))}</option>`).join('');
    $('log').showModal();
  };
  $('detail').showModal();
};
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
  try {
    await mutate(store => store.put({ id: crypto.randomUUID(), carID: activeCar.id, carTitle: `${activeCar.brand} ${activeCar.name}`, generationID: g?.id ?? null, generationLabel: g ? formatGeneration(g) : null, date: new Date().toISOString(), note: $('note').value.trim(), photo: photoData }));
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
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, sightings }, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = `car-spotter-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
try {
  const response = await fetch('./catalogue.json'); if (!response.ok) throw new Error('Catalogue request failed');
  cars = await response.json();
  $('brand').innerHTML += [...new Set(cars.map(c => c.brand))].sort().map(b => `<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join('');
  try { db = await openDB(); sightings = await request(db.transaction('sightings').objectStore('sightings').getAll()); }
  catch { $('status').textContent = 'Browser storage is unavailable. You can browse, but cannot save sightings.'; }
  render();
} catch { $('status').textContent = 'Could not load the catalogue. Start the web server and reload this page.'; }
