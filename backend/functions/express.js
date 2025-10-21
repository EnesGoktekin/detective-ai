// backend/functions/express.js (Netlify Handler)
import serverless from 'serverless-http';
import app from '../server.js'; // Import the Express app

// Netlify'ın beklediği handler'ı dışa aktar
export const handler = serverless(app);