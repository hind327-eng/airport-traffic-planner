export default async function handler(req, res) {
  try {
    const { airport, date } = req.query;

    if (!airport || !date) {
      return res.status(400).json({
        error: "Missing airport or date parameter"
      });
    }

    const API_KEY = process.env.AVIATIONSTACK_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        error: "AVIATIONSTACK_KEY is not defined in environment"
      });
    }

    const url =
      `http://api.aviationstack.com/v1/flights` +
      `?access_key=${API_KEY}` +
      `&dep_iata=${airport}` +
      `&flight_date=${date}` +
      `&limit=100`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: "Aviationstack request failed",
        details: text
      });
    }

    const data = await response.json();

    return res.status(200).json({
      airport,
      date,
      count: Array.isArray(data.data) ? data.data.length : 0,
      data: data.data || []
    });

  } catch (err) {
    return res.status(500).json({
      error: "Serverless function crashed",
      message: err.message
    });
  }
}
