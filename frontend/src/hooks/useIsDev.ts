import { useEffect, useState } from 'react';

export const useIsDev = (): boolean => {
	const [isDev, setIsDev] = useState(false);

	useEffect(() => {
		(async () => {
			// FIXME: detect if in dev mode
			setIsDev(true);
		})();
	}, []);

	return isDev;
};
