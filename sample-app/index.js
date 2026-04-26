const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
    <html>
      <head>
        <title>Sample App</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: #f7f7f7;
          }

          .box {
            display: flex;
            justify-content: center;
            background: #fff;
            padding: 20px;
            border: 1px solid #ddd;
            max-width: 500px;
          }

          h1 {
            margin-top: 0;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>The Sample-App Is Running</h1>
          <p>This app was deployed successfully.</p>

          <hr />

          <p><b>Port:</b> ${port}</p>
          <p><b>Time:</b> ${new Date().toLocaleString("en-NG", {
            timeZone: "Africa/Lagos"
        })}</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, () => {
    console.log('App running on port ' + port);
});