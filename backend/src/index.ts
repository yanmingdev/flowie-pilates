import { startServer, registerShutdownHandlers } from './server.js';
// CLI 唯一入口：Node 啟動 Express，資料表建立仍由人工審查 SQL 執行。
const server = startServer();
registerShutdownHandlers(server);
