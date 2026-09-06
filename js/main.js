// Спільні скрипти сайту: мобільне меню, активний пункт навігації,
// рендер картки рецепту та підпис категорій у футері.

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
    });
  }

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });

  const footerCategories = document.getElementById("footer-categories");
  if (footerCategories) {
    const mode = footerCategories.dataset.mode || "food";
    const isCoffee = mode === "coffee";
    const cats = isCoffee
      ? (typeof COFFEE_CATEGORIES !== "undefined" ? COFFEE_CATEGORIES : [])
      : (typeof CATEGORIES !== "undefined" ? CATEGORIES : []);
    const targetPage = isCoffee ? "coffee.html" : "recipes.html";

    cats.forEach((cat) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `${targetPage}?category=${encodeURIComponent(cat)}`;
      a.textContent = cat;
      li.appendChild(a);
      footerCategories.appendChild(li);
    });
  }
});

// Повертає HTML для медіа-блоку картки: фото, якщо воно є, або елегантна заглушка.
// eager=true - для головного фото на сторінці рецепту (воно й так одразу видно,
// тому не варто його "ліниво" відкладати - це найважливіше фото для швидкості завантаження).
function recipeMediaHtml(r, eager) {
  if (r.image) {
    const loading = eager ? "eager" : "lazy";
    const priority = eager ? ' fetchpriority="high"' : "";
    return `<img src="${r.image}" alt="${r.title}" loading="${loading}"${priority}>`;
  }
  return `<div class="media-placeholder"><span>Фото</span></div>`;
}

// Рядок-заголовок групи (напр. "Бісквіт:", "Готуємо крем:") в кінці має ":".
// Такі рядки рендеряться як підзаголовок групи, а не як звичайний пункт списку -
// зручно для складних рецептів із кількома складовими (торти, багатошарові страви).
function isGroupLabel(text) {
  return typeof text === "string" && text.trim().endsWith(":");
}

function ingredientListHtml(items) {
  return (items || [])
    .map((i) => (isGroupLabel(i) ? `<li class="group-label">${i}</li>` : `<li>${i}</li>`))
    .join("");
}

function stepsListHtml(items) {
  return (items || [])
    .map((s) => (isGroupLabel(s) ? `<li class="group-label">${s}</li>` : `<li>${s}</li>`))
    .join("");
}

// ==========================================================================
// SEO: розмітка Schema.org та OG-теги для сторінок рецептів і статей.
// Завдяки цьому Google може показувати рецепт у пошуку з фото, часом
// приготування та інгредієнтами, а не просто як звичайне посилання.
// ==========================================================================

const SITE_AUTHOR = "Тимофій Придатко";

// Перетворює вільний текст часу ("30 хв + 3 год томління") у формат ISO 8601 ("PT3H30M")
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

function absoluteUrl(path) {
  if (!path) return null;
  try {
    return new URL(path, window.location.href).href;
  } catch (e) {
    return null;
  }
}

function setMetaTag(key, value, attr) {
  if (!value) return;
  attr = attr || "property";
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

// Оновлює og-теги під конкретний рецепт/статтю
function updateSocialTags(item, pageTitle) {
  setMetaTag("og:title", pageTitle);
  setMetaTag("og:description", item.excerpt || "");
  setMetaTag("og:url", window.location.href);
  setMetaTag("og:type", "article");
  setMetaTag("description", item.excerpt || "", "name");
  const img = absoluteUrl(item.image);
  if (img) setMetaTag("og:image", img);
}

function injectJsonLd(data) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

// Розмітка рецепту (страва або кава)
function injectRecipeSchema(r) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.title,
    description: r.excerpt || "",
    author: { "@type": "Person", name: SITE_AUTHOR },
    recipeCategory: r.category,
    inLanguage: "uk-UA",
    recipeIngredient: (r.ingredients || []).filter((i) => !isGroupLabel(i)),
    recipeInstructions: (r.steps || [])
      .filter((s) => !isGroupLabel(s))
      .map((s) => ({ "@type": "HowToStep", text: s }))
  };

  const img = absoluteUrl(r.image);
  if (img) data.image = [img];
  if (r.servings) data.recipeYield = `${r.servings} порцій`;

  const duration = parseDuration(r.time);
  if (duration) data.totalTime = duration;

  injectJsonLd(data);
}

// Розмітка статті
function injectArticleSchema(a) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt || "",
    author: { "@type": "Person", name: SITE_AUTHOR },
    articleSection: a.category,
    inLanguage: "uk-UA"
  };
  const img = absoluteUrl(a.image);
  if (img) data.image = [img];
  injectJsonLd(data);
}

function renderArticleCard(a, detailPage) {
  detailPage = detailPage || "article.html";
  const link = document.createElement("a");
  link.href = `${detailPage}?id=${encodeURIComponent(a.id)}`;
  link.className = "recipe-card-link";
  link.innerHTML = `
    <article class="recipe-card">
      <div class="recipe-card-media">${recipeMediaHtml(a)}</div>
      <div class="recipe-card-body">
        <div class="recipe-card-category">${a.category}</div>
        <h3 class="recipe-card-title">${a.title}</h3>
        <p class="recipe-card-excerpt">${a.excerpt || ""}</p>
        <div class="recipe-card-meta">
          <span>${a.readTime || ""}</span>
        </div>
      </div>
    </article>
  `;
  return link;
}

function renderRecipeCard(r, detailPage) {
  detailPage = detailPage || "recipe.html";
  const a = document.createElement("a");
  a.href = `${detailPage}?id=${encodeURIComponent(r.id)}`;
  a.className = "recipe-card-link";
  a.innerHTML = `
    <article class="recipe-card">
      <div class="recipe-card-media">${recipeMediaHtml(r)}</div>
      <div class="recipe-card-body">
        <div class="recipe-card-category">${r.category}</div>
        <h3 class="recipe-card-title">${r.title}</h3>
        <p class="recipe-card-excerpt">${r.excerpt || ""}</p>
        <div class="recipe-card-meta">
          <span>${r.time}</span>
          <span>${r.servings} порц.</span>
          <span>${r.difficulty}</span>
        </div>
      </div>
    </article>
  `;
  return a;
}
