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

// Повертає HTML для медіа-блоку картки: фото, якщо воно є, або елегантна заглушка
function recipeMediaHtml(r) {
  if (r.image) {
    return `<img src="${r.image}" alt="${r.title}" loading="lazy">`;
  }
  return `<div class="media-placeholder"><span>Фото</span></div>`;
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
