// import type { Store } from 'tauri-plugin-store-api';

import { updateConfig } from './updateConfig';

export type Value = string | number | boolean;

export const handleFieldChangeSave = async (
	value: Value,
	name: string,
	onChangeFn: (value: Value) => void,
	// store: any,
): Promise<void> => {
	onChangeFn(value);

	try {
		// await store.set(name, value);
		// await store.save();
		console.info(name, value);
		updateConfig({ [name]: value });
	} catch (err) {
		console.info(err);
	}
};
