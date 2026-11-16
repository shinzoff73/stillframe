const SITE_ORIGIN = "https://stillframe.youtubethumbgrabber.xyz";

const params = new URLSearchParams(window.location.search);
const wallpaperId = params.get("id");

const wallpaper = Array.isArray(window.wallpapers)
    ? window.wallpapers.find(w => w.id === wallpaperId)
    : null;

if (!wallpaper) {
    document.title = "Wallpaper Not Found | stillframe.";

    const robotsMeta = document.querySelector('meta[name="robots"]');
    if (robotsMeta) robotsMeta.setAttribute("content", "noindex, follow");

    const mainEl = document.getElementById("wallpaper-main");
    if (mainEl) {
        mainEl.innerHTML = `
            <div class="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
                <h1 class="text-5xl font-bold text-white">404</h1>
                <p class="text-zinc-400 mt-3 max-w-md">
                    We couldn't find that wallpaper. It may have been moved or the link is outdated.
                </p>
                <a href="/index.html"
                   class="mt-6 bg-lime-300 text-zinc-950 font-semibold px-6 py-3 rounded-full text-sm hover:bg-lime-200 transition">
                    Back to Home →
                </a>
            </div>
        `;
    }
} else {
    // Update SEO Meta Tags, Canonical URL & JSON-LD Schema
    updateWallpaperSEO(wallpaper);

    // Display main wallpaper
    const mainImg = document.getElementById("wallpaper-image");
    mainImg.src = wallpaper.image;
    mainImg.alt = `${wallpaper.title} — ${wallpaper.size} ${wallpaper.category} Wallpaper`;

    // Display wallpaper information
    document.getElementById("wallpaper-title").textContent = wallpaper.title;

    const categoryBadge = document.getElementById("wallpaper-category");
    categoryBadge.textContent = wallpaper.category;
    categoryBadge.href = `/category.html?category=${encodeURIComponent(wallpaper.category)}`;

    document.getElementById("wallpaper-category-info").textContent = wallpaper.category;
    document.getElementById("wallpaper-description").textContent = wallpaper.description;
    document.getElementById("wallpaper-resolution").textContent = wallpaper.resolution;
    document.getElementById("wallpaper-size").textContent = wallpaper.size;

    // Download Wallpaper
    const downloadButton = document.getElementById("download-button");

    downloadButton.addEventListener("click", async () => {
        const originalText = downloadButton.textContent;

        try {
            downloadButton.disabled = true;
            downloadButton.textContent = "Preparing Download...";

            const response = await fetch(wallpaper.image);
            if (!response.ok) throw new Error("Image download failed");

            const blob = await response.blob();
            const mimeType = blob.type || "image/jpeg";
            const extension = mimeType.split("/")[1].split(";")[0] || "jpg";
            const imageURL = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = imageURL;
            link.download = `${wallpaper.id}.${extension}`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(imageURL), 2000);
            downloadButton.textContent = "Downloaded ✓";
        } catch (error) {
            console.error("Download error:", error);
            downloadButton.textContent = "Download Failed";
            alert("Unable to download this wallpaper. Your image host may be blocking external downloads.");
        } finally {
            downloadButton.disabled = false;
            setTimeout(() => {
                downloadButton.textContent = originalText;
            }, 2500);
        }
    });

    // Render 20 Optimized Recommendations (10 Same Category + 1 Ad + 10 Random Other Categories)
    initRecommendations(wallpaper);
}

// --- Dynamic SEO & Structured Data Helper ---

function updateWallpaperSEO(w) {
    const pageTitle = `${w.title} (${w.size} ${w.category} Wallpaper) | stillframe.`;
    const canonicalUrl = `${SITE_ORIGIN}/wallpaper.html?id=${encodeURIComponent(w.id)}`;
    const pageDesc = w.description || `Download ${w.title} in ${w.resolution} (${w.size}) resolution for free at stillframe.`;

    document.title = pageTitle;

    const setMeta = (selector, attr, value) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", pageDesc);
    setMeta('link[rel="canonical"]', "href", canonicalUrl);

    setMeta('meta[property="og:title"]', "content", pageTitle);
    setMeta('meta[property="og:description"]', "content", pageDesc);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[property="og:image"]', "content", w.image);

    setMeta('meta[name="twitter:title"]', "content", pageTitle);
    setMeta('meta[name="twitter:description"]', "content", pageDesc);
    setMeta('meta[name="twitter:image"]', "content", w.image);

    const schemaEl = document.getElementById("wallpaper-schema");
    if (schemaEl) {
        const [width, height] = (w.resolution || "").split("×").map(s => s.trim());
        schemaEl.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "name": w.title,
            "description": pageDesc,
            "contentUrl": w.image,
            "url": canonicalUrl,
            "width": width || undefined,
            "height": height || undefined,
            "encodingFormat": w.image.endsWith(".png") ? "image/png" : "image/jpeg",
            "acquireLicensePage": `${SITE_ORIGIN}/pages/terms.html`,
            "creator": {
                "@type": "Organization",
                "name": "stillframe.",
                "url": SITE_ORIGIN
            }
        });
    }
}

