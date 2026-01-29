let trafficChart = null;

// ========================
// SEARCH HANDLER
// ========================
async function searchAirport() {
  const input = document.getElementById("airportInput");
  const airport = input.value.trim().toUpperCase();
  input.value = airport; // force uppercase visually

  if (!airport) {
    alert("Enter an airport code (e.g. KLAX)");
    return;
  }

  try {
    const res = await fetch(`/api/schedule?airport=${airport}`);
    const json = await res.json();

    if (json.error) {
      alert(json.error);
      return;
    }

    document.getElementById("lastUpdated").innerText =
      `Last updated: ${json.lastUpdated} (${json.source || "api"})`;

    renderChart(json.data);

  } catch (err) {
    console.error(err);
    alert("Failed to load airport data");
  }
}

// ========================
// CHART RENDER
// ========================
function renderChart(data) {
  const ctx = document.getElementById("trafficChart").getContext("2d");

  const labels = data.map(d => d.hour);
  const values = data.map(d => d.pph);

  if (trafficChart) {
    trafficChart.data.labels = labels;
    trafficChart.data.datasets[0].data = values;
    trafficChart.update();
    return;
  }

  trafficChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Projected Flights Per Hour",
          data: values,
          borderColor: "#4ade80",
          backgroundColor: "rgba(74, 222, 128, 0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Flights per Hour"
          }
        },
        x: {
          title: {
            display: true,
            text: "Hour of Day (Local)"
          }
        }
      }
    }
  });
}

// ========================
// BUTTON BINDING
// ========================
document
  .getElementById("searchBtn")
  .addEventListener("click", searchAirport);
