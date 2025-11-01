import { getCredentials_fromOptionsLoader } from "../get-credentials"

import {
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IExecuteFunctions,
	IHookFunctions,
	IWebhookFunctions,
} from "n8n-workflow"
import z from "zod"

export type NodeExecutionContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions

export async function invokeEndpoint<S_input extends z.Schema, S_output extends z.Schema>(
	apiSchema: {
		method: (string & {}) | "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD"
		inputSchema: S_input
		outputSchema: S_output
		pathname: string
	},
	input: {
		thisArg: NodeExecutionContext
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
			// Send JSON payloads in the n8n-standard way so arrays/objects are preserved
			...(input.body !== null && input.body !== undefined ? { body: input.body, json: true } : {}),
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
