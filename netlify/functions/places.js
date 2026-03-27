/**
 * Netlify serverless proxy for Google Places API.
 * Avoids CORS issues when calling Places from the browser.
 * The API key stays server-side and never appears in the client bundle.
 *
 * Usage: /.netlify/functions/places?endpoint=autocomplete&input=SUMO&language=es
 */

const VALID_ENDPOINTS = {
  autocomplete: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  details:      'https://maps.googleapis.com/maps/api/place/details/json',
  textsearch:   'https://maps.googleapis.com/maps/api/place/textsearch/json',
};

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const params  = event.queryStringParameters || {};
  const { endpoint, ...rest } = params;

  if (!VALID_ENDPOINTS[endpoint]) {
    return {
      statusCode: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid endpoint', valid: Object.keys(VALID_ENDPOINTS) }),
    };
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY not set on server' }),
    };
  }

  const qs  = new URLSearchParams({ ...rest, key: apiKey }).toString();
  const url = `${VALID_ENDPOINTS[endpoint]}?${qs}`;

  try {
    const response = await fetch(url);
    const data     = await response.json();
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Upstream Google Places request failed', detail: err.message }),
    };
  }
};
