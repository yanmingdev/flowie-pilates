import type { Express } from 'express';
import type { Server } from 'node:http';
import { createApp } from './app/create-app.js';
import { env } from './config/env.js';
export interface ServerOptions {
  app?: Express;
  port?: number;
  host?: string;
}
/** 啟動 Node HTTP server；不包含路由、資料查詢或建表，port=0 可供隔離測試配置臨時連接埠。 */
export function startServer(options: ServerOptions = {}): Server {
  const app = options.app ?? createApp();
  const port = options.port ?? env.PORT;
  const server = options.host ? app.listen(port, options.host) : app.listen(port);
  server.once(
    'listening',
    /** 監聽成功後只記錄實際連接埠，不記錄設定或憑證。 */ () => {
      const address = server.address();
      console.log(
        `Flowie Express API listening on ${typeof address === 'object' && address ? address.port : port}`,
      );
    },
  );
  server.once(
    'error',
    /** 啟動失敗時輸出安全的代碼，並讓 CLI 以非零狀態結束。 */ (error: NodeJS.ErrnoException) => {
      console.error(`Flowie Express API failed: ${error.code ?? 'SERVER_ERROR'}`);
      process.exitCode = 1;
    },
  );
  return server;
}
/** 在收到終止訊號時停止接收新連線；逾時才關閉剩餘連線。回傳解除函式供嵌入式使用或測試清理。 */
export function registerShutdownHandlers(server: Server, timeoutMs = 10000): () => void {
  let stopping = false;
  /** 同一個 server 僅開始一次關閉流程；保留既有請求完成時間並清理 timer。 */
  function stop() {
    if (stopping) return;
    stopping = true;
    const timer = setTimeout(
      /** 關閉逾時後終止剩餘連線，讓 Node 不被長連線卡住。 */ () => {
        server.closeAllConnections();
        process.exitCode = 1;
      },
      timeoutMs,
    );
    timer.unref();
    server.close(
      /** server 關閉後移除 timer 與程序訊號監聽器。 */ (error) => {
        clearTimeout(timer);
        cleanup();
        if (error) process.exitCode = 1;
      },
    );
    server.closeIdleConnections();
  }
  /** 移除本次註冊的訊號監聽器，不干預程序其他模組。 */
  function cleanup() {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return cleanup;
}
