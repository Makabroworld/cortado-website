document.addEventListener('DOMContentLoaded', () => {
  
  // Download button — points at the installer hosted in Google Cloud
  // Storage (gs://cortado-downloads), not this site's own deploy: at
  // ~190MB the installer is far too large to ship inside a Vercel static
  // deploy, and updating it (new app version) shouldn't require
  // redeploying the whole site.
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      // window.va is installed by the Vercel Web Analytics script tag in
      // index.html — guarded since it's only present once Analytics is
      // enabled for this project in the Vercel dashboard.
      if (typeof window.va === 'function') {
        window.va('event', { name: 'download_click' });
      }
      window.location.href = 'https://storage.googleapis.com/cortado-downloads/CortadoSetup.exe';
    });
  }

  // Intersection Observer for scroll animations ("fade upwards")
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Optional: Stop observing once revealed
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  revealElements.forEach(el => {
    observer.observe(el);
  });
  
  // Scroll scrubbing for background video
  const bgVideo = document.getElementById('bg-video');
  const bgVideoRev = document.getElementById('bg-video-reversed');
  
  if (bgVideo && bgVideoRev) {
    let playTimer;
    
    const playForwardUntil = (videoEl, targetTime) => {
      clearInterval(playTimer);
      videoEl.playbackRate = 2.0; // Play 2x faster
      videoEl.play();
      playTimer = setInterval(() => {
        if (videoEl.currentTime >= targetTime) {
          videoEl.pause();
          videoEl.playbackRate = 1.0;
          videoEl.currentTime = targetTime;
          clearInterval(playTimer);
        }
      }, 15);
    };

    const initScrubbing = () => {
      bgVideo.currentTime = 0;
      bgVideo.pause();
      bgVideoRev.currentTime = 0;
      bgVideoRev.pause();

      const heroSection = document.getElementById('hero');
      const trailerSection = document.getElementById('trailer-section');

      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (entry.target.id === 'hero') {
              // Fade to reversed video (which sits on top of the original video)
              bgVideoRev.style.opacity = '1';
              
              // In the reversed video, 0s (original) is the END of the reversed video.
              // So 4s (original) is (duration - 4.0) in the reversed video.
              // Play FORWARD in the reversed video from (duration - 4.0) to (duration).
              const startTime = Math.max(0, bgVideoRev.duration - 4.0);
              bgVideoRev.currentTime = startTime;
              playForwardUntil(bgVideoRev, bgVideoRev.duration);
              
              const dot1 = document.getElementById('dot-1');
              const dot2 = document.getElementById('dot-2');
              if (dot1 && dot2) {
                dot1.classList.add('active');
                dot2.classList.remove('active');
              }
            } else if (entry.target.id === 'trailer-section') {
              // Fade out reversed video, revealing the original video underneath
              bgVideoRev.style.opacity = '0';
              
              // Play FORWARD in the original video from (duration - 4.0) to (duration)
              const startTime = Math.max(0, bgVideo.duration - 4.0);
              bgVideo.currentTime = startTime;
              playForwardUntil(bgVideo, bgVideo.duration);
              
              const dot1 = document.getElementById('dot-1');
              const dot2 = document.getElementById('dot-2');
              if (dot1 && dot2) {
                dot1.classList.remove('active');
                dot2.classList.add('active');
              }
            }
          }
        });
      }, {
        root: document.querySelector('.content-wrapper'),
        threshold: 0.5
      });

      if (heroSection) sectionObserver.observe(heroSection);
      if (trailerSection) sectionObserver.observe(trailerSection);
    };

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) initScrubbing();
    };

    if (bgVideo.readyState >= 1) checkLoaded();
    else bgVideo.addEventListener('loadedmetadata', checkLoaded);
    
    if (bgVideoRev.readyState >= 1) checkLoaded();
    else bgVideoRev.addEventListener('loadedmetadata', checkLoaded);
  }

  // Subtle scroll-linked parallax on text blocks -- offsets each
  // .parallax-text element vertically by a small fraction of its own
  // distance from the viewport's vertical center, so text drifts gently
  // as the page scrolls rather than sitting static. Distinct from
  // .reveal-on-scroll above: that's a one-time fade-in fired once by
  // IntersectionObserver, this recomputes continuously on every scroll
  // frame. content-wrapper fills the whole viewport (height:100vh), so
  // getBoundingClientRect()'s viewport-relative coordinates already line
  // up with it directly -- no extra offset math needed.
  const parallaxEls = Array.from(document.querySelectorAll('.parallax-text'));
  if (parallaxEls.length) {
    const scrollRoot = document.querySelector('.content-wrapper');
    let parallaxRaf = null;

    const updateParallax = () => {
      parallaxRaf = null;
      const viewportCenter = window.innerHeight / 2;
      parallaxEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const offset = elCenter - viewportCenter;
        // Small factor + a tight clamp is what keeps this "slight" --
        // without the clamp, an element far from center (still just
        // offscreen) would jump by a very visible amount the moment it
        // enters view.
        const translateY = Math.max(-16, Math.min(16, offset * -0.04));
        // The standalone `translate` property, not `transform` -- so a
        // review card's own :hover jiggle (which uses `rotate`/`scale`,
        // see styles.css) composes with this instead of getting silently
        // overridden by it. An inline style.transform would outrank any
        // stylesheet `transform` rule regardless of :hover; translate/
        // rotate/scale are three separate properties the browser combines
        // on its own, so there's nothing to outrank.
        el.style.translate = `0 ${translateY.toFixed(2)}px`;
      });
    };

    const requestParallax = () => {
      if (parallaxRaf === null) parallaxRaf = requestAnimationFrame(updateParallax);
    };

    if (scrollRoot) scrollRoot.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax);
    requestParallax();
  }

  // Click to unmute trailer video
  const trailerVideo = document.getElementById('trailer-video');
  if (trailerVideo) {
    trailerVideo.addEventListener('click', () => {
      trailerVideo.muted = !trailerVideo.muted;
    });
  }
});
