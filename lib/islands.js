/*========================================================
 islands.js — Client-side island hydration helper for Nocturnal.

 Three hydration strategies:
   - client:load    — hydrate immediately on page load
   - client:visible — hydrate when component enters the viewport
   - client:idle    — hydrate when the main thread is free (requestIdleCallback)

 Islands can optionally lazy-load their HTML content first (lazy-html: true in pattern):
   - Fetches HTML fragment from /partials/ before running JS
   - Useful for reducing initial page weight (landing pages with lots of images/hydration)

 Usage (pseudo-code):
   - Mark a wrapper with data-island=\"name\" and data-strategy
   - Provide JS factories for each island name to hydrate them
==========================================================*/


/**
 * Hydrate a single island with a specific strategy.
 *
 * @param {Element} container  - The [data-island] element
 * @param {() => Promise<any>} - Dynamic import factory
 * @param {string} strategy    - 'client:load' | 'client:visible' | 'client:idle'
 */
function hydrateOne(container, importFactory, strategy) {

  const name        = container.dataset.island;
  const lazyHtmlSrc = container.dataset.src; // If present, load HTML first
  const isLazyHtml  = !!lazyHtmlSrc;

  const load = () => {
    // If lazy-html, fetch HTML fragment first, then hydrate JS
    if (isLazyHtml) {
      return fetch(lazyHtmlSrc)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
          return r.text();
        })
        .then((html) => {

          container.innerHTML = html;

          console.log(`[nocturnal/islands] Loaded HTML for "${name}" from ${lazyHtmlSrc}`);
          
          // Now hydrate the JS for the island 
          return importFactory().catch((err) => {
            console.error(`[nocturnal/islands] Failed to hydrate JS for island "${name}":`, err);
          });
        })
        .catch((err) => {
          console.error(`[nocturnal/islands] Failed to load HTML for island "${name}" from ${lazyHtmlSrc}:`, err);
          container.innerHTML = `<!-- Failed to load island: ${name} -->`;
        });
    }
    
    // Normal JS-only island (HTML already in page)
    return importFactory().catch((err) => {
      console.error(`[nocturnal/islands] Failed to load island "${name}":`, err);
    });
  };

  switch (strategy) {
    case 'client:load':
      load();
      break;

    case 'client:visible': {
      if (!('IntersectionObserver' in window)) {
        load();
        break;
      }
      const observer = new IntersectionObserver((entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            load();
          }
        }
      }, { rootMargin: '100px 0px', threshold: 0.1 });
      observer.observe(container);
      break;
    }

    case 'client:idle':
      if ('requestIdleCallback' in window) {
        requestIdleCallback(load, { timeout: 2000 });
      } else {
        setTimeout(load, 200);
      }
      break;

    default:
      load();
  }
}


/**
 * Hydrate all islands on the page.
 * Reads strategy from data-strategy attribute on each [data-island] container.
 * Falls back to 'client:load' if not specified.
 *
 * @param {Record<string, () => Promise<any>>} islandMap - { islandName: importFactory }
 */
export function hydrateIslands(islandMap) {
  
  // Expose globally so dynamically loaded sections can access it
  window.__nocturnal_islandMap = islandMap;
  
  for (const [name, factory] of Object.entries(islandMap)) {
    const containers = document.querySelectorAll(`[data-island="${name}"]`);

    if (!containers.length) {
      console.warn(`[nocturnal/islands] No [data-island="${name}"] found in DOM.`);
      continue;
    }

    for (const container of containers) {
      const strategy = container.dataset.strategy || 'client:load';
      console.log(`[nocturnal/islands] "${name}" strategy: ${strategy}`);
      hydrateOne(container, factory, strategy);
    }
  }
}
