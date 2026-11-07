/** Keep engine diagnostics stable while presenting actionable Russian UI messages. */
const errors: Record<string, string> = {
  'Type a letter or a short word to fill.': 'Введите букву или короткое слово.',
  'Enter a letter or a short word to grow the pattern.': 'Введите букву или короткое слово.',
  'The selected region is too thin. Try a larger shape or a bolder font.': 'Область слишком узкая. Увеличьте фигуру или выберите более широкий шрифт.',
  'This region is too small to fill. Draw a larger shape.': 'Область слишком мала. Нарисуйте фигуру побольше.',
  'Draw a closed region with at least three points.': 'Нарисуйте замкнутый контур как минимум из трёх точек.',
  'Select a region before generating a pattern.': 'Сначала выберите область для узора.',
  'The selected region has no usable cells. Try a larger shape.': 'В области недостаточно места. Увеличьте фигуру.',
  'This region took too long. Try a lower density.': 'Создание узора заняло слишком много времени. Уменьшите плотность.',
  'The garden took too long to grow. Try a lower density or another seed.': 'Создание сада заняло слишком много времени. Уменьшите плотность или смените вариант.',
  'Your browser could not create a drawing canvas.': 'Браузеру не удалось открыть холст для рисования.',
  'The floral worker could not start.': 'Не удалось запустить генератор. Обновите страницу и попробуйте ещё раз.',
  'The shape worker could not start.': 'Не удалось запустить генератор. Обновите страницу и попробуйте ещё раз.',
  'The floral worker returned an unreadable result.': 'Не удалось прочитать узор. Попробуйте создать его ещё раз.',
  'The shape result could not be read. Try another seed.': 'Не удалось прочитать узор. Выберите другой вариант.',
};

export function generationError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (errors[message]) return errors[message];
  if (/Could not load|Failed to fetch|NetworkError|fetch/i.test(message))
    return 'Не удалось загрузить генератор. Проверьте подключение и обновите страницу.';
  return 'Не удалось создать узор. Попробуйте другой вариант или уменьшите плотность.';
}
