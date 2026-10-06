const assert = require('node:assert/strict');
const {catalogueUrl} = require('../../lib/catalogue');
const idsIn = html => [...html.matchAll(/class=["'][^"']*\bqblock\b[^"']*["']\s+id=["']q([A-Z0-9]+)["']/gi)].map(m => m[1].toUpperCase());
const configIn = html => {
  const match = html.match(/<script id="catalogue-data" type="application\/json">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
};
const graphIn = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1])['@graph'] || []);

// Read every real HTML page: checking only the client ID manifest would miss
// inaccessible chunks, repeated fragments, broken canonicals and lost tasks.
async function readCataloguePages(get, route) {
  const html = await get(route), config = configIn(html);
  if (!config) return {html, ids: idsIn(html), pages: 1};
  const ids = [];
  for (let page = 1; page <= config.totalPages; page++) {
    const pagePath = catalogueUrl(config.basePath, {page, query: config.query});
    const body = page === 1 ? html : await get(pagePath);
    const state = configIn(body), chunk = idsIn(body);
    assert.equal(state.page, page, `${pagePath}: requested page`);
    assert.equal(state.offset, (page - 1) * config.pageSize);
    assert.deepEqual(state.ids, config.ids, `${pagePath}: stable collection`);
    assert.equal((body.match(/<h1\b/g) || []).length, 1);
    const canonical = body.match(/rel="canonical" href="([^"]+)"/)?.[1].replace(/&amp;/g, '&');
    assert.equal(canonical, 'https://ege-fipi.ru' + pagePath, `${pagePath}: canonical`);
    assert.deepEqual(chunk, config.ids.slice(state.offset, state.offset + state.pageSize), `${pagePath}: real conditions`);
    assert.ok(chunk.length <= 12);
    const list = graphIn(body).find(g => g['@type'] === 'CollectionPage')?.mainEntity;
    assert.equal(list.numberOfItems, config.total);
    assert.deepEqual(list.itemListElement.map(i => i.url), chunk.map(id => 'https://ege-fipi.ru/tasks/' + id));
    assert.deepEqual(list.itemListElement.map(i => i.position), chunk.map((_, index) => state.offset + index + 1));
    if (page < config.totalPages) {
      const href = catalogueUrl(config.basePath, {page: page + 1, query: config.query}) + '#tasks';
      assert.ok(body.replace(/&amp;/g, '&').includes(`href="${href}" rel="next"`), `${pagePath}: crawlable next link`);
    }
    ids.push(...chunk);
  }
  assert.deepEqual(ids, config.ids, `${route}: complete sequence`);
  assert.equal(ids.length, new Set(ids).size, `${route}: duplicate task`);
  return {html, ids, pages: config.totalPages};
}
module.exports = {readCataloguePages, configIn};
