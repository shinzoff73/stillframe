
const params = new URLSearchParams(window.location.search);
const wallpaperId = params.get("id");

const wallpaper = window.wallpapers.find(
    w => w.id === wallpaperId
);

if (!wallpaper) {

    document.body.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center text-white">
            <h1 class="text-4xl font-bold">404</h1>
            <p class="text-zinc-400 mt-3">Wallpaper not found.</p>
            <a href="/index.html"
               class="mt-5 text-lime-300">
                Back to Home →
            </a>
        </div>
    `;

} else {

    document.title = `${wallpaper.title} | Stillframe`;

    // Display wallpaper
    document.getElementById("wallpaper-image").src = wallpaper.image;
    document.getElementById("wallpaper-image").alt = wallpaper.title;

    // Display wallpaper information
    document.getElementById("wallpaper-title").textContent =
        wallpaper.title;

    document.getElementById("wallpaper-category").textContent =
        wallpaper.category;

    document.getElementById("wallpaper-category-info").textContent =
        wallpaper.category;

    document.getElementById("wallpaper-description").textContent =
        wallpaper.description;

    document.getElementById("wallpaper-resolution").textContent =
        wallpaper.resolution;

    document.getElementById("wallpaper-size").textContent =
        wallpaper.size;


    // Download Wallpaper
    const downloadButton = document.getElementById("download-button");

    downloadButton.addEventListener("click", async () => {

        const originalText = downloadButton.textContent;

        try {

            downloadButton.disabled = true;
            downloadButton.textContent = "Preparing Download...";

            // Fetch original image
            const response = await fetch(wallpaper.image);

            if (!response.ok) {
                throw new Error("Image download failed");
            }

            // Convert response into Blob
            const blob = await response.blob();

            // Detect image extension
            const mimeType = blob.type || "image/jpeg";
            const extension = mimeType.split("/")[1].split(";")[0] || "jpg";

            // Create temporary URL
            const imageURL = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement("a");

            link.href = imageURL;
            link.download = `${wallpaper.id}.${extension}`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            // Release memory
            setTimeout(() => {
                URL.revokeObjectURL(imageURL);
            }, 2000);

            downloadButton.textContent = "Downloaded ✓";

        } catch (error) {

            console.error("Download error:", error);

            downloadButton.textContent = "Download Failed";

            alert(
                "Unable to download this wallpaper. Your image host may be blocking external downloads."
            );

        } finally {

            downloadButton.disabled = false;

            setTimeout(() => {
                downloadButton.textContent = originalText;
            }, 2500);

        }

    });

}
