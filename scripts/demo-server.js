const express = require('express');
const configRouter = require('../dist/src/webui/routes/config').default;
const dashboardRouter = require('../dist/src/webui/routes/dashboard').default;
const openapiRouter = require('../dist/src/webui/routes/openapi').default;

const app = express();
app.use(express.json());
app.use('/webui', configRouter);
app.use('/dashboard', dashboardRouter);
app.use('/webui', openapiRouter);

const port = process.env.PORT || 4106;
app.listen(port, () => {
  console.log(`demo-server-ready:${port}`);
});
