const SITE_ORIGIN = "https://stillframe.youtubethumbgrabber.xyz";

const params = new URLSearchParams(window.location.search);
const wallpaperId = params.get("id");
const shouldAutoDownload = params.get("autodownload") === "1";

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

    // Update Breadcrumbs
    const categoryUrl = `/category.html?category=${encodeURIComponent(wallpaper.category)}`;
    const breadcrumbCatLink = document.getElementById("breadcrumb-category-link");
    if (breadcrumbCatLink) {
        breadcrumbCatLink.textContent = wallpaper.category;
        breadcrumbCatLink.href = categoryUrl;
    }

    const breadcrumbTitle = document.getElementById("breadcrumb-title");
    if (breadcrumbTitle) {
        breadcrumbTitle.textContent = wallpaper.title;
    }

    // Display main wallpaper
    const altText = `${wallpaper.title} — ${wallpaper.size} (${wallpaper.resolution}) ${wallpaper.category} Wallpaper`;
    const mainImg = document.getElementById("wallpaper-image");
    mainImg.src = wallpaper.image;
    mainImg.alt = altText;

    const captionEl = document.getElementById("wallpaper-caption");
    if (captionEl) captionEl.textContent = altText;

    // Display wallpaper information
    document.getElementById("wallpaper-title").textContent = wallpaper.title;

    const categoryBadge = document.getElementById("wallpaper-category");
    categoryBadge.textContent = wallpaper.category;
    categoryBadge.href = categoryUrl;

    document.getElementById("wallpaper-category-info").textContent = wallpaper.category;
    document.getElementById("wallpaper-description").textContent = wallpaper.description;
    document.getElementById("wallpaper-resolution").textContent = wallpaper.resolution;
    document.getElementById("wallpaper-size").textContent = wallpaper.size;

    // Download Button Handler
    const downloadButton = document.getElementById("download-button");

    downloadButton.addEventListener("click", () => {
        // If inside Instagram / Facebook in-app browser, redirect to Chrome first with ?autodownload=1
        if (isInAppBrowser()) {
            redirectToChromeForDownload(downloadButton, wallpaper.image);
            return;
        }

        // Standard browser download
        startWallpaperDownload(wallpaper, downloadButton);
    });

    // If Chrome just opened from Instagram with ?autodownload=1, clean URL and start download automatically
    if (shouldAutoDownload && !isInAppBrowser()) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("autodownload");
        window.history.replaceState({}, "", cleanUrl.toString());

        setTimeout(() => {
            startWallpaperDownload(wallpaper, downloadButton);
        }, 400);
    }

    // Render 20 Optimized Recommendations (10 Same Category + 1 Ad + 10 Random Other Categories)
    initRecommendations(wallpaper);
}

// --- Download & Instagram-to-Chrome Redirect Helpers ---

function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    return /Instagram|FBAN|FBAV|FB_IAB|Line|Snapchat|Twitter|wv/i.test(ua);
}

function isAndroid() {
    return /Android/i.test(navigator.userAgent || "");
}

function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function getAutoDownloadPageUrl() {
    const target = new URL(window.location.href);
    target.searchParams.set("autodownload", "1");
    return target.toString();
}

