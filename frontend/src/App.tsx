import {
	Button,
	Content,
	Dialog,
	DialogContainer,
	Divider,
	Flex,
	Grid,
	Heading,
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
import { EventsOff, EventsOn, Quit } from '../wailsjs/runtime';
import { OptionsForm } from './components/OptionsForm/OptionsForm';
import { SlideList } from './components/SlideList/SlideList';
import { jpegPreviewSizes, subFolderOptions } from './constants';
import { useConfigStoreQuery } from './hooks/useConfigStoreQuery';
import { useGetEnvQuery } from './hooks/useGetEnvQuery';
import { usePhotosStore } from './stores/photos.store';
import type { FileInfo } from './types/File';

import './App.css';

interface FormValues {
	compressedLossless: boolean;
	convertToDng: boolean;
	createSubFoldersPattern: string;
	customSubFolderName: string;
	deleteOriginal: boolean;
	embedOriginalRawFile: boolean;
	imageConversionMethod: string;
	jpegPreviewSize: string;
	location: string;
	sourceDisk: string;
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
	const [importing, setImporting] = useState(false);

	const { data: config } = useConfigStoreQuery();
	const { data: env } = useGetEnvQuery();

	const methods = useForm<FormValues>({
		defaultValues: {
			compressedLossless: config?.compressedLossless ?? true,
			convertToDng: config?.convertToDng ?? false,
			createSubFoldersPattern:
				config?.createSubFoldersPattern ?? subFolderOptions[2].id,
			deleteOriginal: config?.deleteOriginal ?? false,
			embedOriginalRawFile: config?.embedOriginalRawFile ?? false,
			imageConversionMethod: config?.imageConversionMethod ?? 'preserve',
			jpegPreviewSize: config?.jpegPreviewSize ?? jpegPreviewSizes[2].id,
			location: config?.location ?? '',
			sourceDisk: '',
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

			const values: FormValues = {
				compressedLossless: config?.compressedLossless ?? true,
				convertToDng: config?.convertToDng ?? false,
				createSubFoldersPattern:
					config?.createSubFoldersPattern ?? subFolderOptions[2].id,
				customSubFolderName: config?.customSubFolderName ?? '',
				deleteOriginal: config?.deleteOriginal ?? false,
				embedOriginalRawFile: config?.embedOriginalRawFile ?? false,
				imageConversionMethod: config?.imageConversionMethod ?? 'preserve',
				jpegPreviewSize: config?.jpegPreviewSize ?? jpegPreviewSizes[2].id,
				location: config?.location ?? pictureDir,
				sourceDisk: '',
			};

			methods.reset(values);
		})();
	}, [
		config?.compressedLossless,
		config?.convertToDng,
		config?.createSubFoldersPattern,
		config?.customSubFolderName,
		config?.deleteOriginal,
		config?.embedOriginalRawFile,
		config?.imageConversionMethod,
		config?.jpegPreviewSize,
		config?.location,
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

	const handleClose = (): void => {
		try {
			Quit();
		} catch (err) {
			console.error(err);
		}
	};

	const copyOrConvertFile = async (files: string[]): Promise<void> => {
		console.info('copyOrConvertFile', files);
		setImporting(true);
		try {
			await CopyOrConvert(files);
			console.info('Operation successful');
		} catch (error) {
			console.error('Operation failed', error);
		}
		setImporting(false);
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

			<DialogContainer isDismissable={false} onDismiss={() => {}}>
				{importing && (
					<Dialog>
						<Heading>Importing…</Heading>
						<Divider />
						<Content>
							<Flex direction="column" gap="size-200">
								<Text>Importing your selected files</Text>
								<progress style={{ width: '100%' }} />
							</Flex>
						</Content>
					</Dialog>
				)}
			</DialogContainer>
		</Provider>
	);
}

export default App;
