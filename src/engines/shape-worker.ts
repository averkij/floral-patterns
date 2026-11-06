import { generateShapePattern, type ShapePatternOptions } from './shape';
self.onmessage = (event: MessageEvent<ShapePatternOptions>) => {
  try {
    self.postMessage({ result: generateShapePattern(event.data) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'The shape could not grow.',
    });
  }
};
