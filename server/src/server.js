require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets/socketHandler');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server, process.env.CLIENT_URL || 'http://localhost:5173');

// Connect to Database & Start Server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 CRAVE Server running on port ${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`📡 Socket.IO initialized for real-time events`);
    console.log(`=================================================`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
