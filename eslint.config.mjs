import { config } from '@n8n/node-cli/eslint';

/** @type {import("eslint").Linter.Config} */
const configToUse = {
	...config,
	rules: {
		...config.rules,
	},
};

export default configToUse;
