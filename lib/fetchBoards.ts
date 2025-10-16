import { apiSchema_v1 } from './api-schema';

import { getCredentials_fromOptionsLoader } from './get-credentials';

import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { ListBoardsOutput } from './buildBoardOptions';

export async function fetchBoards(thisArg: ILoadOptionsFunctions): Promise<ListBoardsOutput> {
	const { baseUrl } = await getCredentials_fromOptionsLoader(thisArg);

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
