document.addEventListener("DOMContentLoaded", () => {

    // --- Setup: Select elements ---
    const folders = document.querySelectorAll(".folder");
    const backgroundOverlay = document.querySelector(".background-overlay");
    const galleryTitle = document.getElementById("gallery-title");
    const galleryDescription = document.getElementById("gallery-description");
    const popupGallery = document.getElementById("popup-gallery");
    const galleryContent = document.getElementById("gallery-content");
    const closeBtn = document.querySelector(".popup-gallery .close-btn");
    const slider = document.querySelector('.carousel-container'); // The draggable/scrollable element

    // --- Functionality 1: Folder Hover Effect ---
    folders.forEach(folder => {
        folder.addEventListener("mouseover", () => {
            const bgImage = folder.getAttribute("data-bg");
            const title = folder.getAttribute("data-title");
            const desc = folder.getAttribute("data-desc");

            if (bgImage) {
                backgroundOverlay.style.backgroundImage = `url(${bgImage})`;
            }
            galleryTitle.textContent = title || "Hover over a folder";
            galleryDescription.textContent = desc || "Move your mouse over a folder to see the preview.";
        });
    });

    // --- Functionality 2: Folder Click -> Show Thumbnail Grid ---
    let clickStartTime = 0;
    const DRAG_THRESHOLD_TIME = 250; // Time in ms to differentiate click from drag

    folders.forEach(folder => {
        folder.addEventListener("mousedown", () => {
            clickStartTime = Date.now();
        });

        folder.addEventListener("click", (e) => {
            const clickDuration = Date.now() - clickStartTime;

             // Prevents click if dragging or held too long
             if (slider && slider.classList.contains('is-dragging') || clickDuration > DRAG_THRESHOLD_TIME) {
                 console.log("Folder click ignored - likely drag action.");
                 if(slider) slider.classList.remove('is-dragging'); // Ensure flag is cleared if it was set
                 return; // Stop here if it was a drag
             }

            // Proceed with showing the gallery
            const folderTitle = folder.getAttribute("data-title");
            const imagesJson = folder.getAttribute("data-images");
            if (!imagesJson) return;

            try {
                const images = JSON.parse(imagesJson);
                galleryContent.innerHTML = ""; // Clear previous images
                images.forEach(imgSrc => {
                    const link = document.createElement("a");
                    link.href = imgSrc;
                    link.setAttribute("data-lightbox", `gallery-${folderTitle.replace(/\s+/g, '-')}`);
                    link.setAttribute("data-title", folderTitle);
                    const img = document.createElement("img");
                    img.src = imgSrc;
                    img.alt = `${folderTitle} Image`;
                    link.appendChild(img);
                    galleryContent.appendChild(link);
                });
                popupGallery.style.display = "flex"; // Show the popup
                // Initialize lightbox for the newly added elements *after* they are in the DOM
                if (typeof lightbox !== 'undefined') {
                    lightbox.init(); // Or lightbox.reload() if that's more appropriate for re-initialization
                } else {
                    console.warn("Lightbox script not found or initialized yet.");
                }
            } catch (error) {
                console.error("Error processing gallery:", error);
            }
        });
    });

    // --- Functionality 3: Close Thumbnail Grid ---
    function closeGallery() {
        if (popupGallery) {
            popupGallery.style.display = "none";
            galleryContent.innerHTML = ""; // Clear content when closing
        }
    }
    if (closeBtn) closeBtn.addEventListener("click", closeGallery);
    // Close gallery if clicking on the background overlay itself
    popupGallery.addEventListener('click', (e) => { if (e.target === popupGallery) closeGallery(); });


    // --- Functionality 4 & 5: Carousel Scrolling (Drag + Wheel + Auto-Scroll) ---
    if (slider) {
        let isDown = false; // For dragging
        let startX;
        let scrollLeft;
        let hasDragged = false;

        // Variables for Auto-Scrolling
        let isHoveringContainer = false;
        let autoScrollDirection = 0; // -1: left, 1: right, 0: none
        let animationFrameId = null;
        const scrollSpeed = 3.5;
        const edgeZonePercentage = 0.15; // 15% edge zone

        // Auto-scroll animation function
        function autoScroll() {
            if (!isHoveringContainer || isDown || autoScrollDirection === 0) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                return;
            }

            const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
            const currentScrollLeft = slider.scrollLeft;
            let newScrollLeft = currentScrollLeft + autoScrollDirection * scrollSpeed;
            newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));

            if (newScrollLeft !== currentScrollLeft) {
                slider.scrollLeft = newScrollLeft;
                animationFrameId = requestAnimationFrame(autoScroll);
            } else {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        // --- Drag Scrolling (Mouse) ---
        slider.addEventListener('mousedown', (e) => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            autoScrollDirection = 0;

            isDown = true; hasDragged = false;
            slider.classList.add('grabbing');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isHoveringContainer = false;
            autoScrollDirection = 0;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            if (!isDown) return;
            isDown = false;
            slider.classList.remove('grabbing');
             if (hasDragged) {
                 slider.classList.add('is-dragging');
                 setTimeout(() => slider.classList.remove('is-dragging'), 50);
             }
        });

        slider.addEventListener('mouseup', () => {
             if (!isDown) return; isDown = false;
             slider.classList.remove('grabbing');
             if (hasDragged) {
                 slider.classList.add('is-dragging');
                 setTimeout(() => slider.classList.remove('is-dragging'), 10);
             }
             if (isHoveringContainer) {
                 if (typeof lastClientX !== 'undefined' && typeof lastClientY !== 'undefined') {
                     const event = new MouseEvent('mousemove', {
                         clientX: lastClientX,
                         clientY: lastClientY
                     });
                     slider.dispatchEvent(event);
                 }
             }
        });

        let lastClientX = 0;
        let lastClientY = 0;

        slider.addEventListener('mousemove', (e) => {
            lastClientX = e.clientX;
            lastClientY = e.clientY;

            // Handle Dragging
            if (isDown) {
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX);
                if (Math.abs(walk) > 5) hasDragged = true;
                slider.scrollLeft = scrollLeft - (walk * 2.0);
                return;
            }

            // Handle Auto-Scrolling
            if (isHoveringContainer) {
                const rect = slider.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const containerWidth = slider.clientWidth;
                const edgeWidth = containerWidth * edgeZonePercentage;
                let newDirection = 0;
                const isScrollable = slider.scrollWidth > containerWidth;

                if (isScrollable) {
                    if (mouseX < edgeWidth) {
                        newDirection = -1;
                    } else if (mouseX > containerWidth - edgeWidth) {
                        newDirection = 1;
                    } else {
                        newDirection = 0;
                    }
                } else {
                    newDirection = 0;
                }

                if (newDirection !== autoScrollDirection) {
                    autoScrollDirection = newDirection;
                    if (autoScrollDirection !== 0 && !animationFrameId) {
                        animationFrameId = requestAnimationFrame(autoScroll);
                    }
                }
            }
        });

        slider.addEventListener('mouseenter', () => {
            isHoveringContainer = true;
        });

        // --- Drag Scrolling (Touch) ---
        slider.addEventListener('touchstart', (e) => {
             if (e.touches.length === 1) {
                 if (animationFrameId) {
                     cancelAnimationFrame(animationFrameId);
                     animationFrameId = null;
                 }
                 autoScrollDirection = 0;

                 isDown = true; hasDragged = false;
                 startX = e.touches[0].pageX - slider.offsetLeft;
                 scrollLeft = slider.scrollLeft;
             }
        }, { passive: true });

        slider.addEventListener('touchend', (e) => {
           if (isDown && e.touches.length === 0) {
               isDown = false;
                if (hasDragged) {
                    slider.classList.add('is-dragging');
                    setTimeout(() => slider.classList.remove('is-dragging'), 10);
                }
           }
        });

        slider.addEventListener('touchcancel', (e) => {
           if (isDown) {
               isDown = false;
               if(hasDragged) slider.classList.remove('is-dragging');
           }
        });

        slider.addEventListener('touchmove', (e) => {
            if (!isDown || e.touches.length !== 1) return;
            const x = e.touches[0].pageX - slider.offsetLeft;
            const walk = (x - startX);
             if (Math.abs(walk) > 5) hasDragged = true;
            slider.scrollLeft = scrollLeft - (walk * 2.0);
        }, { passive: true });

        // --- Mouse Wheel Scrolling ---
        slider.addEventListener('wheel', (e) => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                autoScrollDirection = 0;
            }

             if (slider.scrollWidth > slider.clientWidth) {
                 if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                     e.preventDefault();
                     slider.scrollLeft += e.deltaY * 0.6;
                 }
                 else if (Math.abs(e.deltaX) > 0) {
                      e.preventDefault();
                      slider.scrollLeft += e.deltaX * 0.6;
                 }
             }
        }, { passive: false });

    } else {
        console.error("Carousel container (.carousel-container) not found.");
    }

}); // --- End of DOMContentLoaded ---