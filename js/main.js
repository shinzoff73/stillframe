
const grid = document.getElementById("wallpaper-grid");

grid.innerHTML = window.wallpapers.map(w => `
    <a href="/wallpaper.html?id=${encodeURIComponent(w.id)}"
       class="group rounded-2xl hover:border-lime-300 transition duration-300">

        <img src="${w.image}"
             alt="${w.title}"
             loading="lazy"
             class="w-full aspect-video object-cover rounded-xl group-hover:scale-[1.01] transition">

        <h3 class="text-white font-semibold mt-1 group-hover:text-lime-300">
            ${w.title}
        </h3>

        <p class="text-sm text-zinc-400">
            ${w.category} · ${w.size}
        </p>
    </a>
`).join("");
