import * as ConfigStore from '../../wailsjs/go/wailsconfigstore/ConfigStore';
import { CONFIG_STORE_FILENAME } from '../constants';
import type { Config } from '../hooks/useConfigStoreQuery';

export const updateConfig = async (config: Config): Promise<void> => {
	let newConfig = config;
	let existingConfig: Config = {};

	try {
		existingConfig = JSON.parse(await ConfigStore.Get(CONFIG_STORE_FILENAME, '{}'));
	} catch (err) {
		console.error(err);
	}

	if (existingConfig) {
		newConfig = { ...existingConfig, ...config };
	}

	try {
		await ConfigStore.Set(CONFIG_STORE_FILENAME, JSON.stringify(newConfig, null, 2));
	} catch (err) {
		console.error(err);
	}
};
