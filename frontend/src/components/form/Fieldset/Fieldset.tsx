import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';

import styles from './Fieldset.module.scss';

export interface Props extends ComponentPropsWithoutRef<'fieldset'> {
	children: ReactNode;
	legend?: string;
}

export const Legend = ({ children }: { children: ReactNode }): JSX.Element => {
	return <legend className={styles.legend}>{children}</legend>;
};

export const Fieldset: FC<Props> = ({ children, legend }): JSX.Element => {
	return (
		<fieldset className={styles.fieldset}>
			{legend && <Legend>{legend}</Legend>}
			{children}
		</fieldset>
	);
};
