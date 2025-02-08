import { type FC, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { usePhotosStore } from '../../stores/photos.store';
import type { ImageInfo } from '../../types/ImageInfo';

import { loadImage } from '../../utils/loadImage';
import styles from './Slide.module.scss';

interface Props {
	item: ImageInfo;
	alt: string;
	title: string;
}

export const Slide: FC<Props> = ({ item, alt, title }): JSX.Element => {
	const [image, setImage] = useState<string | undefined>(undefined);
	const { isSelected, setSelected, removeSelected } = usePhotosStore(
		useShallow((state) => ({
			isSelected: state.isSelected,
			setSelected: state.setSelected,
			removeSelected: state.removeSelected,
		})),
	);

	useEffect(() => {
		(async () => {
			const loadedImage = await loadImage(item.thumbnail_path);
			setImage(loadedImage);
			console.info(loadedImage);
		})();
	}, [item.thumbnail_path]);

	const handleChange = (
		event: React.ChangeEvent<HTMLInputElement>,
		item: ImageInfo,
	): void => {
		if (event.target.checked) {
			setSelected(item);
		} else {
			removeSelected(item.hash);
		}
	};

	return (
		<div className={styles.slideContainer}>
			<input
				type="checkbox"
				name="image"
				value={item.thumbnail_path}
				id={item.thumbnail_path}
				checked={isSelected(item.hash)}
				onChange={(event) => handleChange(event, item)}
			/>
			<label className={styles.slide} htmlFor={item.thumbnail_path}>
				<figure className={styles.figure}>
					<img src={image} alt={alt} />
					<figcaption className={styles.figcaption}>{title}</figcaption>
				</figure>
			</label>
		</div>
	);
};
