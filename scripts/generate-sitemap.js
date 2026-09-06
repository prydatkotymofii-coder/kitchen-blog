// ==========================================================================
// Автоматична генерація sitemap.xml
//
// Цей скрипт Netlify запускає САМ при кожній публікації сайту. Він читає
// файли з даними (js/recipes-data.js та інші), збирає адреси всіх рецептів
// і статей та перезаписує sitemap.xml. Тобто тобі більше не треба нічого
// робити руками - додав рецепт, зробив Sync Changes, і Google одразу бачить
// нову сторінку в карті сайту.
//
// Якщо скрипт раптом впаде, публікація сайту НЕ зламається - у найгіршому
// випадку залишиться попередня версія sitemap.xml.
// ==========================================================================

const fs = require("fs");
const path = require("path");

const SITE = "https://tatoviy-kazan.netlify.app";
const ROOT = path.join(__dirname, "..");

// Статичні сторінки сайту
const STATIC_PAGES = [
  ["/", "1.0"],
  ["/recipes.html", "0.9"],
  ["/coffee.html", "0.9"],
  ["/articles.html", "0.8"],
  ["/coffee-articles.html", "0.8"],
  ["/about.html", "0.6"],
  ["/contact.html", "0.5"]
];

// Які файли з даними читати і на які сторінки ведуть їхні записи
const DATA_SOURCES = [
  { file: "js/recipes-data.js", variable: "RECIPES", page: "recipe.html" },
  { file: "js/coffee-data.js", variable: "COFFEE", page: "coffee-drink.html" },
  { file: "js/articles-data.js", variable: "ARTICLES", page: "article.html" },
  { file: "js/coffee-articles-data.js", variable: "COFFEE_ARTICLES", page: "coffee-article.html" }
];

// Дістає масив з JS-файлу, не виконуючи решту коду сторінки
function readArray(relPath, variable) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return [];
  const source = fs.readFileSync(fullPath, "utf8");
  try {
    const fn = new Function(`${source}\nreturn typeof ${variable} !== "undefined" ? ${variable} : [];`);
    const value = fn();
    return Array.isArray(value) ? value : [];
  } catch (err) {
    console.warn(`[sitemap] не вдалось прочитати ${relPath}: ${err.message}`);
    return [];
  }
}

function buildSitemap() {
  const urls = STATIC_PAGES.map(([loc, priority]) => ({ loc: SITE + loc, priority }));

  DATA_SOURCES.forEach((source) => {
    readArray(source.file, source.variable).forEach((item) => {
      if (item && item.id) {
        urls.push({
          loc: `${SITE}/${source.page}?id=${encodeURIComponent(item.id)}`,
          priority: "0.8"
        });
      }
    });
  });

  const body = urls
    .map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

try {
  const xml = buildSitemap();
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
  const count = (xml.match(/<url>/g) || []).length;
  console.log(`[sitemap] готово: ${count} адрес у sitemap.xml`);
} catch (err) {
  // Навмисно не валимо збірку - краще старий sitemap, ніж зламана публікація
  console.warn(`[sitemap] пропускаю генерацію через помилку: ${err.message}`);
}
