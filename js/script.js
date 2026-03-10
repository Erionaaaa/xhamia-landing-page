const PRAYERS = [
  { key: "Fajr", label: "Sabahu", icon: "🌙" },
  { key: "Dhuhr", label: "Dreka", icon: "☀️" },
  { key: "Asr", label: "Ikindia", icon: "🌤️" },
  { key: "Maghrib", label: "Akshami", icon: "🌇" },
  { key: "Isha", label: "Jacia", icon: "🌙" },
];

function parseTimeToday(hhmm, dayOffset = 0) {
  if (!hhmm) return null;
  const match = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, h, m] = match;
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(Number(h), Number(m), 0, 0);
  if (dayOffset) d.setDate(d.getDate() + dayOffset);
  return d;
}

function formatHMS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function computeCurrentAndNext(timings) {
  const now = new Date();

  const todayStarts = PRAYERS.map((p) => ({
    prayer: p,
    start: parseTimeToday(timings?.[p.key], 0),
  })).filter((x) => x.start);

  if (!todayStarts.length) return null;

  const ishaToday = todayStarts.find((x) => x.prayer.key === "Isha");
  const ishaYesterday = ishaToday
    ? { prayer: ishaToday.prayer, start: parseTimeToday(timings?.Isha, -1) }
    : null;

  const candidates = [...todayStarts];
  if (ishaYesterday?.start) candidates.push(ishaYesterday);

  candidates.sort((a, b) => a.start.getTime() - b.start.getTime());

  // current = latest start <= now
  let current = candidates[0];
  for (const c of candidates) {
    if (c.start.getTime() <= now.getTime()) current = c;
    else break;
  }

  // next = first start > now, else tomorrow Fajr
  let next = candidates.find((c) => c.start.getTime() > now.getTime());
  if (!next) {
    const fajr = PRAYERS.find((p) => p.key === "Fajr");
    const fajrTime = parseTimeToday(timings?.Fajr, 1);
    if (fajr && fajrTime) next = { prayer: fajr, start: fajrTime };
  }

  return next ? { current, next } : null;
}

let heroTicker = null;

function startHeroCountdown(timings) {
  const statusEl = document.getElementById("heroPrayerStatus");
  if (!statusEl) return;

  if (heroTicker) {
    clearInterval(heroTicker);
    heroTicker = null;
  }

  const tick = () => {
    const info = computeCurrentAndNext(timings);
    if (!info) {
      statusEl.textContent = "";
      return;
    }

    const now = new Date();
    const currentLabel = info.current.prayer.label;
    const nextLabel = info.next.prayer.label;
    const msToNext = info.next.start.getTime() - now.getTime();

    // If we're within first minute of current prayer start, say it "just entered"
    const justEntered = now.getTime() - info.current.start.getTime() < 60_000;

    if (justEntered) {
      statusEl.textContent = `${currentLabel} ka hyre · ${nextLabel} edhe ${formatHMS(msToNext)}`;
    } else {
      statusEl.textContent = `${nextLabel} edhe ${formatHMS(msToNext)}`;
    }
  };

  tick();
  heroTicker = setInterval(tick, 1000);
}

async function fetchPrayerTimes() {
  const container = document.getElementById("prayerTimes");
  const dateEl = document.getElementById("prayerDate");
  const heroRow = document.getElementById("heroPrayerRow");
  const heroDateEl = document.getElementById("heroPrayerDate");

  // Orari manual për Kosovë (Prishtinë), sipas takvimit
  const timings = {
    Fajr: "04:18", // Sabahu
    Sunrise: "05:51",
    Dhuhr: "11:50", // Dreka
    Asr: "15:06", // Ikindia
    Maghrib: "17:44", // Akshami
    Isha: "19:15", // Jacia
  };

  if (container) container.innerHTML = "";
  if (heroRow) {
    heroRow.innerHTML = "";
    // Animate hero board when times load
    const board = document.querySelector(".hero-prayer-board");
    if (board) {
      // trigger reflow then add visible class via CSS utility
      requestAnimationFrame(() => {
        board.classList.add("reveal-visible");
      });
    }
  }

  PRAYERS.forEach(({ key, label, icon }) => {
    const time = timings[key];
    if (container) {
      const card = document.createElement("article");
      card.className = "prayer-card";

      const labelEl = document.createElement("div");
      labelEl.className = "prayer-label";
      labelEl.textContent = "Koha";

      const nameEl = document.createElement("h3");
      nameEl.className = "prayer-name";
      nameEl.textContent = label;

      const timeEl = document.createElement("div");
      timeEl.className = "prayer-time";
      timeEl.textContent = time || "--:--";

      card.appendChild(nameEl);
      card.appendChild(timeEl);
      card.appendChild(labelEl);

      container.appendChild(card);
    }

    if (heroRow) {
      const heroItem = document.createElement("div");
      heroItem.className = "hero-prayer-item";

      const heroIcon = document.createElement("span");
      heroIcon.className = "hero-prayer-icon";
      heroIcon.textContent = icon || "";

      const heroName = document.createElement("span");
      heroName.className = "hero-prayer-name";
      heroName.textContent = label;

      const heroTime = document.createElement("span");
      heroTime.className = "hero-prayer-time";
      heroTime.textContent = time || "--:--";

      heroItem.appendChild(heroIcon);
      heroItem.appendChild(heroName);
      heroItem.appendChild(heroTime);
      heroRow.appendChild(heroItem);
    }
  });

  startHeroCountdown(timings);

  const monthMapSq = [
    "janar",
    "shkurt",
    "mars",
    "prill",
    "maj",
    "qershor",
    "korrik",
    "gusht",
    "shtator",
    "tetor",
    "nëntor",
    "dhjetor",
  ];

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const monthSq = monthMapSq[now.getMonth()];
  const year = now.getFullYear();
  const dateText = `${day} ${monthSq} ${year}`;

  if (dateEl) dateEl.textContent = dateText;
  if (heroDateEl) heroDateEl.textContent = dateText;
}

function enableSmoothScrolling() {
  const heroButton = document.getElementById("scrollToPrayers");
  const prayersSection = document.getElementById("orari");

  if (heroButton && prayersSection) {
    heroButton.addEventListener("click", () => {
      prayersSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href")?.substring(1);
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

function setupMobileNav() {
  const header = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelectorAll(".nav-links a");

  if (!header || !toggle) return;

  const closeMenu = () => {
    header.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });
}

function setCurrentYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchPrayerTimes();
  enableSmoothScrolling();
  setupMobileNav();
  setCurrentYear();

  // Simple scroll reveal for lecture & ayah cards
  const revealEls = document.querySelectorAll(".lecture-card, .ayah-card");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
    }
  );

  revealEls.forEach((el) => observer.observe(el));
});

