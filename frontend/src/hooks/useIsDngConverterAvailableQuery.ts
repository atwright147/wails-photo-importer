import { useQuery } from '@tanstack/react-query';

import { IsDNGConverterAvailable } from '../../wailsjs/go/main/App';

const QUERY_KEY = ['isDngConverterAvailable'];

const getIsDngConverterAvailable = async (): Promise<boolean> => {
	try {
		return IsDNGConverterAvailable();
	} catch (err) {
		console.error(err);
		return Promise.reject(err);
	}
};

export const useIsDngConverterAvailableQuery = () => {
	return useQuery<boolean, Error>({
		queryKey: QUERY_KEY,
		queryFn: getIsDngConverterAvailable,
		staleTime: 0,
		gcTime: 0,
	});
};
