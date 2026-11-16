// Mobile Navigation Toggle
const menuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");

if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
        const isHidden = mobileMenu.classList.toggle("hidden");
        mobileMenu.classList.toggle("flex", !isHidden);
        menuBtn.setAttribute("aria-expanded", String(!isHidden));
    });
}

// Custom descriptions for each category
const CATEGORY_META = {
    Abstract: "Expressive textures, bold color explosions, and sculptural brushwork designed to make any display stand out.",
    Anime: "Cinematic anime-inspired landscapes, iconic characters, and atmospheric sunsets rendered in rich painterly detail.",
    Modern: "Clean lines, geometric balance, and minimalist compositions built for distraction-free desktop setups.",
    Motivational: "Bold typographic impasto paintings and daily reminders crafted to keep your focus sharp.",
    Nature: "Serene mountain peaks, cherry blossoms, moonlit coastlines, and dramatic skies in crisp 4K resolution.",
    Superhero: "Dark, cinematic portraits and iconic silhouettes reimagined with dramatic lighting and textured strokes."
};

// Progressive image helpers (matches main.js)
function getScaledUrl(url, width, quality = 75) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
}

function preloadAndSwap(img, nextSrc, clearBlur = false) {
    return new Promise((resolve) => {
        const loader = new Image();
        loader.src = nextSrc;
        loader.onload = () => {
            img.src = nextSrc;
            if (clearBlur) {
                img.classList.remove("blur-sm", "scale-105");
            }
            resolve(true);
        };
        loader.onerror = () => resolve(false);
    });
}

function getAdInterval(gridEl) {
    if (window.innerWidth < 768) return 8;
    const cols = getComputedStyle(gridEl).gridTemplateColumns.split(" ").filter(Boolean).length;
    const desktopCols = cols > 1 ? cols : 4;
    return desktopCols * 4;
}

