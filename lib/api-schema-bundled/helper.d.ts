export function parseStatus_columnJson(column: { columnJSON: string }): {
	labels: {
		label: string;
		backgroundColor: string;
		enumKey: string;
	}[];
};

declare const helper: {
	readonly parseStatus_columnJson: typeof parseStatus_columnJson;
};

export { helper };
