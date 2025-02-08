import { GetImageFromFolder } from '../../wailsjs/go/main/App';

export const loadImage = async (path: string): Promise<string> => {
	try {
		return await GetImageFromFolder(path);
	} catch (error) {
		throw new Error(`Failed to load image: ${error}`);
	}
};
