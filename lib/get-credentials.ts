import { ILoadOptionsFunctions } from 'n8n-workflow';

export async function getCredentials_fromOptionsLoader(thisArg: ILoadOptionsFunctions): Promise<{
	apiKey: string;
	baseUrl?: string;
}> {
	return (await thisArg.getCredentials('flowOfficeApi')) as {
		apiKey: string;
		baseUrl?: string;
	};
}
