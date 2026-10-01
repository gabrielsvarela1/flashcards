// Limites partilhados entre o browser e o servidor.

export const MAX_CARDS_PER_SAVE = 500;

export const GENERATE_COUNTS = [10, 20, 30];

export const MIN_TEXT_CHARS = 200;
export const MAX_TEXT_CHARS = 30_000;

export const MAX_IMAGES = 4;
// As fotos são reduzidas no browser antes do envio (ver generate-flow).
export const MAX_IMAGE_BYTES = 900 * 1024;
export const IMAGE_MAX_SIDE = 1600;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_ANSWER_CHARS = 1000;
