import {calculateScore, nextScoreTarget} from './score.mjs';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const silhouette = `<div class="visual"><svg viewBox="0 0 200 90" fill="none" aria-hidden="true"><path d="M22 59V48l20-7 24-24h59l30 24 25 7v18H22Z" fill="currentColor" opacity=".3"/><path d="m58 40 17-17h45l21 17H58Z" fill="currentColor" opacity=".5"/><circle cx="53" cy="65" r="13" fill="currentColor"/><circle cx="150" cy="65" r="13" fill="currentColor"/><circle cx="53" cy="65" r="6" fill="#eef0e8"/><circle cx="150" cy="65" r="6" fill="#eef0e8"/></svg><span class="placeholder">Reference photo not available</span></div>`;
let selectedLetter = 'A';
let expandedBrands = false, featuredBrands = new Set(), brandPreferences = new Map();
const brandIsPreferred = brand => brandPreferences.has(brand) ? brandPreferences.get(brand) : featuredBrands.has(brand);
const unfoldedLetters = new Set();
const brandIsFeatured = brand => unfoldedLetters.has(firstLetter(brand)) || brandIsPreferred(brand);
let selectedBrand = null, selectedGeneration = null, selectedSpecification = null;
let cars = [], sightings = [], db, activeCar, pageSize = 48, photoData = null, photoLoading = false, photoRevision = 0;
const englishGeneration = label => String(label ?? '').replace(/покол[іi]ння/gi, 'Generation').replace(/рестайл[іi]нг/gi, 'Facelift').replace(/^[IVXІ]+(?=[ -]Generation)/, prefix => prefix.replaceAll('І', 'I'));
const formatGeneration = g => `${englishGeneration(g.name)}${g.yearFrom ? ` · ${g.yearFrom}–${g.yearTo ?? 'unspecified'}` : ''}`;
let catalogueByID = new Map(), generationByID = new Map(), specificationByID = new Map();
function currentSightingLabels(s) {
  const car = catalogueByID.get(s.carID);
  const generation = generationByID.get(s.generationID);
  const specification = specificationByID.get(s.specificationID);
  return {...s, carTitle: car ? `${car.brand} ${car.name}` : s.carTitle,
    generationLabel: generation ? formatGeneration(generation) : s.generationLabel ? englishGeneration(s.generationLabel) : null,
    specificationLabel: specification?.name ?? s.specificationLabel};
}
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
  sightings = await request(db.transaction('sightings').objectStore('sightings').getAll()).then(rows => rows.map(currentSightingLabels));
  render();
}
function renderScore() {
  const score = calculateScore(sightings, catalogueByID);
  const target = nextScoreTarget(score.total);
  $('score-total').textContent = score.total.toLocaleString();
  $('score-target').textContent = `${(target - score.total).toLocaleString()} points to ${target.toLocaleString()}`;
  $('score-fill').setAttribute('stroke-dasharray', `${score.total / target * 100} 100`);
  $('score-gauge').setAttribute('aria-label', `${score.total} total points. Next target ${target}.`);
  $('score-models').textContent = `+${score.modelPoints.toLocaleString()}`;
  $('score-brands').textContent = `+${score.brandPoints.toLocaleString()}`;
  $('score-generations').textContent = `+${score.generationPoints.toLocaleString()}`;
}
function render() {
  renderScore();
  const spotted = new Set(sightings.map(s => s.carID));
  $('count').textContent = spotted.size;
  $('progress').textContent = `${spotted.size.toLocaleString()} / ${cars.length.toLocaleString()} models spotted`;
  renderFolder(spotted);
  $('sightings').innerHTML = [...sightings].sort((a,b) => b.date.localeCompare(a.date)).map(s => `<article class="card">${s.photo ? `<img class="sighting-photo" src="${s.photo}" alt="Your photo of ${escapeHTML(s.carTitle)}">` : silhouette}<div class="card-body"><div class="car-name">${escapeHTML(s.carTitle)}</div>${s.specificationLabel ? `<p class="meta">${escapeHTML(s.specificationLabel)}</p>` : ''}${s.generationLabel ? `<p class="meta">${escapeHTML(englishGeneration(s.generationLabel))}</p>` : ''}<p class="date">${escapeHTML(new Date(s.date).toLocaleString())}</p>${s.note ? `<p class="note">${escapeHTML(s.note)}</p>` : ''}${sightingSearch(s)}<button class="delete" data-delete="${escapeHTML(s.id)}">Delete sighting</button></div></article>`).join('') || '<div class="empty"><h3>Your collection starts here</h3><p>Find a car in the catalogue and log your first sighting.</p></div>';
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
$('alphabet').onclick = event => {
  const button = event.target.closest('[data-letter]');
  if (!button || button.disabled) return;
  tab(false);
  selectedLetter = button.dataset.letter; selectedBrand = null; activeCar = null; selectedGeneration = null; selectedSpecification = null; expandedBrands = false; $('search').value = ''; pageSize = 48; render();
};
const firstLetter = name => /^[A-Z]$/.test(name[0].toUpperCase()) ? name[0].toUpperCase() : '#';
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
$('catalogue-view').addEventListener('click', event => {
  if (event.target.closest('a')) return;
  const preference = event.target.closest('[data-brand-action]');
  if (preference) {
    const brand = preference.dataset.brand;
    const next = new Map(brandPreferences);
    const show = preference.dataset.brandAction === 'show';
    next.set(brand, show);
    try { localStorage.setItem('car-spotter-brand-preferences', JSON.stringify([...next])); }
    catch { $('status').textContent = 'Could not save brand preferences. Browser storage may be unavailable.'; return; }
    brandPreferences = next;
    if (!show) expandedBrands = true;
    render();
    $('status').textContent = !show && unfoldedLetters.has(firstLetter(brand))
      ? `Preference saved for ${brand}. This letter shows all brands while three or fewer would be under Show All.`
      : `${brand} ${show ? 'moved to the main list' : 'moved under Show All'}.`;
    const moved = [...document.querySelectorAll('[data-brand-settings]')].find(el => el.dataset.brandSettings === brand);
    moved?.querySelector('summary').focus();
    return;
  }
  if (event.target.closest('[data-brand-settings]')) return;
  if (event.target.closest('[data-expand-brands]')) {
    expandedBrands = !expandedBrands; render(); document.querySelector('#cars [data-expand-brands]')?.focus(); return;
  }
  if (!event.target.closest('#cars, #additional-brands')) return;
  const specButton = event.target.closest('[data-spec]');
  if (specButton) {
    selectedSpecification = selectedGeneration.specifications.find(s => s.id === specButton.dataset.spec);
    $('detail-content').innerHTML = `<p class="eyebrow">${escapeHTML(activeCar.brand)} · ${escapeHTML(activeCar.name)}</p><h2>${escapeHTML(selectedSpecification.name)}</h2><p>${escapeHTML(formatGeneration(selectedGeneration))}</p><div class="detail-visual">${silhouette}</div><p class="meta">Source record ${escapeHTML(selectedSpecification.sourceID)}</p><p class="muted">Body style and detailed technical fields were not supplied separately.</p>${googleLink(activeCar.brand, activeCar.name, selectedGeneration.name, selectedSpecification.name)}<button id="log-spec" class="primary" ${db ? '' : 'disabled'}>Log this specification</button>`;
    $('log-spec').onclick = () => { $('detail').close(); openLog(); };
    $('detail').showModal();
    return;
  }
  const button = event.target.closest('[data-level]');
  if (button) navigate(button.dataset.level, button.dataset.value);
});
function googleLink(...parts) {
  const query = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return `<a class="google-link" href="https://www.google.com/search?q=${escapeHTML(encodeURIComponent(query))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML('Google ' + query + ' (opens in a new tab)')}">Google it <span aria-hidden="true">↗</span></a>`;
}
function sightingSearch(s) {
  const car = catalogueByID.get(s.carID);
  const generation = generationByID.get(s.generationID);
  const specification = specificationByID.get(s.specificationID);
  return googleLink(car ? `${car.brand} ${car.name}` : s.carTitle, generation?.name, specification?.name);
}
function completionCircle(completed, total, unit) {
  const ratio = total ? completed / total : 0;
  const percent = completed === total && total ? 100 : Math.min(99, Math.round(ratio * 100));
  const label = total ? `${completed} of ${total} ${unit} spotted (${percent}%)` : 'Completion unavailable: no catalogue records';
  return `<span class="completion-circle${ratio === 1 ? ' complete' : ''}${!total ? ' unavailable' : ''}" role="img" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" data-completed="${completed}" data-total="${total}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="completion-track" cx="22" cy="22" r="18"/><circle class="completion-fill" cx="22" cy="22" r="18" pathLength="100" stroke-dasharray="${ratio * 100} 100"/></svg><span>${total ? percent + '%' : '—'}</span></span>`;
}
function folderCard(level, value, title, subtitle, spotted = false, progress = '') {
  const car = level === 'model' ? catalogueByID.get(value) : activeCar;
  const query = level === 'model' ? [car.brand, car.name] : [car.brand, car.name, title];
  return `<article class="card folder-card search-card"><button class="brand-open" data-level="${level}" data-value="${escapeHTML(value)}"><div class="folder-art"><div class="folder-icon" aria-hidden="true">▱</div>${progress}</div><div class="card-body"><div class="car-name">${escapeHTML(title)}</div><span class="meta">${escapeHTML(subtitle)}</span>${spotted ? '<span class="badge">✓ Spotted</span>' : ''}</div></button><div class="card-links">${googleLink(...query)}</div></article>`;
}
function brandCard(brand, subtitle, spotted, completed, total) {
  const main = brandIsFeatured(brand);
  return `<article class="card folder-card brand-card"><button class="brand-open" data-level="brand" data-value="${escapeHTML(brand)}"><div class="folder-art"><div class="folder-icon" aria-hidden="true">▱</div>${completionCircle(completed, total, 'models')}</div><div class="card-body"><div class="car-name">${escapeHTML(brand)}</div><span class="meta">${escapeHTML(subtitle)}</span>${spotted ? '<span class="badge">✓ Spotted</span>' : ''}</div></button><div class="card-links">${googleLink(brand)}</div><details class="card-settings" data-brand-settings="${escapeHTML(brand)}"><summary aria-label="Settings for ${escapeHTML(brand)}" title="Brand settings">⚙</summary><div class="card-settings-menu"><button data-brand-action="${main ? 'hide' : 'show'}" data-brand="${escapeHTML(brand)}">${main ? '↓ Hide under Show All' : '↑ Move to main list'}</button></div></details></article>`;
}
document.addEventListener('click', event => {
  for (const menu of document.querySelectorAll('.card-settings[open]')) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    for (const menu of document.querySelectorAll('.card-settings[open]')) { menu.open = false; menu.querySelector('summary').focus(); }
  }
});
function renderFolder(spotted) {
  const crumb = (level, value, title) => `<button data-level="${level}" data-value="${escapeHTML(value)}">${escapeHTML(title)}</button>`;
  $('breadcrumbs').innerHTML = crumb('root', '', `${selectedLetter} brands`) +
    (selectedBrand ? ' / ' + crumb('brand', selectedBrand, selectedBrand) : '') +
    (activeCar ? ' / ' + crumb('model', activeCar.id, activeCar.name) : '') +
    (selectedGeneration ? ' / ' + crumb('generation', selectedGeneration.id, selectedGeneration.name) : '');
  $('alphabet').hidden = false;
  const spottedGenerations = new Set(sightings.map(s => s.generationID).filter(Boolean));
  const query = $('search').value.trim().toLocaleLowerCase();
  let entries = [];
  $('folder-info').innerHTML = '';
  $('additional-section').hidden = true;
  $('additional-brands').innerHTML = '';
  $('search').closest('.filters').hidden = false;
  if (!selectedBrand) {
    $('folder-title').textContent = `${selectedLetter} · Brands`;
    $('search').placeholder = `Find a brand on the ${selectedLetter} page…`;
    const groups = new Map();
    for (const brand of featuredBrands) groups.set(brand, []);
    for (const car of cars) { if (!groups.has(car.brand)) groups.set(car.brand, []); groups.get(car.brand).push(car); }
    // Recalculate from saved preferences, before search, so the threshold is per letter.
    const hiddenCounts = new Map();
    for (const brand of groups.keys()) {
      if (!brandIsPreferred(brand)) hiddenCounts.set(firstLetter(brand), (hiddenCounts.get(firstLetter(brand)) || 0) + 1);
    }
    unfoldedLetters.clear();
    for (const letter of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#']) {
      if ((hiddenCounts.get(letter) || 0) <= 3) unfoldedLetters.add(letter);
    }
    const available = new Set([...groups.keys()].map(firstLetter));
    $('alphabet').innerHTML = `<div class="alphabet-heading"><span class="eyebrow">BROWSE BY LETTER</span><span class="letter-current" aria-live="polite">${selectedLetter}</span></div><div class="alphabet-letters">` + ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(letter => letter !== '#' || available.has('#')).map(letter => `<button data-letter="${letter}" aria-pressed="${selectedLetter === letter}" ${!available.has(letter) ? 'disabled' : ''} aria-label="Brands starting with ${letter === '#' ? 'numbers or symbols' : letter}">${letter}</button>`).join('') + '</div>';
    const letterBrands = [...groups].filter(([brand]) => firstLetter(brand) === selectedLetter).sort(([a], [b]) => a.localeCompare(b));
    const matches = ([brand]) => brand.toLocaleLowerCase().includes(query);
    const card = ([brand, models]) => brandCard(brand, models.length ? `${models.length} models · ${models.filter(c => spotted.has(c.id)).length} spotted` : 'Model records not available yet', models.some(c => spotted.has(c.id)), models.filter(c => spotted.has(c.id)).length, models.length);
    const featured = letterBrands.filter(([brand]) => brandIsFeatured(brand)).filter(matches);
    const additional = letterBrands.filter(([brand]) => !brandIsFeatured(brand));
    entries = featured.map(card);
    if (!entries.length) entries.push('<div class="empty">No matching folders on this letter page. Try another search or Show All.</div>');
    if (additional.length) {
      entries.push(`<button class="card folder-card show-all-card" data-expand-brands aria-expanded="${expandedBrands}" aria-controls="additional-section"><div class="folder-icon" aria-hidden="true">${expandedBrands ? '−' : '+'}</div><div class="card-body"><div class="car-name">${expandedBrands ? 'Show Less' : 'Show All'}</div><span class="meta">${additional.length} more ${selectedLetter} brands</span></div></button>`);
    }
    if (expandedBrands) {
      $('additional-section').hidden = false;
      $('additional-title').textContent = `More ${selectedLetter} brands`;
      $('additional-brands').innerHTML = additional.filter(matches).map(card).join('') || '<p class="muted">No additional brands match this search.</p>';
    }
    $('results').textContent = `${featured.length} brands${additional.length ? ` · ${additional.length} more ${expandedBrands ? 'below' : 'available'}` : ''}`;
  } else if (!activeCar) {
    $('folder-title').textContent = `${selectedBrand} models`;
    $('search').placeholder = `Find a ${selectedBrand} model…`;
    entries = cars.filter(c => c.brand === selectedBrand && c.name.toLocaleLowerCase().includes(query)).map(c => folderCard('model', c.id, c.name, `${c.generations.length} known generations`, spotted.has(c.id), completionCircle(c.generations.length ? c.generations.filter(g => spottedGenerations.has(g.id)).length : Number(spotted.has(c.id)), c.generations.length || 1, c.generations.length ? 'generations' : 'models')));
  } else if (!selectedGeneration) {
    $('folder-title').textContent = `${activeCar.name} generations`;
    $('search').placeholder = 'Find a generation…';
    entries = activeCar.generations.filter(g => formatGeneration(g).toLocaleLowerCase().includes(query)).map(g => folderCard('generation', g.id, g.name, `${g.yearFrom ?? 'Unknown start'}–${g.yearTo ?? 'unspecified end'} · View specifications`, sightings.some(s => s.generationID === g.id)));
    $('folder-info').innerHTML = `<p class="muted">${activeCar.generations.length ? 'Choose a generation to view its specifications, or log the model if you are unsure.' : 'Generation records are missing for this model. You can still log a model-level sighting.'}</p>${googleLink(activeCar.brand, activeCar.name)}<button id="open-log" class="primary" ${db ? '' : 'disabled'}>Log this model</button>`;
  } else {
    $('folder-title').textContent = `${activeCar.name} · Specifications`;
    $('search').placeholder = 'Find an engine or specification…';
    const specs = selectedGeneration.specifications ?? [];
    entries = specs.filter(spec => spec.name.toLocaleLowerCase().includes(query)).map(spec => `<article class="card search-card"><button class="brand-open" data-spec="${escapeHTML(spec.id)}"><div class="card-body"><h3>${escapeHTML(spec.name)}</h3><p class="meta">Source record ${escapeHTML(spec.sourceID)}</p><span class="meta">View specification →</span></div></button><div class="card-links">${googleLink(activeCar.brand, activeCar.name, selectedGeneration.name, spec.name)}</div></article>`);
    $('folder-info').innerHTML = `<div class="spec-panel"><div class="detail-visual">${silhouette}</div><h3>${escapeHTML(formatGeneration(selectedGeneration))}</h3><p class="muted">${specs.length ? 'Available specifications for this generation.' : 'Engine, trim, and specification records are not available in the source catalogue yet.'}</p>${googleLink(activeCar.brand, activeCar.name, selectedGeneration.name)}<button id="open-log" class="primary" ${db ? '' : 'disabled'}>Log this generation</button></div>`;
  }
  if (selectedBrand) $('results').textContent = selectedGeneration ? `${entries.length} specifications` : `${entries.length.toLocaleString()} ${!selectedBrand ? 'brands' : !activeCar ? 'models' : 'generations'}`;
  $('cars').innerHTML = entries.slice(0, selectedBrand ? pageSize : entries.length).join('') || (selectedGeneration || activeCar && !activeCar.generations.length ? '' : selectedBrand && !activeCar && !cars.some(c => c.brand === selectedBrand) ? '<div class="empty">Model records for this brand are not available in the catalogue yet.</div>' : '<div class="empty">No matching folders. Try another search.</div>');
  $('more').hidden = !selectedBrand || entries.length <= pageSize;
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
  const previousPoints = calculateScore(sightings, catalogueByID).total;
  const spec = g?.specifications?.find(s => s.id === $('specification').value);
  try {
    await mutate(store => store.put({ id: crypto.randomUUID(), carID: activeCar.id, carTitle: `${activeCar.brand} ${activeCar.name}`, specificationID: spec?.id ?? null, specificationLabel: spec?.name ?? null, generationID: g?.id ?? null, generationLabel: g ? formatGeneration(g) : null, date: new Date().toISOString(), note: $('note').value.trim(), photo: photoData }));
    $('log').close(); const earned = calculateScore(sightings, catalogueByID).total - previousPoints;
    $('status').textContent = `Sighting saved to this browser.${earned > 0 ? ` +${earned} points!` : ' Already discovered — no additional points.'}`;
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
  const featuredResponse = await fetch('./featured-brands.json');
  if (!featuredResponse.ok) throw new Error('Featured brands request failed');
  featuredBrands = new Set(await featuredResponse.json());
  try {
    const saved = JSON.parse(localStorage.getItem('car-spotter-brand-preferences') || '[]');
    if (Array.isArray(saved)) brandPreferences = new Map(saved.filter(entry => Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'boolean'));
  } catch { $('status').textContent = 'Brand preferences could not be loaded. Using the default list.'; }
  catalogueByID = new Map(cars.map(c => [c.id, c]));
  generationByID = new Map(cars.flatMap(c => c.generations.map(g => [g.id, g])));
  specificationByID = new Map(cars.flatMap(c => c.generations.flatMap(g => (g.specifications ?? []).map(s => [s.id, s]))));
  try { db = await openDB(); sightings = await request(db.transaction('sightings').objectStore('sightings').getAll()).then(rows => rows.map(currentSightingLabels)); }
  catch { $('status').textContent = 'Browser storage is unavailable. You can browse, but cannot save sightings.'; }
  render();
} catch { $('status').textContent = 'Could not load the catalogue. Start the web server and reload this page.'; }
