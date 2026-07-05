// frontend/api/index.js
export default async function handler(req, res) {
  // Read target URL safely from Vercel's private environment variables
  const backendUrl = process.env.VITE_BACKEND_URL; 

  if (!backendUrl) {
    return res.status(500).json({ error: "VITE_BACKEND_URL variable is missing in Vercel settings." });
  }

  // Extract the target endpoint (e.g., /api/auth/login -> /auth/login)
  const path = req.url.replace(/^\/api/, '');
  const cleanBackendUrl = backendUrl.replace(/\/$/, '');
  const targetUrl = `${cleanBackendUrl}${path}`;

  try {
    // Forward request options safely
    const fetchOptions = {
      method: req.method,
      headers: {
        ...req.headers,
        // Override host header to match target to prevent SSL mismatch rejections
        host: new URL(backendUrl).host, 
      },
    };

    // Forward request payload if it isn't a GET or HEAD request
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get("content-type");

    // Return data based on response content type
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

  } catch (error) {
    return res.status(500).json({ error: "Failed to forward request to backend", details: error.message });
  }
}
