import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FlowOfficeApi implements ICredentialType {
	name = 'flowOfficeApi';
	displayName = 'FlowOffice API';
	icon = { light: 'file:FlowOfficeApi.svg', dark: 'file:FlowOfficeApi.dark.svg' } as const;
	documentationUrl = 'https://app.flow-office.eu/n8n-docs';
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/api-key/validate',
			method: 'GET',
			headers: {
				Authorization: 'Bearer {{$credentials.apiKey}}',
			},
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 200,
					message: 'API key is valid',
				},
			},
		],
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.flow-office.eu',
			required: true,
			description: 'Base URL of the FlowOffice API',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key for authenticating with FlowOffice',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: 'Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
