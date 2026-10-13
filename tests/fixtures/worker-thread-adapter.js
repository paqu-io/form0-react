import { parentPort, workerData } from 'node:worker_threads';

globalThis.self = {
  postMessage: (data) => parentPort.postMessage(data),
  addEventListener: () => {},
};

await import(workerData.moduleUrl);
parentPort.on('message', (data) => globalThis.self.onmessage({ data }));
