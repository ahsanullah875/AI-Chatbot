// Simple backend proxy to secure API key
// Install: npm install express cors body-parser dotenv
// Run: node server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));

// Proxy endpoint for API calls
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, imageData } = req.body;
    
    const response = await fetch('https://openai.api.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages, imageData })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API Proxy running on http://localhost:${PORT}`);
  console.log('API Key loaded from .env file');
});