// Initialize Dynamic Category Page
(function initCategoryPage() {
    const params = new URLSearchParams(window.location.search);
    const rawParam = (params.get("category") || params.get("c") || "").trim();

    const allWallpapers = Array.isArray(window.wallpapers) ? window.wallpapers : [];

    // Extract unique categories dynamically from wallpapers.js
    const availableCategories = [...new Set(allWallpapers.map(w => w.category))].sort();

    // Find case-insensitive match
    const matchedCategory = rawParam
        ? availableCategories.find(cat => cat.toLowerCase() === rawParam.toLowerCase())
        : null;

    const titleEl = document.getElementById("category-title");
    const descEl = document.getElementById("category-description");
    const countEl = document.getElementById("wallpaper-count");
    const breadcrumbEl = document.getElementById("breadcrumb-category");
    const pillsContainer = document.getElementById("category-pills");
    const grid = document.getElementById("category-grid");

    // 1. Render Category Filter Pills
    const pillItems = [
        { label: "All", href: "/category.html", active: !rawParam }
    ];

    availableCategories.forEach(cat => {
        pillItems.push({
            label: cat,
            href: `/category.html?category=${encodeURIComponent(cat)}`,
            active: matchedCategory === cat
        });
    });

    pillsContainer.innerHTML = pillItems.map(pill => `
        <a href="${pill.href}"
           class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition duration-200 ${
               pill.active
                   ? "bg-lime-300 text-zinc-950 font-semibold"
                   : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
           }">
            ${pill.label}
        </a>
    `).join("");

    // 2. Handle Invalid / Unknown Category in URL
    if (rawParam && !matchedCategory) {
        document.title = "Category Not Found | stillframe.";
        titleEl.textContent = "Category Not Found";
        breadcrumbEl.textContent = "Not Found";
        countEl.textContent = "0 Wallpapers";
        descEl.textContent = `We couldn't find a category matching "${rawParam}". Choose one of the collections above to browse wallpapers.`;
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center border border-zinc-800 rounded-2xl bg-zinc-950/40">
                <p class="text-zinc-400 mb-4">No wallpapers found for this category.</p>
                <a href="/index.html"
                   class="inline-block bg-lime-300 text-zinc-950 font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-lime-200 transition">
                    Back to Home →
                </a>
            </div>
        `;
        return;
    }

    // 3. Filter Wallpapers & Update Page Headings
    const filteredWallpapers = matchedCategory
        ? allWallpapers.filter(w => w.category === matchedCategory)
        : allWallpapers;

    const displayTitle = matchedCategory ? `${matchedCategory} Wallpapers` : "All Wallpapers";
    const displayDesc = matchedCategory
        ? (CATEGORY_META[matchedCategory] || `Explore our curated ${matchedCategory} wallpaper collection in high resolution.`)
        : "Browse the complete stillframe. collection across every style and category.";

    document.title = `${displayTitle} | stillframe.`;
    titleEl.innerHTML = matchedCategory
        ? `${matchedCategory} <span class="text-lime-300">Wallpapers.</span>`
        : `All <span class="text-lime-300">Wallpapers.</span>`;
    descEl.textContent = displayDesc;
    breadcrumbEl.textContent = matchedCategory || "All";
    countEl.textContent = `${filteredWallpapers.length} ${filteredWallpapers.length === 1 ? "Wallpaper" : "Wallpapers"}`;

    // 4. Render Grid + Mid-Grid AdSense Units
    const adInterval = getAdInterval(grid);
    const itemsHtml = [];

    filteredWallpapers.forEach((w, index) => {
        itemsHtml.push(`
            <a href="/wallpaper.html?id=${encodeURIComponent(w.id)}"
               class="group rounded-2xl hover:border-lime-300 transition duration-300">

                <div class="overflow-hidden rounded-xl bg-zinc-950 aspect-video border border-zinc-800/80 group-hover:border-lime-300/60 transition">
                    <img data-full="${w.image}"
                         data-index="${index}"
                         src="${w.thumb || getScaledUrl(w.image, 320, 45)}"
                         onerror="this.onerror=null; this.src=this.dataset.full; this.classList.remove('blur-sm', 'scale-105');"
                         alt="${w.title}"
                         loading="lazy"
                         decoding="async"
                         class="w-full h-full object-cover blur-sm scale-105 group-hover:scale-[1.02] transition-all duration-700">
                </div>

                <h3 class="text-white font-semibold mt-2 group-hover:text-lime-300 transition-colors">
                    ${w.title}
                </h3>

                <p class="text-sm text-zinc-400">
                    ${w.category} · ${w.size}
                </p>
            </a>
        `);

        const count = index + 1;
        if (count % adInterval === 0 && count < filteredWallpapers.length) {
            itemsHtml.push(`
                <div class="col-span-full my-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col items-center justify-center min-h-[140px]">
                    <span class="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Sponsored</span>
                    <ins class="adsbygoogle w-full"
                         style="display:block"
                         data-ad-client="ca-pub-2179785225331533"
                         data-ad-slot="1507326584"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                </div>
            `);
        }
    });

    grid.innerHTML = itemsHtml.join("");

    // Initialize any injected grid AdSense slots
    grid.querySelectorAll("ins.adsbygoogle").forEach((ad) => {
        if (!ad.dataset.adStatus) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
                console.error("AdSense push failed:", err);
            }
        }
    });

    // 5. Progressive Image Resolution Upgrade
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const img = entry.target;
            obs.unobserve(img);

            const fullUrl = img.dataset.full;
            const stagger = (Number(img.dataset.index) % 6) * 200;

            setTimeout(async () => {
                const mediumUrl = getScaledUrl(fullUrl, 800, 75);
                await preloadAndSwap(img, mediumUrl, true);

                setTimeout(() => {
                    preloadAndSwap(img, fullUrl, false);
                }, 2500 + stagger);
            }, 300 + stagger);
        });
    }, { rootMargin: "150px" });

    grid.querySelectorAll("img").forEach((img) => observer.observe(img));
})();