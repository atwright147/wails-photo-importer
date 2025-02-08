export const getFilename = (path: string): string => path?.split('/').pop() ?? '';
