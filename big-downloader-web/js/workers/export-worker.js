/**
 * BIG Downloader Web — Background Export Web Worker
 */

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'PING') {
    self.postMessage({ type: 'PONG' });
    return;
  }

  if (type === 'PROCESS_EXPORT') {
    const { format, geojson, metadata } = payload;
    try {
      self.postMessage({ type: 'PROGRESS', status: `Memproses format ${format}...` });
      
      // Notify completion
      self.postMessage({
        type: 'COMPLETE',
        format,
        success: true
      });
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        format,
        error: err.message
      });
    }
  }
};

