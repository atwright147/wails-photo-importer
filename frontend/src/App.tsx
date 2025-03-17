import {
	Button,
	Flex,
	Grid,
	Provider,
	Text,
	View,
	defaultTheme,
} from '@adobe/react-spectrum';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';

import {
	CopyOrConvert,
	ExtractThumbnail,
	ListFiles,
	PictureDir,
} from '../wailsjs/go/main/App';
import type { main } from '../wailsjs/go/models';
import { EventsOff, EventsOn } from '../wailsjs/runtime';
import { OptionsForm } from './components/OptionsForm/OptionsForm';
import { SlideList } from './components/SlideList/SlideList';
import { jpegPreviewSizes, subFolderOptions } from './constants';
import { useConfigStoreQuery } from './hooks/useConfigStoreQuery';
import { useGetEnvQuery } from './hooks/useGetEnvQuery';
import { usePhotosStore } from './stores/photos.store';
import type { FileInfo } from './types/File';

import './App.css';

interface FormValues {
	// options form
	sourceDisk: string;
	location: string;
	createSubFoldersPattern: string;
	convertToDng: boolean;
	deleteOriginal: boolean;

	// dng settings form
	jpegPreviewSize: string;
	compressedLossless: boolean;
	imageConversionMethod: string;
	embedOriginalRawFile: boolean;
}

