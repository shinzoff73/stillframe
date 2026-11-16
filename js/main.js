const grid = document.getElementById("wallpaper-grid");

// 1. Progressive image helpers
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

// 2. Calculate ad frequency: 8 images on mobile, 4 rows on PC
function getAdInterval() {
    const isMobile = window.innerWidth < 768; // Tailwind 'md' breakpoint
    if (isMobile) {
        return 8;
    }

    // Reads active CSS grid columns on PC (defaults to 4 if not detected)
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
    const desktopCols = cols > 1 ? cols : 4;
    return desktopCols * 4;
}

// 3. Render wallpapers + full-width AdSense slots
const adInterval = getAdInterval();
const itemsHtml = [];

window.wallpapers.forEach((w, index) => {
    itemsHtml.push(`
        <a href="/wallpaper.html?id=${encodeURIComponent(w.id)}"
           class="group rounded-2xl hover:border-lime-300 transition duration-300">

            <div class="overflow-hidden rounded-xl bg-zinc-900 aspect-video">
                <img data-full="${w.image}"
                     data-index="${index}"
                     src="${w.thumb || getScaledUrl(w.image, 320, 45)}"
                     onerror="this.onerror=null; this.src=this.dataset.full; this.classList.remove('blur-sm', 'scale-105');"
                     alt="${w.title}"
                     loading="lazy"
                     class="w-full h-full object-cover blur-sm scale-105 group-hover:scale-[1.01] transition-all duration-700">
            </div>

            <h3 class="text-white font-semibold mt-1 group-hover:text-lime-300">
                ${w.title}
            </h3>

            <p class="text-sm text-zinc-400">
                ${w.category} · ${w.size}
            </p>
        </a>
    `);

    const count = index + 1;
    if (count % adInterval === 0 && count < window.wallpapers.length) {
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

grid.innerHTML = itemsHtml.join("");

// 4. Load AdSense script once and initialize each injected <ins> slot
function initAdSense() {
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2179785225331533";
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
    }

    grid.querySelectorAll("ins.adsbygoogle").forEach((ad) => {
        if (!ad.dataset.adStatus) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
                console.error("AdSense push failed:", err);
            }
        }
    });
}

initAdSense();

// 5. Progressive resolution upgrade as wallpapers enter view
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

document.querySelectorAll("#wallpaper-grid img").forEach((img) => observer.observe(img));