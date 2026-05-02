// Critical polyfills for Vercel/Serverless environment
// These must be imported BEFORE anything that might require them (like pdf-parse)

const globals = [
  'DOMMatrix',
  'ImageData',
  'Path2D',
  'HTMLCanvasElement',
  'DOMPoint',
  'DOMRect',
  'CanvasRenderingContext2D',
  'CanvasGradient',
  'CanvasPattern'
];

globals.forEach(g => {
  if (typeof (globalThis as any)[g] === 'undefined') {
    const mock = class {
      constructor() {}
      getContext() { return {}; }
      setTransform() {}
      fill() {}
      stroke() {}
      beginPath() {}
      moveTo() {}
      lineTo() {}
      closePath() {}
      fillRect() {}
      strokeRect() {}
      clearRect() {}
    };
    (globalThis as any)[g] = mock;
    if (typeof global !== 'undefined') {
      (global as any)[g] = mock;
    }
  }
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

console.log('Polyfills and error handlers applied.');
