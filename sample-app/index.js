const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Sample App on Mini PaaS</title>
        <style>
          * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          body { margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; }
          h1 { margin: 0 0 20px 0; color: #333; }
          p { color: #666; line-height: 1.6; margin: 10px 0; }
          .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Sample App</h1>
          <p>This is a sample application successfully deployed on Mini PaaS!</p>
          <div class="info">
            <p><strong>Port:</strong> ${port}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Node Version:</strong> ${process.version}</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Sample app listening on port ${port}`);
});