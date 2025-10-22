import { getCredentials_fromOptionsLoader } from "../get-credentials"

import {
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IExecuteFunctions,
	IHookFunctions,
} from "n8n-workflow"
import z from "zod"

export async function invokeEndpoint<S_input extends z.Schema, S_output extends z.Schema>(
	apiSchema: {
		method: (string & {}) | "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD"
		inputSchema: S_input
		outputSchema: S_output
		pathname: string
	},
	input: {
		thisArg: ILoadOptionsFunctions | IExecuteFunctions | IHookFunctions
		body: z.input<S_input>

		displayOutput_whenZodParsingFails?: boolean
	},
): Promise<z.output<S_output>> {
	const { baseUrl } = await getCredentials_fromOptionsLoader(input.thisArg)

	const response = await input.thisArg.helpers.httpRequestWithAuthentication.call(
		input.thisArg,
		"flowOfficeApi",
		{
			method: apiSchema.method as IHttpRequestMethods,
			url: baseUrl + apiSchema.pathname,
			body: input.body ?? undefined,
			encoding: input.body ? "json" : undefined,
		},
	)

	const parseResult = apiSchema.outputSchema.safeParse(response)

	if (parseResult.success) {
		return parseResult.data
	}

	if (input.displayOutput_whenZodParsingFails) {
		return response
	}

	throw parseResult.error
}
