import { useQuery } from '@tanstack/react-query';

import { GetEnv } from '../../wailsjs/go/main/App';
import type { runtime } from '../../wailsjs/go/models';

const QUERY_KEY = ['GetEnv'];

const getGetEnv = async (): Promise<runtime.EnvironmentInfo> => {
	try {
		return GetEnv();
	} catch (err) {
		console.error(err);
		return Promise.reject(err);
	}
};

export const useGetEnvQuery = () => {
	return useQuery<runtime.EnvironmentInfo, Error>({
		queryKey: QUERY_KEY,
		queryFn: getGetEnv,
		staleTime: 0,
		gcTime: 0,
	});
};
