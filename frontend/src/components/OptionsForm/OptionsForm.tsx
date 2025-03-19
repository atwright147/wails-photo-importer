import {
	AlertDialog,
	Button,
	ButtonGroup,
	Checkbox,
	Content,
	Dialog,
	DialogContainer,
	Divider,
	Flex,
	Form,
	Heading,
	Item,
	Picker,
	Radio,
	RadioGroup,
	TextField,
} from '@adobe/react-spectrum';
import { DevTool } from '@hookform/devtools';
import IconFolder from '@spectrum-icons/workflow/Folder';
import IconRefresh from '@spectrum-icons/workflow/Refresh';
import { type FC, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';

import { OpenDirectoryDialog } from '../../../wailsjs/go/main/App';
import { BrowserOpenURL } from '../../../wailsjs/runtime';
import { jpegPreviewSizes, subFolderOptions } from '../../constants';
import {
	useConfigStoreMutation,
	useConfigStoreQuery,
} from '../../hooks/useConfigStoreQuery';
import { useDisksQuery } from '../../hooks/useDisksQuery';
import { useIsDngConverterAvailableQuery } from '../../hooks/useIsDngConverterAvailableQuery';
import { usePhotosStore } from '../../stores/photos.store';
import {
	type Value,
	handleFieldChangeSave,
} from '../../utils/handleFieldChangeSave';
import { Fieldset } from '../form/Fieldset/Fieldset';

export const OptionsForm: FC = (): JSX.Element => {
	const [dngSettingsDialog, setDngSettingsDialog] = useState(false);
	const [dngConverterAlert, setDngConverterAlert] = useState(false);
	const { data: isDngConverterAvailable } = useIsDngConverterAvailableQuery();
	const { mutate: saveConfig } = useConfigStoreMutation();
	const { handleSubmit, control, getValues, setValue } = useFormContext();
	const { setSelectedAll, setSelectNone, invert } = usePhotosStore(
		useShallow((store) => ({
			setSelectedAll: store.setSelectedAll,
			setSelectNone: store.setSelectNone,
			invert: store.invert,
		})),
	);

	// @ts-ignore
	const onSubmit = (data) => {
		// Call your API here...
	};

	// Open a selection dialog for directories

	const handleChooseFolder = async () => {
		const previousValue = getValues('location');

		const selected = await OpenDirectoryDialog(getValues('location'));

		if (selected === null) {
			// user cancelled the selection
			console.info('cancelled');
		} else {
			// user selected a single directory
			console.info('selected', selected);
			const shouldDirty = previousValue !== selected;
			setValue('location', selected as string, {
				shouldDirty,
				shouldTouch: true,
			});
			saveConfig({ location: selected });
		}
	};

	const handleRefetchDisks = () => {
		refetchDisks();
	};

	const handleDngSettings = () => {
		setDngSettingsDialog(true);
	};

	const handleCloseDngConverterAlert = () => {
		setDngConverterAlert(false);
	};

	const handleCloseDngSettingsFormDialog = () => {
		setDngSettingsDialog(false);
	};

	const handleGetDngConverter = () => {
		const url =
			'https://helpx.adobe.com/uk/camera-raw/using/adobe-dng-converter.html';
		BrowserOpenURL(url);
	};

	const handleDngSettingsFormSave = async () => {
		await saveConfig(getValues());
		setDngSettingsDialog(false);
	};

	const handleDngConverterCheckboxChange = async (
		value: Value,
		name: string,
		onChangeFn: (value: Value) => void,
	): Promise<void> => {
		if (!isDngConverterAvailable) {
			setDngConverterAlert(true);
			return;
		}
		await handleFieldChangeSave(value, name, onChangeFn);
	};

	const {
		data: disks,
		isLoading: isLoadingDisks,
		refetch: refetchDisks,
		isFetching: isFetchingDisks,
	} = useDisksQuery();

	const options = useMemo(
		() =>
			disks?.sort().map((disk) => ({ id: disk.MountPoint, name: disk.Label })),
		[disks],
	);

	const handleSelectAll = () => {
		setSelectedAll();
	};

	const handleSelectNone = () => {
		console.info('handleSelectNone');
		setSelectNone();
	};

	const handleSelectInvert = () => {
		console.info('handleSelectInvert');
		invert();
	};

	const handleFocus = () => refetchDisks();

	return (
		<>
			<Form onSubmit={() => handleSubmit(onSubmit)}>
				<Fieldset>
					<legend>Options</legend>

					<Flex gap="size-100" direction="column">
						<Flex gap="size-100" direction="row" alignItems="end">
							<Controller
								control={control}
								name="sourceDisk"
								rules={{ required: 'Location is required.' }}
								render={({
									field: { name, value, onChange, onBlur, ref },
									fieldState: { error },
								}) => (
									<Picker
										label="Source Disk"
										name={name}
										items={options ?? []}
										onSelectionChange={onChange}
										selectedKey={value}
										onFocus={handleFocus}
										onBlur={onBlur}
										ref={ref}
										isLoading={isLoadingDisks || isFetchingDisks}
										isRequired
										errorMessage={error?.message}
										width="100%"
									>
										{(item) => <Item>{item.name}</Item>}
									</Picker>
								)}
							/>
							<Button
								type="button"
								variant="secondary"
								onPress={handleRefetchDisks}
								aria-label="Refresh disks"
							>
								<IconRefresh />
							</Button>
						</Flex>

						<Flex gap="size-100" direction="row" alignItems="end">
							<Controller
								control={control}
								name="location"
								rules={{ required: 'Location is required.' }}
								render={({
									field: { name, value, onChange, onBlur, ref },
									fieldState: { error },
								}) => (
									<TextField
										label="Location"
										name={name}
										value={value}
										onChange={onChange}
										onBlur={onBlur}
										ref={ref}
										isRequired
										errorMessage={error?.message}
										width="100%"
									/>
								)}
							/>
							<Button
								type="button"
								variant="secondary"
								onPress={handleChooseFolder}
								aria-label="Select a folder"
							>
								<IconFolder />
							</Button>
						</Flex>

						<Controller
							control={control}
							name="createSubFoldersPattern"
							rules={{ required: 'Location is required.' }}
							render={({
								field: { name, value, onChange, onBlur, ref },
								fieldState: { error },
							}) => (
								<Picker
									label="Create Sub-Folders"
									name={name}
									items={subFolderOptions}
									onSelectionChange={(event) =>
										handleFieldChangeSave(event as string, name, onChange)
									}
									selectedKey={value}
									onBlur={onBlur}
									ref={ref}
									isRequired
									errorMessage={error?.message}
									width="100%"
								>
									{(item) => <Item>{item.name}</Item>}
								</Picker>
							)}
						/>
					</Flex>
				</Fieldset>

				<Fieldset legend="Advanced Options">
					<Flex gap="size-100" direction="column">
						<Flex>
							<Controller
								control={control}
								name="convertToDng"
								render={({ field: { name, value, onChange, onBlur, ref } }) => (
									<Checkbox
										name={name}
										onChange={(event) =>
											handleDngConverterCheckboxChange(event, name, onChange)
										}
										onBlur={onBlur}
										ref={ref}
										isSelected={value}
									>
										Convert To DNG
									</Checkbox>
								)}
							/>
							<Button
								type="button"
								variant="secondary"
								onPress={handleDngSettings}
							>
								Settings
							</Button>
						</Flex>
						<Controller
							control={control}
							name="deleteOriginal"
							rules={{ required: 'Create sub-folders pattern is required.' }}
							render={({ field: { name, value, onChange, onBlur, ref } }) => (
								<Checkbox
									name={name}
									onChange={(event) =>
										handleFieldChangeSave(event, name, onChange)
									}
									onBlur={onBlur}
									ref={ref}
									defaultSelected={value}
									isSelected={value}
									isReadOnly={!isDngConverterAvailable}
								>
									Delete Original
								</Checkbox>
							)}
						/>
					</Flex>
				</Fieldset>

				<Fieldset legend="Selection">
					<Flex gap="size-100" direction="row">
						<Button
							type="button"
							variant="secondary"
							onPress={handleSelectAll}
							flexGrow={1}
						>
							All
						</Button>

						<Button
							type="button"
							variant="secondary"
							onPress={handleSelectNone}
							flexGrow={1}
						>
							None
						</Button>

						<Button
							type="button"
							variant="secondary"
							onPress={handleSelectInvert}
							flexGrow={1}
						>
							Invert
						</Button>
					</Flex>
				</Fieldset>
			</Form>

			<DialogContainer type="modal" onDismiss={handleCloseDngConverterAlert}>
				{dngConverterAlert && (
					<AlertDialog
						variant="confirmation"
						title="Adobe DNG Converter not installed"
						primaryActionLabel="Get Adobe DNG Converter"
						cancelLabel="Cancel"
						onCancel={handleCloseDngConverterAlert}
						onPrimaryAction={handleGetDngConverter}
					>
						Get Adobe DNG Converter?
					</AlertDialog>
				)}
			</DialogContainer>

			<DialogContainer
				type="modal"
				onDismiss={handleCloseDngSettingsFormDialog}
			>
				{dngSettingsDialog && (
					<Dialog>
						<Heading>DNG Convert Settings</Heading>
						<Divider />
						<ButtonGroup>
							<Button
								variant="secondary"
								onPress={() => setDngSettingsDialog(false)}
							>
								Cancel
							</Button>
							<Button
								autoFocus
								variant="accent"
								onPress={handleDngSettingsFormSave}
							>
								Save
							</Button>
						</ButtonGroup>

						<Content>
							<Flex direction="column" gap="size-200">
								<Fieldset legend="Preview">
									<Controller
										name="jpegPreviewSize"
										control={control}
										render={({ field }) => (
											<Picker
												label="JPEG Preview Size"
												items={jpegPreviewSizes}
												onSelectionChange={field.onChange}
												selectedKey={field.value}
												width="100%"
											>
												{(item) => (
													<Item key={item.id} textValue={item.name}>
														{item.name}
													</Item>
												)}
											</Picker>
										)}
									/>
								</Fieldset>
								<Controller
									control={control}
									name="compressedLossless"
									render={({ field }) => (
										<Checkbox
											name={field.name}
											onChange={field.onChange}
											onBlur={field.onBlur}
											ref={field.ref}
											isSelected={field.value}
										>
											Compressed (lossless)
										</Checkbox>
									)}
								/>
								<Fieldset
									legend="Image Conversion Method"
									id="image-conversion-method-fieldset"
								>
									<Controller
										control={control}
										name="imageConversionMethod"
										render={({ field }) => (
											<RadioGroup
												onChange={field.onChange}
												value={field.value}
												aria-labelledby="image-conversion-method-fieldset"
											>
												<Radio value="preserve">Preserve Raw Image</Radio>
												<Radio value="linear">Convert to Linear Image</Radio>
											</RadioGroup>
										)}
									/>
								</Fieldset>
								<Controller
									control={control}
									name="embedOriginalRawFile"
									render={({ field }) => (
										<Checkbox
											name={field.name}
											onChange={field.onChange}
											onBlur={field.onBlur}
											ref={field.ref}
											isSelected={field.value}
										>
											Embed Original Raw File
										</Checkbox>
									)}
								/>
							</Flex>
						</Content>
					</Dialog>
				)}
			</DialogContainer>

			<DevTool control={control} placement="top-left" />
		</>
	);
};
