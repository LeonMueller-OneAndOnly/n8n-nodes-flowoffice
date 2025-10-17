import { getCredentials_fromOptionsLoader } from "../get-credentials"

import { IHttpRequestMethods, ILoadOptionsFunctions, IExecuteFunctions } from "n8n-workflow"
import z from "zod"

export async function invokeEndpoint<S_input extends z.Schema, S_output extends z.Schema>(
	apiSchema: {
		method: (string & {}) | "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD"
		inputSchema: S_input
		outputSchema: S_output
		pathname: string
	},
	input: {
		thisArg: ILoadOptionsFunctions | IExecuteFunctions
		body: z.input<S_input>
	},
): Promise<z.output<S_output>> {
	const { baseUrl } = await getCredentials_fromOptionsLoader(input.thisArg)

	const response = await input.thisArg.helpers.httpRequestWithAuthentication.call(
		input.thisArg,
		"flowOfficeApi",
		{
			method: apiSchema.method as IHttpRequestMethods,
			url: baseUrl + apiSchema.pathname,
			body: JSON.stringify(input.body),
		},
	)

	return apiSchema.outputSchema.parse(response)
}
