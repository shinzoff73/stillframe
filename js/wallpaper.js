const params = new URLSearchParams(window.location.search);
const wallpaperId = params.get("id");

const wallpaper = window.wallpapers.find(w => w.id === wallpaperId);

if (!wallpaper) {
    document.body.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center text-white">
            <h1 class="text-4xl font-bold">404</h1>
            <p class="text-zinc-400 mt-3">Wallpaper not found.</p>
            <a href="/index.html" class="mt-5 text-lime-300">
                Back to Home →
            </a>
        </div>
    `;
} else {
    document.title = `${wallpaper.title} | Stillframe`;

    // Display main wallpaper
    const mainImg = document.getElementById("wallpaper-image");
    mainImg.src = wallpaper.image;
    mainImg.alt = wallpaper.title;

    // Display wallpaper information
    document.getElementById("wallpaper-title").textContent = wallpaper.title;
    document.getElementById("wallpaper-category").textContent = wallpaper.category;
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

        // Insert 1 AdSense block right after the 10th wallpaper
        if (index + 1 === 10 && recommendations.length > 10) {
            itemsHtml.push(`
                 <div>
            <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-2179785225331533"
                data-ad-slot="1507326584" data-ad-format="auto" data-full-width-responsive="true"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>
            `);
        }
    });

    recGrid.innerHTML = itemsHtml.join("");

    // Initialize the single injected AdSense unit
    const injectedAd = recGrid.querySelector("ins.adsbygoogle");
    if (injectedAd && !injectedAd.dataset.adStatus) {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error("Recommendation AdSense push failed:", err);
        }
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