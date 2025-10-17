import { ILoadOptionsFunctions } from "n8n-workflow"

const FallbackBaseUrl = "https://api.flow-office.eu"

export async function getCredentials_fromOptionsLoader(
	thisArg: Pick<ILoadOptionsFunctions, "getCredentials">,
) {
	const creds = (await thisArg.getCredentials("flowOfficeApi")) as {
		apiKey: string
		baseUrl?: string
	}

	const baseUrl = (creds.baseUrl || FallbackBaseUrl).replace(/\/$/, "")

	return { creds, baseUrl }
}
