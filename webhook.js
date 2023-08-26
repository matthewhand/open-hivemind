const express = require('express');

const startWebhookServer = (port) => {
	const app = express();
	app.use(express.json());

	app.post('/webhook', (req, res) => {
		// Handle incoming webhook
		console.log('Received webhook:', req.body);
		res.sendStatus(200);
	});

	app.get('/health', (req, res) => {
		// Handle incoming webhook
		console.log('Received health:', req.body);
		res.sendStatus(200);
	});

	app.listen(port, () => {
		console.log(`HTTP server listening at http://localhost:${port}`);
	});
};

module.exports = {
	startWebhookServer,
};
