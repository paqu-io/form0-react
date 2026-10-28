import { parentPort, workerData } from 'node:worker_threads';

const arrayValues = Array.prototype.values;
globalThis.self = {
  postMessage: (data) => parentPort.postMessage(data),
  addEventListener: () => {},
};

await import(workerData.moduleUrl);
parentPort.on('message', (data) => {
  if (data.action === 'TEST_PROTOTYPES') {
    parentPort.postMessage({
      id: data.id,
      payload: {
        arrayValuesUnchanged: Array.prototype.values === arrayValues,
        arrayConstructorValuesAbsent: !Object.hasOwn(Array, 'values'),
        objectValuesAbsent: !Object.hasOwn(Object.prototype, 'values'),
      },
    });
    return;
  }
  globalThis.self.onmessage({ data });
});
