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

  if (!container) return;

  container.innerHTML = "<p>Po ngarkohen oraret e namazit...</p>";
  if (heroRow) {
    heroRow.innerHTML = "<p>Po ngarkohen oraret...</p>";
  }

  try {
    const response = await fetch(
      "https://api.aladhan.com/v1/timingsByCity?city=Prishtina&country=Kosovo&method=13&school=1"
    );

    if (!response.ok) {
      throw new Error("Përgjigje jo e vlefshme nga serveri");
    }

    const data = await response.json();

    if (!data || data.code !== 200 || !data.data) {
      throw new Error("Nuk u morën të dhënat e pritshme");
    }

    const timings = data.data.timings;
    const dateReadable = data.data.date.readable;
    const hmDate = data.data.date.hijri;

    container.innerHTML = "";
    if (heroRow) {
      heroRow.innerHTML = "";
    }

    PRAYERS.forEach(({ key, label, icon }) => {
      const time = timings[key];
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

    if (dateEl) {
      const monthMapSq = {
        Jan: "janar",
        Feb: "shkurt",
        Mar: "mars",
        Apr: "prill",
        May: "maj",
        Jun: "qershor",
        Jul: "korrik",
        Aug: "gusht",
        Sep: "shtator",
        Oct: "tetor",
        Nov: "nëntor",
        Dec: "dhjetor",
      };

      const [day, engMonth, year] = dateReadable.split(" ");
      const monthSq = monthMapSq[engMonth] || engMonth;

      const hijriText = `${hmDate.day}.${hmDate.month.number}.${hmDate.year} hixhri`;

      dateEl.textContent = `${day} ${monthSq} ${year} · ${hijriText}`;
      if (heroDateEl) {
        heroDateEl.textContent = `${day} ${monthSq} ${year} · ${hijriText}`;
      }
    }
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p class="error">Nuk arritëm të marrim oraret e namazit. Ju lutem provoni përsëri më vonë.</p>';
    if (heroRow) {
      heroRow.innerHTML =
        '<p class="error">Orari i namazit nuk u ngarkua. Ju lutem provoni më vonë.</p>';
    }
    const statusEl = document.getElementById("heroPrayerStatus");
    if (statusEl) statusEl.textContent = "";
  }
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

function setCurrentYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchPrayerTimes();
  enableSmoothScrolling();
  setCurrentYear();
});

