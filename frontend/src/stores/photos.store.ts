import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { ImageInfo } from '../types/ImageInfo';

const STORE_NAME = 'PhotosStore';

export interface State {
	selected: ImageInfo[];
	extractedThumbnails: ImageInfo[];

	isSelected: (id: string) => boolean;
	setSelected: (items: ImageInfo | ImageInfo[]) => void;
	removeSelected: (ids: string | string[]) => void;
	setSelectedAll: () => void;
	setSelectNone: () => void;
	invert: () => void;
	setExtractedThumbnails: (thumbnails: ImageInfo[]) => void;
}

export const usePhotosStore = create<State>()(
	devtools((set, get) => ({
		selected: [],
		extractedThumbnails: [],

		isSelected: (id) => get().selected.some((item) => item.hash === id),
		setSelected: (items) => {
			if (Array.isArray(items)) {
				set(
					{ selected: [...get().selected, ...items] },
					false,
					`${STORE_NAME}/setSelected`,
				);
				return;
			}
			set(
				{ selected: [...get().selected, items] },
				false,
				`${STORE_NAME}/setSelected`,
			);
		},
		removeSelected: (ids) => {
			if (Array.isArray(ids)) {
				set(
					{
						selected: get().selected.filter((item) => !ids.includes(item.hash)),
					},
					false,
					`${STORE_NAME}/removeSelected`,
				);
				return;
			}
			set(
				{ selected: get().selected.filter((item) => item.hash !== ids) },
				false,
				`${STORE_NAME}/removeSelected`,
			);
		},
		setSelectedAll: () => {
			set(
				{ selected: get().extractedThumbnails },
				false,
				`${STORE_NAME}/setSelectedAll`,
			);
		},
		setSelectNone: () =>
			set({ selected: [] }, false, `${STORE_NAME}/setSelectNone`),
		invert: () => {
			const { extractedThumbnails, selected } = get();
			const selectedIds = selected.map((item) => item.hash);
			const newSelected = extractedThumbnails.filter(
				(item) => !selectedIds.includes(item.hash),
			);
			set({ selected: newSelected }, false, `${STORE_NAME}/invert`);
		},
		setExtractedThumbnails: (thumbnails) =>
			set(
				{ extractedThumbnails: thumbnails },
				false,
				`${STORE_NAME}/setExtractedThumbnails`,
			),
	})),
);