function App() {
	const [files, setFiles] = useState<main.FileInfo[]>([]);
	const {
		extractedThumbnails,
		selected,
		setExtractedThumbnails,
		setSelectedAll,
		setSelectNone,
		invert,
	} = usePhotosStore(
		useShallow((state) => ({
			selected: state.selected,
			setSelectedAll: state.setSelectedAll,
			setSelectNone: state.setSelectNone,
			invert: state.invert,
			extractedThumbnails: state.extractedThumbnails,
			setExtractedThumbnails: state.setExtractedThumbnails,
		})),
	);

	const { data: config } = useConfigStoreQuery();
	const { data: env } = useGetEnvQuery();

	const methods = useForm<FormValues>({
		defaultValues: {
			sourceDisk: '',
			location: config?.location ?? '',
			createSubFoldersPattern:
				config?.createSubFoldersPattern ?? subFolderOptions[2].id,
			convertToDng: config?.convertToDng ?? false,
			deleteOriginal: config?.deleteOriginal ?? false,

			jpegPreviewSize: config?.jpegPreviewSize ?? jpegPreviewSizes[2].id,
			compressedLossless: config?.compressedLossless ?? true,
			imageConversionMethod: config?.imageConversionMethod ?? 'preserve',
			embedOriginalRawFile: config?.embedOriginalRawFile ?? false,
		},
	});

	useEffect(() => {
		// Register the event listener
		const unsubscribeSelectAll = EventsOn('select-all', () => setSelectedAll());
		const unsubscribeSelectNone = EventsOn('deselect-all', () =>
			setSelectNone(),
		);
		const unsubscribeInvert = EventsOn('invert', () => invert());
		const unsubscribeImportSelected = EventsOn('import-selected', () => {
			copyOrConvertFile(selected.map((file) => file.original_path));
		});

		// Cleanup the event listener on component unmount
		return () => {
			unsubscribeSelectAll();
			unsubscribeSelectNone();
			unsubscribeInvert();
			unsubscribeImportSelected();
			EventsOff('select-all');
			EventsOff('deselect-all');
			EventsOff('invert');
			EventsOff('import-selected');
		};
	}, [invert, selected, setSelectedAll, setSelectNone]);

	useEffect(() => {
		(async () => {
			const pictureDir = await PictureDir();

			const values = {
				sourceDisk: '',
				location: config?.location ?? pictureDir,
				createSubFoldersPattern:
					config?.createSubFoldersPattern ?? subFolderOptions[2].id,
				convertToDng: config?.convertToDng ?? false,
				deleteOriginal: config?.deleteOriginal ?? false,

				jpegPreviewSize: config?.jpegPreviewSize ?? jpegPreviewSizes[2].id,
				compressedLossless: config?.compressedLossless ?? true,
				imageConversionMethod: config?.imageConversionMethod ?? 'preserve',
				embedOriginalRawFile: config?.embedOriginalRawFile ?? false,
			};

			methods.reset(values);
		})();
	}, [
		config?.location,
		config?.createSubFoldersPattern,
		config?.convertToDng,
		config?.deleteOriginal,
		config?.jpegPreviewSize,
		config?.compressedLossless,
		config?.imageConversionMethod,
		config?.embedOriginalRawFile,
		methods.reset,
	]);

	const formValues = useWatch(methods);

	useEffect(() => {
		(async () => {
			const promises: Promise<main.ThumbnailResponse>[] = [];
			for (const file of files) {
				promises.push(ExtractThumbnail(file.path));
			}
			const results = await Promise.allSettled(promises);
			console.info('Extracted thumbnails:', results);

			setExtractedThumbnails(
				results.map((result) =>
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					result.status === 'fulfilled' ? result.value : ('' as any),
				),
			);
		})();
	}, [files, setExtractedThumbnails]);

	useEffect(() => {
		if (!formValues.sourceDisk) return;

		(async () => {
			try {
				const result: FileInfo[] = await ListFiles(formValues.sourceDisk ?? '');
				console.info('Listed files:', result);
				// @ts-expect-error
				setFiles(result);
			} catch (error) {
				console.error('Error listing files:', error);
			}
		})();
	}, [formValues.sourceDisk]);

	const handleClose = async (): Promise<void> => {
		try {
			await process.exit(0);
		} catch (err) {
			console.info(err);
		}
	};

	const copyOrConvertFile = async (files: string[]): Promise<void> => {
		console.info('copyOrConvertFile', files);
		try {
			await CopyOrConvert(files);
			console.log('Operation successful');
		} catch (error) {
			console.error('Operation failed', error);
		}
	};

	return (
		<Provider theme={defaultTheme} minHeight="100vh">
			<Grid
				UNSAFE_style={{ padding: '16px', boxSizing: 'border-box' }}
				areas={['content sidebar', 'footer  footer']}
				columns={['1fr', '310px']}
				rows={['auto', 'min-content']}
				minHeight="100vh"
				gap="size-300"
			>
				<View gridArea="content">
					<SlideList extractedThumbnails={extractedThumbnails} />
				</View>
				<View gridArea="sidebar" elementType="aside" padding="5px">
					<FormProvider {...methods}>
						<OptionsForm />
					</FormProvider>

					{env?.buildType === 'dev' && (
						<details>
							<summary>Debug Info</summary>

							<pre style={{ whiteSpace: 'pre-wrap' }}>
								{JSON.stringify(env, null, 2)}
							</pre>
							<pre style={{ whiteSpace: 'pre-wrap' }}>
								{JSON.stringify(formValues, null, 2)}
							</pre>

							<hr />

							<pre style={{ whiteSpace: 'pre-wrap' }}>
								{JSON.stringify(extractedThumbnails, null, 2)}
							</pre>
							<pre style={{ whiteSpace: 'pre-wrap' }}>
								{JSON.stringify(files, null, 2)}
							</pre>
						</details>
					)}
				</View>
				<View gridArea="footer" elementType="footer">
					<Flex alignItems="center" justifyContent="space-between">
						<View>
							<Text>Selected: {selected.length}</Text>
						</View>
						<Flex gap="size-100">
							<Button variant="primary" type="button" onPress={handleClose}>
								Quit
							</Button>
							<Button
								isDisabled={!selected.length}
								variant="cta"
								type="button"
								onPress={() =>
									copyOrConvertFile(selected.map((file) => file.original_path))
								}
							>
								Import
							</Button>
						</Flex>
					</Flex>
				</View>
			</Grid>
		</Provider>
	);
}

export default App;
