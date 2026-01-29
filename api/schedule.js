// api/schedule.js

const cache = new Map();

export default async function handler(req, res) {
  const { airport } = req.query;

  if (!airport) {
    return res.status(400).json({ error: "Missing airport code" });
  }

  const airportCode = airport.toUpperCase();
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `${airportCode}-${today}`;

  // ✅ One request per airport per day
  if (cache.has(cacheKey)) {
    return res.json({
      source: "cache",
      lastUpdated: cache.get(cacheKey).lastUpdated,
      data: cache.get(cacheKey).data
    });
  }

  const API_KEY = process.env.AVIATIONSTACK_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    // Fetch scheduled departures + arrivals
    const url = `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&dep_iata=${airportCode}&flight_status=scheduled`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.data) {
      return res.status(500).json({ error: "Invalid API response" });
    }

    // Bucket flights by hour
    const buckets = {};

    json.data.forEach(flight => {
      const time =
        flight.departure?.scheduled ||
        flight.arrival?.scheduled;

      if (!time) return;

      const hour = new Date(time).getHours();
      const hourKey = `${hour}:00`;

      if (!buckets[hourKey]) {
        buckets[hourKey] = 0;
      }

      buckets[hourKey]++;
    });

    const formatted = Object.keys(buckets)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(hour => ({
        hour,
        pph: buckets[hour]
      }));

    const result = {
      lastUpdated: new Date().toLocaleString(),
      data: formatted
    };

    cache.set(cacheKey, result);

    return res.json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

