(() => {
  const script = document.currentScript;
  const siteRoot = new URL("../../", script.src);
  const categoryId = document.documentElement.dataset.category;
  const listMarkup = (publication) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const title = document.createElement("span");
    const arrow = document.createElement("span");
    const safePath = String(publication.url || "");
    if (!/^(panorama-nuevo-testamento|estudios-biblicos|guias-estudiantes|recursos)\/[a-zA-Z0-9_./-]+\.html$/.test(safePath) || safePath.includes("..")) return null;
    link.href = new URL(safePath, siteRoot).href;
    title.textContent = publication.title || "Publicación sin título";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    link.append(title, arrow);
    item.append(link);
    return item;
  };
  const showError = (target) => {
    target.replaceChildren();
    const message = document.createElement("p");
    message.className = "error-message";
    message.textContent = "No fue posible cargar la biblioteca. Intenta actualizar la página más tarde.";
    target.append(message);
  };

  fetch(new URL("publicaciones.json", siteRoot))
    .then((response) => {
      if (!response.ok) throw new Error("No se pudo leer el catálogo");
      return response.json();
    })
    .then((catalog) => {
      if (categoryId) {
        const category = (catalog.categories || []).find((entry) => entry.id === categoryId);
        const title = document.querySelector("[data-category-title]");
        const description = document.querySelector("[data-category-description]");
        const list = document.querySelector("[data-publication-list]");
        if (!category || !title || !description || !list) return;
        title.textContent = category.name;
        description.textContent = category.description;
        const publications = (catalog.publications || []).filter((entry) => entry.category === categoryId);
        list.replaceChildren(...publications.map(listMarkup).filter(Boolean));
        if (!publications.length) {
          const empty = document.createElement("p");
          empty.className = "empty-note";
          empty.textContent = "Aún no hay publicaciones en esta categoría.";
          list.replaceWith(empty);
        }
        document.title = `${category.name} | Escuela de Gloria`;
        return;
      }

      const target = document.querySelector("#library");
      if (!target) return;
      target.replaceChildren();
      (catalog.categories || []).forEach((category, index) => {
        const publications = (catalog.publications || []).filter((entry) => entry.category === category.id);
        const card = document.createElement("article");
        card.className = "category-card";
        const top = document.createElement("div");
        top.className = "category-top";
        const number = document.createElement("span");
        number.className = "category-number";
        number.textContent = category.number || String(index + 1).padStart(2, "0");
        const count = document.createElement("span");
        count.className = "category-count";
        count.textContent = `${publications.length} ${publications.length === 1 ? "publicación" : "publicaciones"}`;
        top.append(number, count);
        const heading = document.createElement("h3");
        heading.textContent = category.name;
        const description = document.createElement("p");
        description.textContent = category.description;
        const link = document.createElement("a");
        link.className = "category-link";
        link.href = new URL(`${category.id}/`, siteRoot).href;
        link.textContent = "Abrir categoría →";
        card.append(top, heading, description, link);
        if (publications.length) {
          const list = document.createElement("ul");
          list.className = "publication-list";
          list.append(...publications.map(listMarkup).filter(Boolean));
          card.append(list);
        }
        target.append(card);
      });
    })
    .catch(() => {
      const target = document.querySelector(categoryId ? "[data-publication-list]" : "#library");
      if (target) showError(target);
    });
})();
