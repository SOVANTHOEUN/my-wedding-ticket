/**
 * Wedding E-Ticket - Main JavaScript
 * Handles scroll animations, countdown, effects, and RSVP.
 */

(function () {
  'use strict';

  // Intersection Observer for scroll-triggered animations
  var obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    },
    { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
  );
  document
    .querySelectorAll('.fade-section,.fade-left,.fade-right,.fade-scale,.stagger-children')
    .forEach(function (el) {
      obs.observe(el);
    });

  // Countdown to wedding date (25 March 2026, 5 PM Cambodia time)
  var weddingDate = new Date('2026-03-25T17:00:00+07:00');
  function updateCountdown() {
    var diff = weddingDate - new Date();
    if (diff <= 0) return;
    var days = document.getElementById('cd-days');
    var hours = document.getElementById('cd-hours');
    var mins = document.getElementById('cd-mins');
    var secs = document.getElementById('cd-secs');
    if (days) days.textContent = Math.floor(diff / 864e5);
    if (hours) hours.textContent = Math.floor((diff % 864e5) / 36e5);
    if (mins) mins.textContent = Math.floor((diff % 36e5) / 6e4);
    if (secs) secs.textContent = Math.floor((diff % 6e4) / 1e3);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Shimmer dots and sparkles
  var shimmerLayer = document.getElementById('shimmerLayer');
  if (shimmerLayer) {
    var colors = ['#87CEEB', '#ADD8E6', '#C0C0C0', '#D3D3D3', '#B8E2F4'];
    for (var i = 0; i < 35; i++) {
      var dot = document.createElement('div');
      dot.className = 'shimmer-dot';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.top = Math.random() * 100 + '%';
      dot.style.animationDelay = Math.random() * 5 + 's';
      dot.style.animationDuration = 3 + Math.random() * 4 + 's';
      var sz = 2 + Math.random() * 4;
      dot.style.width = sz + 'px';
      dot.style.height = sz + 'px';
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      shimmerLayer.appendChild(dot);
    }
    for (var j = 0; j < 20; j++) {
      var sparkle = document.createElement('div');
      sparkle.className = 'silver-sparkle';
      sparkle.textContent = '✦';
      sparkle.style.left = Math.random() * 100 + '%';
      sparkle.style.top = Math.random() * 100 + '%';
      sparkle.style.animationDelay = Math.random() * 5 + 's';
      sparkle.style.animationDuration = 3 + Math.random() * 3 + 's';
      sparkle.style.fontSize = 8 + Math.random() * 8 + 'px';
      sparkle.style.color = Math.random() > 0.5 ? '#C0C0C0' : '#87CEEB';
      shimmerLayer.appendChild(sparkle);
    }
  }

  // Soft falling petals
  var petalLayer = document.getElementById('petalLayer');
  if (petalLayer) {
    var petalColors = [
      'radial-gradient(ellipse at 40% 30%, #B8E2F4 0%, #87CEEB 100%)',
      'radial-gradient(ellipse at 40% 30%, #D6EFF9 0%, #ADD8E6 100%)',
      'radial-gradient(ellipse at 40% 30%, #E8E8E8 0%, #C0C0C0 100%)',
      'radial-gradient(ellipse at 40% 30%, #D3D3D3 0%, #B8E2F4 100%)',
    ];
    for (var k = 0; k < 12; k++) {
      var petal = document.createElement('div');
      petal.className = 'soft-petal';
      petal.style.left = Math.random() * 100 + '%';
      petal.style.animationDelay = Math.random() * 14 + 's';
      petal.style.animationDuration = 10 + Math.random() * 8 + 's';
      var size = 10 + Math.random() * 14;
      petal.style.width = size + 'px';
      petal.style.height = size * 1.2 + 'px';
      petal.style.background = petalColors[Math.floor(Math.random() * petalColors.length)];
      petalLayer.appendChild(petal);
    }
  }

  // Scroll-to-top button visibility
  var scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    scrollTopBtn.setAttribute('aria-label', 'Scroll to top');
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', function () {
      scrollTopBtn.classList.toggle('show', window.scrollY > 400);
    });
  }

  // RSVP button
  var rsvpBtn = document.getElementById('rsvpBtn');
  if (rsvpBtn) {
    rsvpBtn.addEventListener('click', function () {
      this.innerHTML = '✅ បានបញ្ជាក់រួចហើយ!';
      this.classList.add('confirmed');
    });
  }
})();
