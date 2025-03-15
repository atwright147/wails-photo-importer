import {
	Button,
	Flex,
	Grid,
	Provider,
	Text,
	View,
	defaultTheme,
} from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';

import {
	CopyOrConvert,
	ExtractThumbnail,
	ListFiles,
	PictureDir,
} from '../wailsjs/go/main/App';
import { type main, runtime } from '../wailsjs/go/models';
import { OptionsForm } from './components/OptionsForm/OptionsForm';
import { SlideList } from './components/SlideList/SlideList';
import { jpegPreviewSizes, subFolderOptions } from './constants';
import { useConfigStoreQuery } from './hooks/useConfigStoreQuery';
import { useGetEnvQuery } from './hooks/useGetEnvQuery';
import { usePhotosStore } from './stores/photos.store';
import type { FileInfo } from './types/File';
import { getDngArgs } from './utils/getDngArgs';

import './App.css';
import { EventsOff, EventsOn } from '../wailsjs/runtime';

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
	// const store = new Store('photo-importer.settings.json');
	const [files, setFiles] = useState<main.FileInfo[]>([]);
	const {
		extractedThumbnails,
		selected,
		setExtractedThumbnails,
		setSelectedAll,
		setSelectNone,
	} = usePhotosStore(
		useShallow((state) => ({
			selected: state.selected,
			setSelectedAll: state.setSelectedAll,
			setSelectNone: state.setSelectNone,
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		// Register the event listener
		EventsOn('select-all', () => setSelectedAll());
		EventsOn('deselect-all', () => setSelectNone());

		// Cleanup the event listener on component unmount
		return () => {
			EventsOff('select-all', '');
			EventsOff('deselect-all', '');
		};
	}, []);

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

	const copyOrConvertFile = async (
		sources: string[],
		destination: string,
		dateFormat: string,
		useDngConverter: boolean,
		deleteOriginal: boolean,
		args: string,
	): Promise<void> => {
		console.info('copyOrConvertFile', sources, destination, useDngConverter);
		try {
			await CopyOrConvert(
				sources,
				destination,
				dateFormat,
				useDngConverter,
				deleteOriginal,
				args,
			);
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
									copyOrConvertFile(
										selected.map((file) => file.original_path),
										formValues.location ?? '',
										formValues.createSubFoldersPattern ??
											subFolderOptions[2].id,
										formValues.convertToDng ?? false,
										formValues.deleteOriginal ?? false,
										getDngArgs({
											jpegPreviewSize: formValues.jpegPreviewSize ?? '',
											compressedLossless:
												formValues.compressedLossless ?? false,
											imageConversionMethod:
												formValues.imageConversionMethod ?? '',
											embedOriginalRawFile:
												formValues.embedOriginalRawFile ?? false,
										}),
									)
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
