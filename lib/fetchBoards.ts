import { apiSchema_v1 } from './api-schema';

import { getCredentials_fromOptionsLoader } from './get-credentials';

import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { ListBoardsOutput } from './buildBoardOptions';

const FallbackBaseUrl = 'https://api.flow-office.eu';

export async function fetchBoards(thisArg: ILoadOptionsFunctions): Promise<ListBoardsOutput> {
	const creds = await getCredentials_fromOptionsLoader(thisArg);

	const baseUrl = (creds.baseUrl || FallbackBaseUrl).replace(/\/$/, '');

	const response = await thisArg.helpers.httpRequestWithAuthentication.call(
		thisArg,
		'flowOfficeApi',
		{
			method: 'GET',
			url: baseUrl + apiSchema_v1.board.listBoards.pathname,
		},
	);

	return apiSchema_v1.board.listBoards.schema.parse(response);
}
