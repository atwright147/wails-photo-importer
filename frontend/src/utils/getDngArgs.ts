import type { jpegPreviewSizes } from '../constants';

type JpegPreviewSizesType = (typeof jpegPreviewSizes)[number]['id'];

export interface DngSettings {
	jpegPreviewSize: JpegPreviewSizesType;
	compressedLossless: boolean;
	imageConversionMethod: string;
	embedOriginalRawFile: boolean;
}

export const getDngArgs = (settings: DngSettings): string => {
	const args: string[] = [];

	switch (settings.jpegPreviewSize) {
		case 'fullSize':
			args.push('-p2');
			break;

		case 'medium':
			args.push('-p1');
			break;

		// 'none'
		default:
			args.push('-p0');
			break;
	}

	if (settings.compressedLossless) {
		args.push('-c');
	} else {
		args.push('-u');
	}

	if (settings.imageConversionMethod === 'linear') {
		args.push('-l');
	}

	if (settings.embedOriginalRawFile) {
		args.push('-e');
	}

	return args.join(' ');
};