function getChromeIntentUrl(targetUrl) {
    const strippedUrl = targetUrl.replace(/^https?:\/\//i, "");
    const fallback = encodeURIComponent(targetUrl);
    return `intent://${strippedUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

function getIOSChromeUrl(targetUrl) {
    return targetUrl.replace(/^https:\/\//i, "googlechromes://").replace(/^http:\/\//i, "googlechrome://");
}

function redirectToChromeForDownload(buttonEl, imageUrl) {
    const autoDownloadUrl = getAutoDownloadPageUrl();
    const originalText = buttonEl.textContent;

    if (isAndroid()) {
        buttonEl.textContent = "Opening in Chrome...";
        const intentUrl = getChromeIntentUrl(autoDownloadUrl);

        // Synchronous top-level navigation so Android WebView honors the user gesture
        window.location.href = intentUrl;

        // If the WebView blocked the automatic intent redirect, show a manual one-tap Chrome button
        setTimeout(() => {
            if (document.visibilityState === "visible") {
                buttonEl.textContent = originalText;
                showInAppHelper(buttonEl, imageUrl, intentUrl);
            }
        }, 900);
        return;
    }

    // iOS WKWebView blocks intent:// schemes, so show clear 2-tap instructions + optional Chrome scheme
    showInAppHelper(buttonEl, imageUrl, isIOS() ? getIOSChromeUrl(autoDownloadUrl) : autoDownloadUrl);
}

function showInAppHelper(buttonEl, imageUrl, externalBrowserUrl) {
    if (document.getElementById("inapp-download-tip")) return;

    const tip = document.createElement("div");
    tip.id = "inapp-download-tip";
    tip.className = "p-4 rounded-2xl bg-zinc-950/90 border border-lime-300/30 text-xs text-zinc-300 space-y-3";

    if (isAndroid()) {
        tip.innerHTML = `
            <p class="text-zinc-300 leading-relaxed">
                To use all features we recommend external browser. Tap below to open this page in Chrome—your download will start automatically.
            </p>
            <a href="${externalBrowserUrl}"
               class="flex items-center justify-center gap-1.5 w-full bg-lime-300 text-zinc-950 font-semibold py-2.5 px-4 rounded-full text-xs hover:bg-lime-200 transition">
                Open in Chrome ↗
            </a>
        `;
    } else {
        tip.innerHTML = `
            <p class="text-zinc-300 leading-relaxed">
                To use all features we recommend external browser. Tap below to open this page in Chrome—your download will start automatically (or tap <strong>•••</strong> → <strong>Open in Browser</strong>).
            </p>
            <a href="${externalBrowserUrl}"
               class="flex items-center justify-center gap-1.5 w-full bg-lime-300 text-zinc-950 font-semibold py-2.5 px-4 rounded-full text-xs hover:bg-lime-200 transition">
                Open in Chrome ↗
            </a>
            <a href="${imageUrl}" target="_blank" rel="noopener"
               class="block text-center text-lime-300 underline underline-offset-4 font-medium">
                Open full-resolution image directly ↗
            </a>
        `;
    }

    buttonEl.insertAdjacentElement("afterend", tip);
}

function getDownloadFileName(w) {
    const rawExt = (w.image.split("?")[0].split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
    return `${w.id}.${safeExt}`;
}

function triggerDirectAttachmentDownload(imageUrl, fileName) {
    const attachmentUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(fileName)}&q=100`;
    const link = document.createElement("a");
    link.href = attachmentUrl;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

async function startWallpaperDownload(w, buttonEl) {
    const originalText = buttonEl.textContent;
    const fileName = getDownloadFileName(w);

    try {
        buttonEl.disabled = true;
        buttonEl.textContent = "Preparing Download...";

        const response = await fetch(w.image);
        if (!response.ok) throw new Error("Image download failed");

        const blob = await response.blob();
        const mimeType = blob.type || "image/jpeg";
        const extension = mimeType.split("/")[1].split(";")[0] || "jpg";
        const imageURL = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = imageURL;
        link.download = `${w.id}.${extension}`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(imageURL), 2000);
        buttonEl.textContent = "Downloaded ✓";
    } catch (error) {
        console.error("Blob download failed, falling back to direct attachment:", error);
        triggerDirectAttachmentDownload(w.image, fileName);
        buttonEl.textContent = "Download Started ✓";
    } finally {
        buttonEl.disabled = false;
        setTimeout(() => {
            buttonEl.textContent = originalText;
        }, 2500);
    }
}

// --- Dynamic SEO & Structured Data Helper ---

function updateWallpaperSEO(w) {
    const pageTitle = `${w.title} (${w.size} ${w.category} Wallpaper) | stillframe.`;
    const canonicalUrl = `${SITE_ORIGIN}/wallpaper.html?id=${encodeURIComponent(w.id)}`;
    const categoryCanonicalUrl = `${SITE_ORIGIN}/category.html?category=${encodeURIComponent(w.category)}`;
    const pageDesc = w.description || `Download ${w.title} in ${w.resolution} (${w.size}) resolution for free at stillframe.`;
    const imageAlt = `${w.title} — ${w.size} ${w.category} Wallpaper`;

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
    setMeta('meta[property="og:image:alt"]', "content", imageAlt);

    setMeta('meta[name="twitter:title"]', "content", pageTitle);
    setMeta('meta[name="twitter:description"]', "content", pageDesc);
    setMeta('meta[name="twitter:image"]', "content", w.image);
    setMeta('meta[name="twitter:image:alt"]', "content", imageAlt);

    const schemaEl = document.getElementById("wallpaper-schema");
    if (schemaEl) {
        const [width, height] = (w.resolution || "").split("×").map(s => s.trim());
        schemaEl.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "ImageObject",
                    "@id": `${canonicalUrl}#image`,
                    "name": w.title,
                    "description": pageDesc,
                    "contentUrl": w.image,
                    "url": canonicalUrl,
                    "representativeOfPage": true,
                    "width": width ? Number(width) : undefined,
                    "height": height ? Number(height) : undefined,
                    "encodingFormat": w.image.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
                    "license": `${SITE_ORIGIN}/pages/terms.html`,
                    "acquireLicensePage": `${SITE_ORIGIN}/pages/terms.html`,
                    "creditText": "stillframe.",
                    "creator": {
                        "@type": "Organization",
                        "name": "stillframe.",
                        "url": SITE_ORIGIN
                    }
                },
                {
                    "@type": "BreadcrumbList",
                    "@id": `${canonicalUrl}#breadcrumb`,
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": `${SITE_ORIGIN}/`
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": w.category,
                            "item": categoryCanonicalUrl
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": w.title,
                            "item": canonicalUrl
                        }
                    ]
                }
            ]
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
                         alt="${w.title} — ${w.size} ${w.category} Wallpaper"
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