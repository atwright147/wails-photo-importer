import { useQuery } from '@tanstack/react-query';

import { GetDiskInfo } from '../../wailsjs/go/main/App';
import type { main } from '../../wailsjs/go/models';

const QUERY_KEY = ['disks', 'all'];

const getDisks = async (): Promise<main.DiskInfo[]> => {
	try {
		return GetDiskInfo();
	} catch (err) {
		console.info(err);
		return Promise.reject(err);
	}
};

export const useDisksQuery = () => {
	return useQuery<main.DiskInfo[], Error>({
		queryKey: QUERY_KEY,
		queryFn: getDisks,
		staleTime: 0,
		gcTime: 0,
	});
};