// --- Recommendation & Progressive Loading Helpers ---

function getScaledUrl(url, width, quality = 75) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
}

function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function preloadAndSwap(img, nextSrc) {
    return new Promise((resolve) => {
        const loader = new Image();
        loader.src = nextSrc;
        loader.onload = () => {
            img.src = nextSrc;
            img.classList.remove("blur-sm", "scale-105");
            resolve(true);
        };
        loader.onerror = () => resolve(false);
    });
}

function getRecommendedWallpapers(currentWallpaper) {
    const candidates = window.wallpapers.filter(w => w.id !== currentWallpaper.id);

    const sameCategory = shuffleArray(
        candidates.filter(w => w.category === currentWallpaper.category)
    );
    const otherCategories = shuffleArray(
        candidates.filter(w => w.category !== currentWallpaper.category)
    );

    const pickedSame = sameCategory.slice(0, 10);
    const pickedOther = otherCategories.slice(0, 10);

    let combined = [...pickedSame, ...pickedOther];

    // If a category has fewer than 10 items, top up from remaining wallpapers to reach 20
    if (combined.length < 20) {
        const usedIds = new Set(combined.map(w => w.id));
        const remaining = shuffleArray(candidates.filter(w => !usedIds.has(w.id)));
        combined = [...combined, ...remaining.slice(0, 20 - combined.length)];
    }

    return combined.slice(0, 20);
}

function initRecommendations(currentWallpaper) {
    const recGrid = document.getElementById("recommendations-grid");
    const recSection = document.getElementById("recommendations-section");
    const recSubtitle = document.getElementById("recommendations-subtitle");

    if (!recGrid) return;

    const recommendations = getRecommendedWallpapers(currentWallpaper);

    if (recommendations.length === 0) {
        recSection?.classList.add("hidden");
        return;
    }

    if (recSubtitle) {
        recSubtitle.textContent = `Similar picks in ${currentWallpaper.category} and random discoveries from other collections.`;
    }

    const itemsHtml = [];

    recommendations.forEach((w, index) => {
        itemsHtml.push(`
            <a href="/wallpaper.html?id=${encodeURIComponent(w.id)}"
               class="group rounded-2xl transition duration-300">

                <div class="overflow-hidden rounded-xl bg-zinc-950 aspect-video border border-zinc-800/80 group-hover:border-lime-300/60 transition">
                    <img data-full="${w.image}"
                         data-index="${index}"
                         src="${w.thumb || getScaledUrl(w.image, 320, 40)}"
                         onerror="this.onerror=null; this.src=this.dataset.full; this.classList.remove('blur-sm', 'scale-105');"
                         alt="${w.title}"
                         loading="lazy"
                         decoding="async"
                         class="w-full h-full object-cover blur-sm scale-105 group-hover:scale-[1.02] transition-all duration-700">
                </div>

                <h3 class="text-white font-semibold mt-2 group-hover:text-lime-300 transition-colors line-clamp-1">
                    ${w.title}
                </h3>

                <p class="text-sm text-zinc-400">
                    ${w.category} · ${w.size}
                </p>
            </a>
        `);

        // Insert 1 full-width AdSense block right after the 10th wallpaper
        if (index + 1 === 10 && recommendations.length > 10) {
            itemsHtml.push(`
                <div class="col-span-full my-3 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center min-h-[250px]">
                    <span class="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Advertisement</span>
                    <ins class="adsbygoogle lazy-rec-ad w-full"
                         style="display:block"
                         data-ad-client="ca-pub-2179785225331533"
                         data-ad-slot="1507326584"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                </div>
            `);
        }
    });

    recGrid.innerHTML = itemsHtml.join("");

    // Lazy-initialize the mid-grid AdSense unit when user scrolls near it
    const injectedAd = recGrid.querySelector("ins.lazy-rec-ad");
    if (injectedAd) {
        const adObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                obs.unobserve(injectedAd);

                if (!injectedAd.dataset.adStatus) {
                    try {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                    } catch (err) {
                        console.error("Recommendation AdSense push failed:", err);
                    }
                }
            });
        }, { rootMargin: "250px" });

        adObserver.observe(injectedAd);
    }

    // Slowly & gently upgrade thumbnails to crisp 640px WebP only when scrolled into view
    let visibleBatch = 0;
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const img = entry.target;
            obs.unobserve(img);

            const delay = 250 + (visibleBatch++ * 180);
            setTimeout(() => {
                const crispCardUrl = getScaledUrl(img.dataset.full, 640, 75);
                preloadAndSwap(img, crispCardUrl);
            }, delay);
        });
    }, { rootMargin: "100px" });

    recGrid.querySelectorAll("img").forEach((img) => observer.observe(img));
}