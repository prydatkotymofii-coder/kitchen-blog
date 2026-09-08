// ==========================================================================
// Збірка сайту: окремі сторінки для кожного рецепту/статті + sitemap.xml
//
// Netlify запускає цей скрипт САМ при кожній публікації. Він бере твої файли
// з даними (js/recipes-data.js та інші) і робить з кожного рецепту окрему
// HTML-сторінку. Завдяки цьому:
//   - месенджери показують правильне фото й назву при відправці посилання
//   - Google бачить готову сторінку без виконання JavaScript
//   - сторінка рецепту не тягне за собою всі інші рецепти (швидше)
//
// Тобі нічого робити руками не треба: пишеш рецепт у файл з даними,
// робиш Sync Changes - усе інше відбувається саме.
// ==========================================================================

const fs = require("fs");
const path = require("path");

const SITE = "https://tatoviy-kazan.netlify.app";
const AUTHOR = "Тимофій Придатко";
const ROOT = path.join(__dirname, "..");

// Розділи сайту: звідки брати дані і куди складати згенеровані сторінки
const SECTIONS = [
  {
    dir: "recipes",
    dataFile: "js/recipes-data.js",
    variable: "RECIPES",
    categoriesVariable: "CATEGORIES",
    kind: "recipe",
    theme: "food",
    brand: "Татовий казан",
    backUrl: "/recipes.html",
    backLabel: "← Усі рецепти",
    categoriesUrl: "/recipes.html",
    categoriesTitle: "Категорії"
  },
  {
    dir: "coffee",
    dataFile: "js/coffee-data.js",
    variable: "COFFEE",
    categoriesVariable: "COFFEE_CATEGORIES",
    kind: "recipe",
    theme: "coffee",
    brand: "Кав'ярня дядка Тимофія",
    backUrl: "/coffee.html",
    backLabel: "← Усі рецепти кави",
    categoriesUrl: "/coffee.html",
    categoriesTitle: "Категорії кави"
  },
  {
    dir: "articles",
    dataFile: "js/articles-data.js",
    variable: "ARTICLES",
    categoriesVariable: "CATEGORIES",
    categoriesFrom: "js/recipes-data.js",
    kind: "article",
    theme: "food",
    brand: "Татовий казан",
    backUrl: "/articles.html",
    backLabel: "← Усі статті",
    categoriesUrl: "/recipes.html",
    categoriesTitle: "Категорії"
  },
  {
    dir: "coffee-articles",
    dataFile: "js/coffee-articles-data.js",
    variable: "COFFEE_ARTICLES",
    categoriesVariable: "COFFEE_CATEGORIES",
    categoriesFrom: "js/coffee-data.js",
    kind: "article",
    theme: "coffee",
    brand: "Кав'ярня дядка Тимофія",
    backUrl: "/coffee-articles.html",
    backLabel: "← Усі статті про каву",
    categoriesUrl: "/coffee.html",
    categoriesTitle: "Категорії кави"
  }
];

const STATIC_PAGES = [
  ["/", "1.0"],
  ["/recipes.html", "0.9"],
  ["/coffee.html", "0.9"],
  ["/articles.html", "0.8"],
  ["/coffee-articles.html", "0.8"],
  ["/about.html", "0.6"],
  ["/contact.html", "0.5"]
];

// ---------- допоміжні функції ----------

// Дістає значення змінної з JS-файлу з даними.
// Якщо у файлі синтаксична помилка (загубилась кома чи дужка при вставці
// рецепту) - навмисно зупиняємо збірку. Тоді Netlify покаже "Deploy failed",
// а на сайті залишиться попередня робоча версія замість поламаної.
function readVariable(relPath, variable) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return [];
  const source = fs.readFileSync(fullPath, "utf8");
  try {
    const fn = new Function(
      `${source}\nreturn typeof ${variable} !== "undefined" ? ${variable} : [];`
    );
    const value = fn();
    return Array.isArray(value) ? value : [];
  } catch (err) {
    throw new Error(
      `у файлі ${relPath} помилка (${err.message}). ` +
        `Найчастіше це загублена кома між рецептами або зайва/пропущена дужка.`
    );
  }
}

