export const APP_NAME = 'Photo Importer';
export const APP_IDENTIFIER = 'photo-importer';
export const CONFIG_STORE_FILENAME = 'config.json';

interface PickerOption {
	id: string;
	name: string;
}

export const subFolderOptions: readonly PickerOption[] = [
	// { id: 'none', name: 'None' },
	// { id: 'custom', name: 'Custom Name' },
	{ id: 'yyyymmdd', name: 'Shot Date (yyyymmdd)' }, // default?
	{ id: 'yymmdd', name: 'Shot Date (yymmdd)' },
	{ id: 'ddmmyy', name: 'Shot Date (ddmmyy)' },
	{ id: 'ddmm', name: 'Shot Date (ddmm)' },
	{ id: 'yyyyddmmm', name: 'Shot Date (yyyyddmmm)' },
	{ id: 'ddmmmyyyy', name: 'Shot Date (ddmmmyyyy)' },
] as const;

export const jpegPreviewSizes: readonly PickerOption[] = [
	{ id: 'none', name: 'None' },
	{ id: 'medium', name: 'Medium' }, // default
	{ id: 'fullSize', name: 'Full Size' },
] as const;
