import {calculateScore, nextScoreTarget} from './score.mjs';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const silhouette = `<div class="visual"><svg viewBox="0 0 200 90" fill="none" aria-hidden="true"><path d="M22 59V48l20-7 24-24h59l30 24 25 7v18H22Z" fill="currentColor" opacity=".3"/><path d="m58 40 17-17h45l21 17H58Z" fill="currentColor" opacity=".5"/><circle cx="53" cy="65" r="13" fill="currentColor"/><circle cx="150" cy="65" r="13" fill="currentColor"/><circle cx="53" cy="65" r="6" fill="#eef0e8"/><circle cx="150" cy="65" r="6" fill="#eef0e8"/></svg><span class="placeholder">Reference photo not available</span></div>`;
let selectedLetter = 'A';
let expandedBrands = false, featuredBrands = new Set(), brandPreferences = new Map();
const brandIsPreferred = brand => brandPreferences.has(brand) ? brandPreferences.get(brand) : featuredBrands.has(brand);
const unfoldedLetters = new Set();
const brandIsFeatured = brand => unfoldedLetters.has(firstLetter(brand)) || brandIsPreferred(brand);
let selectedBrand = null, selectedFamily = null, selectedGeneration = null, selectedBody = null, selectedEngine = null, selectedSpecification = null;
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
  $('sightings').innerHTML = [...sightings].sort((a,b) => b.date.localeCompare(a.date)).map(s => `<article class="card">${s.photo ? `<img class="sighting-photo" src="${s.photo}" alt="Your photo of ${escapeHTML(s.carTitle)}">` : silhouette}<div class="card-body"><div class="car-name">${escapeHTML(s.carTitle)}</div>${s.bodyStyleLabel ? `<p class="meta">${escapeHTML(s.bodyStyleLabel)}</p>` : ''}${s.engineName ? `<p class="meta">${escapeHTML(s.engineName)}</p>` : ''}${s.specificationLabel ? `<p class="meta">${escapeHTML(s.specificationLabel)}</p>` : ''}${s.generationLabel ? `<p class="meta">${escapeHTML(englishGeneration(s.generationLabel))}</p>` : ''}<p class="date">${escapeHTML(new Date(s.date).toLocaleString())}</p>${s.note ? `<p class="note">${escapeHTML(s.note)}</p>` : ''}${sightingSearch(s)}<button class="delete" data-delete="${escapeHTML(s.id)}">Delete sighting</button></div></article>`).join('') || '<div class="empty"><h3>Your collection starts here</h3><p>Find a car in the catalogue and log your first sighting.</p></div>';
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
  selectedLetter = button.dataset.letter; selectedBrand = null; activeCar = null; selectedFamily = null; selectedGeneration = null; selectedBody = null; selectedEngine = null; selectedSpecification = null; expandedBrands = false; $('search').value = ''; pageSize = 48; render();
};
const firstLetter = name => /^[A-Z]$/.test(name[0].toUpperCase()) ? name[0].toUpperCase() : '#';
function navigate(level, value) {
  selectedSpecification = null; selectedEngine = null;
  if (['root', 'brand', 'model'].includes(level)) { selectedFamily = null; selectedBody = null; }
  if (level === 'root') { selectedBrand = null; activeCar = null; selectedGeneration = null; }
  if (level === 'brand') { selectedBrand = value; activeCar = null; selectedGeneration = null; }
  if (level === 'model') { activeCar = cars.find(c => c.id === value); selectedGeneration = null; }
  if (level === 'family') { selectedFamily = activeCar.generationFamilies.find(f => f.id === value); selectedGeneration = null; selectedBody = null; }
  if (level === 'generation') { selectedGeneration = activeCar.generations.find(g => g.id === value); selectedBody = null; }
  if (level === 'body') { selectedBody = phaseFor(activeCar, selectedGeneration.id).bodyStyles.find(b => b.id === value); }
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
  const engineButton = event.target.closest('[data-engine]');
  if (engineButton) {
    selectedEngine = enginesFor(activeCar, selectedGeneration, selectedBody).find(e => e.name === engineButton.dataset.engine);
    selectedSpecification = null;
    $('detail-content').innerHTML = `<p class="eyebrow">${escapeHTML(activeCar.brand)} · ${escapeHTML(activeCar.name)}</p><h2>${escapeHTML(selectedEngine.name)}</h2><p>${escapeHTML(selectedFamily.name)} · ${escapeHTML(phaseFor(activeCar, selectedGeneration.id).name)} · ${escapeHTML(selectedBody.name)}</p><div class="detail-visual">${silhouette}</div><p class="muted">Gearbox and power details are optional generation-level references; exact body/version availability may vary.</p>${googleLink(activeCar.brand, activeCar.name, selectedFamily.name, phaseFor(activeCar, selectedGeneration.id).name, selectedBody.availabilityScope === 'unknown' ? '' : selectedBody.name, selectedEngine.name)}<button id="log-engine" class="primary" ${db ? '' : 'disabled'}>Log this car</button>`;
    $('log-engine').onclick = () => { $('detail').close(); openLog(); };
    $('detail').showModal(); return;
  }
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
function phaseFor(car, generationID) {
  return car?.generationFamilies?.flatMap(f => f.phases).find(p => p.id === generationID);
}
function enginesFor(car, generation, body) {
  const ids = body ? new Set(body.specificationIds) : null;
  const groups = new Map();
  for (const spec of generation?.specifications ?? []) {
    if (ids && !ids.has(spec.id)) continue;
    const name = spec.name.split(/\s+/)[0];
    if (!groups.has(name)) groups.set(name, {name, specifications: []});
    groups.get(name).specifications.push(spec);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function hierarchyCard(level, value, name, subtitle, searchParts) {
  return `<article class="card folder-card search-card"><button class="brand-open" data-level="${level}" data-value="${escapeHTML(value)}"><div class="folder-icon" aria-hidden="true">▱</div><div class="card-body"><div class="car-name">${escapeHTML(name)}</div><span class="meta">${escapeHTML(subtitle)}</span></div></button><div class="card-links">${googleLink(...searchParts)}</div></article>`;
}
function googleLink(...parts) {
  const query = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return `<a class="google-link" href="https://www.google.com/search?q=${escapeHTML(encodeURIComponent(query))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML('Google ' + query + ' (opens in a new tab)')}">Google it <span aria-hidden="true">↗</span></a>`;
}
function sightingSearch(s) {
  const car = catalogueByID.get(s.carID);
  const generation = generationByID.get(s.generationID);
  const specification = specificationByID.get(s.specificationID);
  return googleLink(car ? `${car.brand} ${car.name}` : s.carTitle, generation?.name, s.bodyStyleLabel === 'Body style not specified' ? '' : s.bodyStyleLabel, specification?.name || s.engineName);
}
function modelCompletion(car, spottedGenerations, spottedModels) {
  if (car.generationFamilies?.length) return {
    total: car.generationFamilies.length,
    completed: car.generationFamilies.filter(f => f.phases.some(p => spottedGenerations.has(p.id))).length
  };
  return {total: car.generations.length || 1,
    completed: car.generations.length ? car.generations.filter(g => spottedGenerations.has(g.id)).length : Number(spottedModels.has(car.id))};
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
    (selectedFamily ? ' / ' + crumb('family', selectedFamily.id, selectedFamily.name) : '') +
    (selectedGeneration ? ' / ' + crumb('generation', selectedGeneration.id, selectedFamily ? phaseFor(activeCar, selectedGeneration.id).name : selectedGeneration.name) : '') +
    (selectedBody ? ' / ' + crumb('body', selectedBody.id, selectedBody.name) : '');
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
    entries = cars.filter(c => c.brand === selectedBrand && [c.name, ...(c.referenceVariants ?? []).map(r => r.name)].some(name => name.toLocaleLowerCase().includes(query))).map(c => {
      const completion = modelCompletion(c, spottedGenerations, spotted);
      return folderCard('model', c.id, c.name, c.catalogueStatus === 'model_reference_only' ? 'Model reference · generation details pending' : `${c.generationFamilies?.length ?? c.generations.length} known generations`, spotted.has(c.id), completionCircle(completion.completed, completion.total, c.generations.length ? 'generations' : 'models'));
    });
  } else if (activeCar.generationFamilies?.length && !selectedFamily) {
    $('folder-title').textContent = `${activeCar.name} generations`;
    $('search').placeholder = 'Find a chassis generation…';
    entries = activeCar.generationFamilies.filter(f => f.name.toLowerCase().includes(query)).map(f => hierarchyCard('family', f.id, f.name, `${f.phases.length} facelift versions`, [activeCar.brand, activeCar.name, f.name]));
    $('folder-info').innerHTML = `<button id="open-log" class="primary" ${db ? '' : 'disabled'}>Log this model</button>`;
  } else if (selectedFamily && !selectedGeneration) {
    $('folder-title').textContent = `${selectedFamily.name} · Facelift versions`;
    $('search').placeholder = 'Find pre-facelift or facelift…';
    entries = selectedFamily.phases.filter(p => p.name.toLowerCase().includes(query)).map(p => hierarchyCard('generation', p.id, p.name, `${p.yearFrom ?? 'Unknown'}–${p.yearTo ?? 'unspecified end'}`, [activeCar.brand, activeCar.name, selectedFamily.name, p.name]));
  } else if (selectedFamily && !selectedBody) {
    $('folder-title').textContent = `${selectedFamily.name} · Body styles`;
    $('search').placeholder = 'Find coupé, wagon, sedan…';
    const phase = phaseFor(activeCar, selectedGeneration.id);
    entries = phase.bodyStyles.filter(b => b.name.toLowerCase().includes(query)).map(b => hierarchyCard('body', b.id, b.name, b.availabilityScope === 'unknown' ? 'Body information unavailable for these specifications' : 'Version availability may vary', [activeCar.brand, activeCar.name, selectedFamily.name, phase.name, b.availabilityScope === 'unknown' ? '' : b.name]));
    $('folder-info').innerHTML = `<button id="open-log" class="primary" ${db ? '' : 'disabled'}>Log this version</button>`;
  } else if (selectedFamily && selectedBody) {
    $('folder-title').textContent = `${selectedFamily.name} · ${selectedBody.name} · Specifications`;
    $('search').placeholder = 'Find 320i, 325i…';
    entries = enginesFor(activeCar, selectedGeneration, selectedBody).filter(e => e.name.toLowerCase().includes(query)).map(e => `<article class="card search-card"><button class="brand-open" data-engine="${escapeHTML(e.name)}"><div class="card-body"><h3>${escapeHTML(e.name)}</h3><p class="meta">View car and log sighting →</p></div></button><div class="card-links">${googleLink(activeCar.brand, activeCar.name, selectedFamily.name, phaseFor(activeCar, selectedGeneration.id).name, selectedBody.availabilityScope === 'unknown' ? '' : selectedBody.name, e.name)}</div></article>`);
    $('folder-info').innerHTML = `<p class="muted">${selectedBody.availabilityScope === 'unknown' ? 'These generation specifications have no verified body-style assignment.' : 'Body styles are supported at chassis-family level. Exact facelift, gearbox, and power combinations may vary.'}</p><button id="open-log" class="primary" ${db ? '' : 'disabled'}>Log this body style</button>`;
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
  if (activeCar) {
    if (activeCar.catalogueStatus === 'model_reference_only') {
      $('folder-info').insertAdjacentHTML('afterbegin', '<p class="muted">This model was added from an external reference index. Generation and specification details are not available yet.</p>');
    }
    const aliases = [...new Set((activeCar.referenceVariants ?? []).map(r => r.name))].sort((a,b) => a.localeCompare(b));
    if (aliases.length) $('folder-info').insertAdjacentHTML('beforeend', `<details class="reference-options"><summary>Also listed as · ${aliases.length} model / variant names</summary><p class="muted small">Related source names are grouped here. They do not identify a specific generation or earn separate model points.</p><ul>${aliases.map(name => `<li><span>${escapeHTML(name)}</span> ${googleLink(activeCar.brand, activeCar.name, name)}</li>`).join('')}</ul></details>`);
  }
  if (selectedBrand) {
    const unit = !activeCar ? 'models' : selectedBody ? 'specifications' : selectedFamily && selectedGeneration ? 'body styles' : selectedFamily ? 'facelift versions' : selectedGeneration ? 'specifications' : 'generations';
    $('results').textContent = `${entries.length.toLocaleString()} ${unit}`;
  }
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
  populateBodyStyles(selectedBody?.id, selectedEngine?.name, selectedSpecification?.id);
  $('log').showModal();
}
function formGeneration() { return activeCar.generations.find(g => g.id === $('generation').value); }
function formBody() { return phaseFor(activeCar, $('generation').value)?.bodyStyles.find(b => b.id === $('body-style').value); }
function populateBodyStyles(bodyID = '', engineName = '', specificationID = '') {
  const bodies = phaseFor(activeCar, $('generation').value)?.bodyStyles ?? [];
  $('body-style').innerHTML = '<option value="">Not sure / version only</option>' + bodies.map(b => `<option value="${escapeHTML(b.id)}">${escapeHTML(b.name)}</option>`).join('');
  $('body-style').value = bodyID || ''; $('body-style').disabled = !bodies.length;
  populateEngines(engineName, specificationID);
}
function populateEngines(engineName = '', specificationID = '') {
  const engines = enginesFor(activeCar, formGeneration(), formBody());
  $('engine').innerHTML = '<option value="">Not sure / no engine identified</option>' + engines.map(e => `<option>${escapeHTML(e.name)}</option>`).join('');
  $('engine').value = engineName || ''; $('engine').disabled = !engines.length;
  populateSpecifications(specificationID);
}
function formSpecifications() {
  const engines = enginesFor(activeCar, formGeneration(), formBody());
  return engines.filter(e => !$('engine').value || e.name === $('engine').value).flatMap(e => e.specifications);
}
function populateSpecifications(selectedID = '') {
  const specs = formSpecifications();
  $('specification').innerHTML = '<option value="">Not sure / no technical details</option>' + specs.map(spec => `<option value="${escapeHTML(spec.id)}">${escapeHTML(spec.name)} · #${escapeHTML(spec.sourceID)}</option>`).join('');
  $('specification').value = selectedID || ''; $('specification').disabled = !specs.length;
}
$('generation').onchange = () => populateBodyStyles();
$('body-style').onchange = () => populateEngines();
$('engine').onchange = () => populateSpecifications();
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
  const spec = formSpecifications().find(s => s.id === $('specification').value);
  const body = formBody();
  const engineName = $('engine').value || null;
  try {
    await mutate(store => store.put({ id: crypto.randomUUID(), carID: activeCar.id, carTitle: `${activeCar.brand} ${activeCar.name}`, bodyStyleID: body?.id ?? null, bodyStyleLabel: body?.name ?? null, engineName, specificationID: spec?.id ?? null, specificationLabel: spec?.name ?? null, generationID: g?.id ?? null, generationLabel: g ? formatGeneration(g) : null, date: new Date().toISOString(), note: $('note').value.trim(), photo: photoData }));
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
