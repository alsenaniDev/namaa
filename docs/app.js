// Namaa landing page interactions: scroll reveal, sticky header, counters.
(function () {
    "use strict";

    var prefersReduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Screens carousel: manual next/previous navigation.
    (function () {
        var viewport = document.querySelector(".screens-viewport");
        var prevBtn = document.querySelector(".carousel-prev");
        var nextBtn = document.querySelector(".carousel-next");
        if (!viewport || !prevBtn || !nextBtn) return;

        function step() {
            var shot = viewport.querySelector(".screen-shot");
            if (!shot) return viewport.clientWidth * 0.8;
            var style = getComputedStyle(shot);
            var margin =
                parseFloat(style.marginInlineStart || style.marginLeft) || 0;
            return shot.getBoundingClientRect().width + margin;
        }

        // In RTL, scrollLeft is 0 at the start and becomes negative toward the end.
        var isRTL =
            getComputedStyle(viewport).direction === "rtl" ||
            document.documentElement.dir === "rtl";

        function scrollByDir(forward) {
            // "forward" = advance to the next item in reading order.
            var delta = step() * 2;
            viewport.scrollBy({
                left: isRTL ? (forward ? -delta : delta) : forward ? delta : -delta,
                behavior: prefersReduced ? "auto" : "smooth",
            });
        }

        function updateButtons() {
            var max = viewport.scrollWidth - viewport.clientWidth;
            var pos = Math.abs(viewport.scrollLeft);
            prevBtn.disabled = pos <= 1;
            nextBtn.disabled = pos >= max - 1;
        }

        nextBtn.addEventListener("click", function () {
            scrollByDir(true);
        });
        prevBtn.addEventListener("click", function () {
            scrollByDir(false);
        });
        viewport.addEventListener("scroll", updateButtons, { passive: true });
        window.addEventListener("resize", updateButtons);
        updateButtons();
    })();

    // Sticky header shadow on scroll.
    var header = document.getElementById("siteHeader");
    function onScroll() {
        if (!header) return;
        header.classList.toggle("scrolled", window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Scroll reveal.
    var revealEls = Array.prototype.slice.call(
        document.querySelectorAll(".reveal")
    );

    function animateCounters(scope) {
        var counters = scope.querySelectorAll("[data-count]");
        Array.prototype.forEach.call(counters, function (el) {
            if (el.dataset.done) return;
            el.dataset.done = "1";
            var target = parseFloat(el.getAttribute("data-count")) || 0;
            var suffix = el.getAttribute("data-suffix") || "";
            if (prefersReduced || target === 0) {
                el.textContent = target + suffix;
                return;
            }
            var start = performance.now();
            var dur = 1200;
            function tick(now) {
                var p = Math.min((now - start) / dur, 1);
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(target * eased) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });
    }

    if ("IntersectionObserver" in window && !prefersReduced) {
        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("in");
                    animateCounters(entry.target);
                    io.unobserve(entry.target);
                });
            },
            { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
        );

        revealEls.forEach(function (el, i) {
            el.style.setProperty("--reveal-delay", (i % 3) * 90 + "ms");
            io.observe(el);
        });
    } else {
        // Fallback: show everything immediately.
        revealEls.forEach(function (el) {
            el.classList.add("in");
            animateCounters(el);
        });
    }

    // Subtle parallax on hero phones (pointer only).
    var stack = document.querySelector(".phone-stack");
    if (stack && !prefersReduced && window.matchMedia("(pointer: fine)").matches) {
        var frame;
        window.addEventListener(
            "mousemove",
            function (e) {
                if (frame) return;
                frame = requestAnimationFrame(function () {
                    frame = null;
                    var cx = window.innerWidth / 2;
                    var cy = window.innerHeight / 2;
                    var dx = (e.clientX - cx) / cx;
                    var dy = (e.clientY - cy) / cy;
                    stack.style.setProperty("--tilt-x", (dy * -4).toFixed(2) + "deg");
                    stack.style.setProperty("--tilt-y", (dx * 4).toFixed(2) + "deg");
                });
            },
            { passive: true }
        );
    }
})();
