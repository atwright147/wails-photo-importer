import type { FC } from 'react';
import type { ImageInfo } from '../../types/ImageInfo';
import { getFilename } from '../../utils/getFilename';
import { Slide } from '../Slide/Slide';
import styles from './SlideList.module.scss';

interface Props {
	extractedThumbnails: ImageInfo[];
}

export const SlideList: FC<Props> = ({ extractedThumbnails }): JSX.Element => {
	return (
		<ul className={styles.slideList}>
			{extractedThumbnails.map((file) => (
				<li key={file.original_path} className={styles.listItem}>
					<Slide item={file} alt="" title={getFilename(file.original_path)} />
				</li>
			))}
		</ul>
	);
};
