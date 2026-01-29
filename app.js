// ========================
// CONFIG
// ========================
const AVIATIONSTACK_KEY = "YOUR_AVIATIONSTACK_KEY"; // DO NOT PUBLISH THIS
const DAYS_AHEAD = 7;

let chart = null;

// Cache format:
// cache[airportIATA][date] = { flights, fetchedAt }
const scheduleCache = {};

// ========================
// ICAO → IATA CONVERSION
// ========================
function toIATACode(code) {
  // Simple US ICAO handling: KLAX → LAX, KTPA → TPA
  if (code.length === 4 && code.startsWith("K")) {
    return code.slice(1);
  }
  return code;
}

// ========================
// INIT DAY SELECTOR
// ========================
(function initDaySelector() {
  const select = document.getElementById("daySelect");
  select.innerHTML = "";

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    const label = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    const value = d.toISOString().split("T")[0];

    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  }
})();

// ========================
// LOAD SCHEDULE (CACHED)
// ========================
async function loadSchedule() {
  const rawCode = document
    .getElementById("airportInput")
    .value.trim()
    .toUpperCase();

  if (!rawCode) {
    alert("Enter an airport code");
    return;
  }

  const airportIATA = toIATACode(rawCode);
  const date = document.getElementById("daySelect").value;

  document.getElementById("airportInfo").innerText =
    `${rawCode} (${airportIATA}) — Scheduled traffic for ${date}`;

  // Initialize cache bucket
  if (!scheduleCache[airportIATA]) {
    scheduleCache[airportIATA] = {};
  }

  // Use cache if available (1 request per airport per day)
  if (scheduleCache[airportIATA][date]) {
    const cached = scheduleCache[airportIATA][date];
    renderSchedule(cached.flights, cached.fetchedAt);
    return;
  }

  // Fetch once
  const flights = await fetchScheduledFlights(airportIATA, date);
  const fetchedAt = new Date();

  scheduleCache[airportIATA][date] = { flights, fetchedAt };
  renderSchedule(flights, fetchedAt);
}

// ========================
// AVIATIONSTACK REQUEST
// ========================
async function fetchScheduledFlights(airportIATA, date) {
  const url =
    `https://api.aviationstack.com/v1/flights` +
    `?access_key=${AVIATIONSTACK_KEY}` +
    `&airport_iata=${airportIATA}` +
    `&flight_date=${date}` +
    `&limit=1000`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.data) return [];

    // Normalize scheduled times
    return data.data
      .map(f => f.departure?.scheduled || f.arrival?.scheduled)
      .filter(Boolean);

  } catch (err) {
    console.error("Aviationstack error:", err);
    return [];
  }
}

// ========================
// BUCKET → HOURLY PPH
// ========================
function renderSchedule(times, fetchedAt) {
  const buckets = {};
  for (let h = 0; h < 24; h++) buckets[h] = 0;

  times.forEach(t => {
    const d = new Date(t);
    if (isNaN(d)) return;
    buckets[d.getHours()]++;
  });

  updateChart(buckets);
  updateLastUpdated(fetchedAt);
}

// ========================
// LAST UPDATED TEXT
// ========================
function updateLastUpdated(date) {
  document.getElementById("lastUpdated").innerText =
    `Last updated: ${date.toLocaleString()}`;
}

// ========================
// CHART
// ========================
function updateChart(hourly) {
  const labels = Object.keys(hourly).map(
    h => `${h.toString().padStart(2, "0")}:00`
  );
  const data = Object.values(hourly);

  const ctx = document.getElementById("trafficChart").getContext("2d");

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
    return;
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Projected PPH (Scheduled)",
          data,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.15)",
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" }
      },
      scales: {
        x: {
          title: { display: true, text: "Hour (Local Time)" }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Flights per Hour" }
        }
      }
    }
  });
}
