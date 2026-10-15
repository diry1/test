const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.CAR_SPOTTER_URL||'http://127.0.0.1:8000');await page.locator('#folder-title').filter({hasText:'A · Brands'}).waitFor();
 assert(!await page.locator('#advanced-search').isVisible());
 await page.locator('#expand-search').click();assert.equal(await page.locator('#expand-search').getAttribute('aria-expanded'),'true');
 await page.locator('#filter-brand').selectOption('BMW');assert(!await page.locator('#filter-model').isDisabled());
 await page.locator('#filter-model').selectOption('autoria:9:3219');
 await page.locator('#filter-year-from').fill('1990');await page.locator('#filter-year-to').fill('1995');
 await page.locator('#filter-hp-min').fill('120');await page.locator('#filter-hp-max').fill('150');
 const cards=await page.locator('#cars .card').allTextContents();assert(cards.length>0);
 assert(cards.every(label=>label.includes('BMW › 3 Series')));
 assert((await page.locator('#cars .brand-name').allTextContents()).every(t=>t==='specification'));
 for(const title of await page.locator('#cars .car-name').allTextContents()){const hp=Number(title.match(/(\d+)\s*hp/)[1]);assert(hp>=120&&hp<=150);}
 await page.locator('#search').fill('320i');assert(await page.locator('#cars [data-search-result]').count());
 await page.locator('#expand-search').click();assert(!await page.locator('#advanced-search').isVisible());assert.match(await page.locator('#active-filter-summary').innerText(),/BMW.*3 Series.*120.*150/);
 await page.locator('#expand-search').click();await page.locator('#filter-hp-min').fill('200');assert.match(await page.locator('#filter-error').innerText(),/Minimum horsepower/);assert.equal(await page.locator('#cars [data-search-result]').count(),0);
 await page.locator('#clear-search-filters').click();assert.equal(await page.locator('#filter-error').innerText(),'');assert(await page.locator('#filter-model').isDisabled());assert(await page.locator('#cars [data-search-result]').count());
 await page.locator('#filter-brand').selectOption('Tesla');assert.equal(await page.locator('#filter-model').inputValue(),'');assert(!(await page.locator('#filter-model option').allTextContents()).includes('3 Series'));
 await page.locator('#search').fill('');await page.locator('#cars [data-search-result]').first().click();assert.equal(await page.locator('#filter-brand').inputValue(),'');assert.equal(await page.locator('#search').inputValue(),'');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: expanded filters, dependent models, year/hp ranges, text combination, hidden-panel summary, invalid range, clear, navigation and mobile layout');
})().catch(e=>{console.error(e);process.exit(1)});