// Екранування тексту, щоб лапки чи кутові дужки в рецепті не ламали розмітку
function esc(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Рядок-заголовок групи ("Бісквіт:", "Готуємо крем:") в кінці має двокрапку
function isGroupLabel(text) {
  return typeof text === "string" && text.trim().endsWith(":");
}

// "30 хв + 3 год томління" -> "PT3H30M" (формат, який розуміє Google)
function parseDuration(text) {
  if (!text) return null;
  const str = String(text).toLowerCase();
  let hours = 0;
  let minutes = 0;
  const hourMatch = str.match(/(\d+([.,]\d+)?)\s*год/);
  const minMatch = str.match(/(\d+)\s*хв/);
  if (hourMatch) hours = parseFloat(hourMatch[1].replace(",", "."));
  if (minMatch) minutes = parseInt(minMatch[1], 10);
  if (!hours && !minutes) return null;
  const wholeHours = Math.floor(hours);
  minutes += Math.round((hours - wholeHours) * 60);
  return `PT${wholeHours ? wholeHours + "H" : ""}${minutes ? minutes + "M" : ""}`;
}

function imageUrl(image) {
  if (!image) return null;
  return `${SITE}/${String(image).replace(/^\/+/, "")}`;
}

function jsonLdScript(data) {
  // "<" екрануємо, щоб вміст не міг закрити тег <script>
  const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

// ---------- шматки розмітки ----------

function headerHtml() {
  return `<header class="site-header">
  <nav class="nav">
    <a href="/index.html" class="nav-logo">Татовий <em>казан</em></a>
    <ul class="nav-links">
      <li><a href="/index.html">Головна</a></li>
      <li><a href="/recipes.html">Рецепти</a></li>
      <li><a href="/coffee.html">☕ Кав'ярня</a></li>
      <li><a href="/about.html">Про мене</a></li>
      <li><a href="/contact.html">Контакти</a></li>
    </ul>
    <button class="nav-toggle" aria-label="Меню">☰</button>
  </nav>
</header>`;
}

function footerHtml(section, categories) {
  const brandNote =
    section.theme === "coffee"
      ? "Кавовий куточок особистого блогу."
      : "Особистий блог з домашніми рецептами.";

  const categoryItems = categories
    .map(
      (cat) =>
        `          <li><a href="${section.categoriesUrl}?category=${encodeURIComponent(cat)}">${esc(cat)}</a></li>`
    )
    .join("\n");

  const bottom =
    section.theme === "coffee"
      ? "© 2026 Татовий казан · Кав'ярня дядка Тимофія"
      : "© 2026 Татовий казан";

  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <h4>${esc(section.brand)}</h4>
        <p style="color: var(--color-text-muted); font-size:0.9rem;">${brandNote}</p>
      </div>
      <div>
        <h4>Навігація</h4>
        <ul>
          <li><a href="/index.html">Головна</a></li>
          <li><a href="/recipes.html">Рецепти</a></li>
          <li><a href="/articles.html">Статті</a></li>
          <li><a href="/coffee.html">Кав'ярня</a></li>
          <li><a href="/about.html">Про мене</a></li>
          <li><a href="/contact.html">Контакти</a></li>
        </ul>
      </div>
      <div>
        <h4>${esc(section.categoriesTitle)}</h4>
        <ul>
${categoryItems}
        </ul>
      </div>
    </div>
    <div class="footer-bottom">${bottom}</div>
  </div>
</footer>`;
}

function mediaHtml(item) {
  if (item.image) {
    const src = "/" + String(item.image).replace(/^\/+/, "");
    return `<img src="${esc(src)}" alt="${esc(item.title)}" loading="eager" fetchpriority="high">`;
  }
  return `<div class="media-placeholder"><span>Фото</span></div>`;
}

function listHtml(items, tag) {
  const cls = tag === "ol" ? "steps-list" : "ingredient-list";
  const body = (items || [])
    .map((entry) =>
      isGroupLabel(entry)
        ? `        <li class="group-label">${esc(entry)}</li>`
        : `        <li>${esc(entry)}</li>`
    )
    .join("\n");
  return `<${tag} class="${cls}">\n${body}\n      </${tag}>`;
}

// ---------- генерація сторінки ----------

function buildPage(item, section, categories) {
  const isRecipe = section.kind === "recipe";
  const pageTitle = `${item.title} - ${section.brand}`;
  const url = `${SITE}/${section.dir}/${item.id}.html`;
  const img = imageUrl(item.image) || `${SITE}/images/social-preview.jpg`;
  const description = item.excerpt || `${item.title} - рецепт із блогу «Татовий казан».`;

  // Структурована розмітка для Google
  const schema = isRecipe
    ? {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: item.title,
        description: item.excerpt || "",
        image: item.image ? [imageUrl(item.image)] : undefined,
        author: { "@type": "Person", name: AUTHOR },
        recipeCategory: item.category,
        recipeYield: item.servings ? `${item.servings} порцій` : undefined,
        totalTime: parseDuration(item.time) || undefined,
        inLanguage: "uk-UA",
        recipeIngredient: (item.ingredients || []).filter((i) => !isGroupLabel(i)),
        recipeInstructions: (item.steps || [])
          .filter((s) => !isGroupLabel(s))
          .map((s) => ({ "@type": "HowToStep", text: s }))
      }
    : {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: item.title,
        description: item.excerpt || "",
        image: item.image ? [imageUrl(item.image)] : undefined,
        author: { "@type": "Person", name: AUTHOR },
        articleSection: item.category,
        inLanguage: "uk-UA"
      };

  const metaBlock = isRecipe
    ? `          <div class="recipe-detail-meta">
            <div><strong>${esc(item.time || "")}</strong>Час приготування</div>
            <div><strong>${esc(item.servings || "")}</strong>Порцій</div>
            <div><strong>${esc(item.difficulty || "")}</strong>Складність</div>
          </div>`
    : `          <div class="recipe-detail-meta">
            <div><strong>${esc(item.readTime || "")}</strong>Час читання</div>
          </div>`;

  const bodyBlock = isRecipe
    ? `          <div class="recipe-body-grid">
            <div class="recipe-panel">
              <h2>Інгредієнти</h2>
              ${listHtml(item.ingredients, "ul")}
            </div>
            <div class="recipe-panel">
              <h2>Покрокове приготування</h2>
              ${listHtml(item.steps, "ol")}
            </div>
          </div>`
    : `          <div class="article-body">
${(item.body || []).map((p) => `            <p>${esc(p)}</p>`).join("\n")}
          </div>`;

  const coffeeCss =
    section.theme === "coffee" ? `\n<link rel="stylesheet" href="/css/coffee-theme.css">` : "";
  const bodyClass = section.theme === "coffee" ? ` class="coffee-page"` : "";

  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Татовий казан">
<meta property="og:locale" content="uk_UA">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/favicon-48.png" sizes="48x48">
<link rel="icon" type="image/png" href="/favicon-96.png" sizes="96x96">
<link rel="icon" type="image/png" href="/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/css/style.css">${coffeeCss}
${jsonLdScript(schema)}
</head>
<body${bodyClass}>

${headerHtml()}

<section class="recipe-detail-header">
  <div class="container">
    <a href="${section.backUrl}" class="back-link">${section.backLabel}</a>
    <div class="recipe-card-category">${esc(item.category || "")}</div>
    <h1>${esc(item.title)}</h1>
    <p style="max-width:600px; color: var(--color-text-muted);">${esc(item.excerpt || "")}</p>
${metaBlock}
    <div class="recipe-detail-media">${mediaHtml(item)}</div>
  </div>
</section>

<section class="section" style="padding-top:0;">
  <div class="container">
${bodyBlock}
  </div>
</section>

${footerHtml(section, categories)}

<script src="/js/main.js"></script>
<script data-goatcounter="https://tatoviykazan.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
</body>
</html>
`;
}

// ---------- запуск ----------

function build() {
  const urls = STATIC_PAGES.map(([loc, priority]) => ({ loc: SITE + loc, priority }));
  let pagesWritten = 0;

  SECTIONS.forEach((section) => {
    const items = readVariable(section.dataFile, section.variable);
    const categories = readVariable(
      section.categoriesFrom || section.dataFile,
      section.categoriesVariable
    );

    const outDir = path.join(ROOT, section.dir);
    if (items.length === 0) return;
    fs.mkdirSync(outDir, { recursive: true });

    items.forEach((item) => {
      if (!item || !item.id || !item.title) {
        console.warn(`[build] пропускаю запис без id або назви у ${section.dataFile}`);
        return;
      }
      const html = buildPage(item, section, categories);
      fs.writeFileSync(path.join(outDir, `${item.id}.html`), html, "utf8");
      pagesWritten++;
      urls.push({ loc: `${SITE}/${section.dir}/${item.id}.html`, priority: "0.8" });
    });
  });

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n") +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");

  console.log(`[build] згенеровано сторінок: ${pagesWritten}, адрес у sitemap: ${urls.length}`);
}

try {
  build();
} catch (err) {
  console.error(`\n[build] ЗБІРКУ ЗУПИНЕНО: ${err.message}\n`);
  console.error("Сайт залишиться у попередній робочій версії. Виправ помилку у файлі з даними і зроби Sync Changes ще раз.\n");
  process.exit(1);
}
