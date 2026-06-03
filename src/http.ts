import got from 'got'
import type { ModuleInstance } from './main.js'

// Build the auth headers for the NOVA/Wingo API from the user-configured bearer token.
function authHeaders(self: ModuleInstance): Record<string, string> {
	const token = self.getModel().general.wingoToken
	return token ? { Authorization: `Bearer ${token}` } : {}
}

// Ensure the resolved endpoint (host:port/baseurl) has an http scheme so `got` accepts it.
function withScheme(url: string): string {
	return /^https?:\/\//i.test(url) ? url : `http://${url}`
}

// Join a base URL and a path with exactly one slash between them.
function joinUrl(base: string, path: string): string {
	return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

// The NPP services that expose the window-manager REST API.
export type WindowService = 'nova' | 'neo'

const SERVICE_LABEL: Record<WindowService, string> = {
	nova: 'Nova',
	neo: 'Neo',
}

// Resolve the schemed base URL for a given NPP service, logging and returning null when unavailable.
function getServiceBase(
	self: ModuleInstance,
	nppIndex: number,
	service: WindowService,
	context: string,
): string | null {
	const model = self.getModel()
	const npp = model.npp[nppIndex - 1]

	if (!npp) {
		self.log('warn', `${context}: NPP ${nppIndex} is not configured`)
		return null
	}
	if (!npp[service].host) {
		self.log('warn', `${context}: NPP ${nppIndex} has no ${SERVICE_LABEL[service]} host configured`)
		return null
	}

	return withScheme(npp[service].url)
}

// Composer command API paths (appended to http://<composer host>:<composer port>).
const COMPOSER_TRIGGER_PATH = 'api/connector/trigger'
const COMPOSER_SCRIPT_PATH = 'api/scriptengine/execute'

// Resolve the schemed Composer API base (host:composerPort) for a given NP.
function getComposerApiBase(self: ModuleInstance, npIndex: number, context: string): string | null {
	const model = self.getModel()
	const np = model.np[npIndex - 1]

	if (!np) {
		self.log('warn', `${context}: NP ${npIndex} is not configured`)
		return null
	}
	if (!np.composerApi.host) {
		self.log('warn', `${context}: NP ${npIndex} has no Composer host configured`)
		return null
	}

	return withScheme(np.composerApi.url)
}

// Build a `&key=value` query suffix with URL-encoded values.
function buildQuerySuffix(params?: Record<string, string | number>): string {
	if (!params) return ''
	return Object.entries(params)
		.map(([key, value]) => `&${key}=${encodeURIComponent(String(value))}`)
		.join('')
}

// Core Composer GET request. The Composer API uses no auth header (unlike Nova/Wingo).
async function composerRequest(self: ModuleInstance, npIndex: number, context: string, url: string): Promise<void> {
	console.log(`${context} GET URL:`, url)

	try {
		const response = await got.get(url, { throwHttpErrors: true })
		self.log('info', `${context}: NP ${npIndex} responded ${response.statusCode}`)
	} catch (err) {
		self.log('error', `${context} request failed: ${err instanceof Error ? err.message : String(err)}`)
	}
}

// Composer connector trigger: GET …/api/connector/trigger?name=<name>[&key=value...].
export async function composerTrigger(
	self: ModuleInstance,
	npIndex: number,
	name: string,
	params?: Record<string, string | number>,
	context = 'Composer Trigger',
): Promise<void> {
	const base = getComposerApiBase(self, npIndex, context)
	if (!base) return

	const url = `${joinUrl(base, COMPOSER_TRIGGER_PATH)}?name=${encodeURIComponent(name)}${buildQuerySuffix(params)}`
	await composerRequest(self, npIndex, context, url)
}

// Composer script engine: GET …/api/scriptengine/execute?function=<fn>[&parameter=<urlencoded>].
export async function composerScript(
	self: ModuleInstance,
	npIndex: number,
	fn: string,
	parameter?: string,
	context = 'Composer Script',
): Promise<void> {
	const base = getComposerApiBase(self, npIndex, context)
	if (!base) return

	let url = `${joinUrl(base, COMPOSER_SCRIPT_PATH)}?function=${encodeURIComponent(fn)}`
	if (parameter !== undefined && parameter !== '') {
		url += `&parameter=${encodeURIComponent(parameter)}`
	}
	await composerRequest(self, npIndex, context, url)
}

// Raw Composer command: append an already-formed query suffix verbatim (no extra encoding),
// so power users can reproduce any legacy URL. `api` selects the connector or script-engine path.
export async function composerRaw(
	self: ModuleInstance,
	npIndex: number,
	api: 'trigger' | 'script',
	command: string,
	rawQuerySuffix = '',
): Promise<void> {
	const context = 'Composer Command'
	const base = getComposerApiBase(self, npIndex, context)
	if (!base) return

	const path = api === 'script' ? COMPOSER_SCRIPT_PATH : COMPOSER_TRIGGER_PATH
	const param = api === 'script' ? 'function' : 'name'
	const suffix = rawQuerySuffix && !rawQuerySuffix.startsWith('&') ? `&${rawQuerySuffix}` : rawQuerySuffix
	const url = `${joinUrl(base, path)}?${param}=${command}${suffix}`
	await composerRequest(self, npIndex, context, url)
}

// Wolfpack selector: tell the NOVA Wingo of a given NPP to load the config for a given NP.
export async function wolfpackSelector(self: ModuleInstance, nppIndex: number, npIndex: number): Promise<void> {
	const model = self.getModel()

	const npp = model.npp[nppIndex - 1]
	const np = model.np[npIndex - 1]

	if (!npp) {
		self.log('warn', `Wolfpack: NPP ${nppIndex} is not configured`)
		return
	}
	if (!np) {
		self.log('warn', `Wolfpack: NP ${npIndex} is not configured`)
		return
	}
	if (!npp.nova.host) {
		self.log('warn', `Wolfpack: NPP ${nppIndex} has no NOVA host configured`)
		return
	}

	const url = withScheme(npp.nova.url)
	const body = {
		command: 'neoprodplatsNPP.ps1',
		args: ['-config', np.svtLabel],
	}

	console.log('Wolfpack POST URL:', url)
	console.log('Wolfpack POST body:', JSON.stringify(body))

	try {
		const response = await got.post(url, {
			json: body,
			headers: authHeaders(self),
		})
		self.log('info', `Wolfpack: NPP ${nppIndex} -> ${np.svtLabel} responded ${response.statusCode}`)
	} catch (err) {
		self.log('error', `Wolfpack request failed: ${err instanceof Error ? err.message : String(err)}`)
	}
}

// Nova Window Load NeoCom: load a NeoCom production into a given window of the NPP's NOVA endpoint.
export async function novaWindowLoadNeocom(
	self: ModuleInstance,
	nppIndex: number,
	npIndex: number,
	window: number,
): Promise<void> {
	const model = self.getModel()

	const npp = model.npp[nppIndex - 1]
	const np = model.np[npIndex - 1]

	if (!npp) {
		self.log('warn', `Nova Window Load NeoCom: NPP ${nppIndex} is not configured`)
		return
	}
	if (!np) {
		self.log('warn', `Nova Window Load NeoCom: NP ${npIndex} is not configured`)
		return
	}
	if (!npp.nova.host) {
		self.log('warn', `Nova Window Load NeoCom: NPP ${nppIndex} has no NOVA host configured`)
		return
	}

	const url = joinUrl(withScheme(npp.nova.url), `window/window_${window}/load`)
	const body = {
		url: `${joinUrl(model.general.neocomBaseUrl, np.neocomProdId)}/line/2?companion=ws://127.0.0.1:12345`,
	}

	console.log('Nova Window Load NeoCom POST URL:', url)
	console.log('Nova Window Load NeoCom POST body:', JSON.stringify(body))

	try {
		const response = await got.post(url, {
			json: body,
			headers: authHeaders(self),
		})
		self.log(
			'info',
			`Nova Window Load NeoCom: NPP ${nppIndex} window ${window} -> ${np.svtLabel} (prod ${np.neocomProdId}) responded ${response.statusCode}`,
		)
	} catch (err) {
		self.log('error', `Nova Window Load NeoCom request failed: ${err instanceof Error ? err.message : String(err)}`)
	}
}

// Window Delete: delete a window on the NPP's Nova or Neo endpoint.
export async function windowDelete(
	self: ModuleInstance,
	service: WindowService,
	nppIndex: number,
	windowIndex: number,
): Promise<void> {
	const context = `${SERVICE_LABEL[service]} Window Delete`
	const base = getServiceBase(self, nppIndex, service, context)
	if (!base) return

	const url = joinUrl(base, `window/window_${windowIndex}`)
	const body = {}

	console.log(`${context} URL:`, url)
	console.log(`${context} body:`, JSON.stringify(body))

	try {
		const response = await got.delete(url, {
			json: body,
			headers: authHeaders(self),
		})
		self.log('info', `${context}: NPP ${nppIndex} window ${windowIndex} responded ${response.statusCode}`)
	} catch (err) {
		self.log('error', `${context} request failed: ${err instanceof Error ? err.message : String(err)}`)
	}
}

export interface WindowCreateOptions {
	display: number
	x: number
	y: number
	width: number
	height: number
	fullscreenMode: string
}

// Window Create: create a new window on the NPP's Nova or Neo endpoint.
export async function windowCreate(
	self: ModuleInstance,
	service: WindowService,
	nppIndex: number,
	options: WindowCreateOptions,
): Promise<void> {
	const context = `${SERVICE_LABEL[service]} Window Create`
	const base = getServiceBase(self, nppIndex, service, context)
	if (!base) return

	const url = joinUrl(base, 'windows')
	const body = {
		display: options.display,
		x: options.x,
		y: options.y,
		width: options.width,
		height: options.height,
		fullscreenMode: options.fullscreenMode,
	}

	console.log(`${context} URL:`, url)
	console.log(`${context} body:`, JSON.stringify(body))

	try {
		const response = await got.post(url, {
			json: body,
			headers: authHeaders(self),
		})
		self.log('info', `${context}: NPP ${nppIndex} responded ${response.statusCode}`)
	} catch (err) {
		self.log('error', `${context} request failed: ${err instanceof Error ? err.message : String(err)}`)
	}
}

// Window Load URL: load an arbitrary URL into a given window of the NPP's Nova or Neo endpoint.
export async function windowLoadUrl(
	self: ModuleInstance,
	service: WindowService,
	nppIndex: number,
	windowIndex: number,
	loadUrl: string,
): Promise<void> {
	const context = `${SERVICE_LABEL[service]} Window Load URL`
	const base = getServiceBase(self, nppIndex, service, context)
	if (!base) return

	const url = joinUrl(base, `window/window_${windowIndex}/load`)
	const body = { url: loadUrl }

	console.log(`${context} URL:`, url)
	console.log(`${context} body:`, JSON.stringify(body))

	try {
		const response = await got.post(url, {
			json: body,
			headers: authHeaders(self),
		})
		self.log('info', `${context}: NPP ${nppIndex} window ${windowIndex} responded ${response.statusCode}`)
	} catch (err) {
		self.log('error', `${context} request failed: ${err instanceof Error ? err.message : String(err)}`)
	}
}
