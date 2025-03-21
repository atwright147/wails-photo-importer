import { useMutation, useQuery } from '@tanstack/react-query';

import * as ConfigStore from '../../wailsjs/go/wailsconfigstore/ConfigStore';
import { CONFIG_STORE_FILENAME } from '../constants';

export interface Config {
	compressedLossless?: boolean;
	convertToDng?: boolean;
	createSubFoldersPattern?: string;
	customSubFolderName?: string;
	deleteOriginal?: boolean;
	embedOriginalRawFile?: boolean;
	imageConversionMethod?: string;
	jpegPreviewSize?: string;
	location?: string;
}

const QUERY_KEY = ['configStore', 'all'];

const getConfig = async (): Promise<Config> => {
	try {
		const configStore = await ConfigStore.Get(CONFIG_STORE_FILENAME, '{}');
		return JSON.parse(configStore);
	} catch (err) {
		console.error(err);
		return Promise.reject(err);
	}
};

export const useConfigStoreQuery = () => {
	return useQuery<Config, Error>({
		queryKey: QUERY_KEY,
		queryFn: getConfig,
		staleTime: 0,
		gcTime: 0,
	});
};

export const useConfigStoreMutation = () => {
	const { data: existingConfig } = useConfigStoreQuery();

	return useMutation({
		mutationFn: (config: Config) => {
			let newConfig = config;

			if (existingConfig) {
				newConfig = { ...existingConfig, ...config };
			}

			return ConfigStore.Set(
				CONFIG_STORE_FILENAME,
				JSON.stringify(newConfig, null, 2),
			);
		},
		onError: (err) => {
			console.error('Failed to save config:', err);
		},
	});
};
