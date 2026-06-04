import got, { HTTPError, TimeoutError, RequestError, type Method, type Response } from 'got'
import type { ModuleInstance } from './main.js'

// Hard ceiling on how long any single HTTP request may take. Waiting longer than this during a
// live transmission is a liability, so we fail fast instead of blocking.
const REQUEST_TIMEOUT_MS = 5000

// Build the auth headers for the NOVA/Wingo API from the user-configured bearer token.
function authHeaders(self: ModuleInstance): Record<string, string> {
	const token = self.getModel().general.wingoToken
	return token ? { Authorization: `Bearer ${token}` } : {}
}

// Never write secrets to the log: replace the Authorization value with a masked placeholder
// that still reveals the scheme and whether a token was actually present.
function redactHeaders(headers: Record<string, string>): Record<string, string> {
	const out: Record<string, string> = { ...headers }
	if (out.Authorization) {
		const [scheme] = out.Authorization.split(' ')
		out.Authorization = `${scheme} ***redacted***`
	}
	return out
}

// Keep response/body log lines from flooding the log; bodies are usually small but can be large.
function truncate(text: string, max = 2000): string {
	return text.length > max ? `${text.slice(0, max)}… (${text.length} bytes total)` : text
}

interface RequestSpec {
	method: Extract<Method, 'GET' | 'POST' | 'DELETE'>
	url: string
	headers?: Record<string, string>
	json?: unknown
}

// Single choke-point for every outgoing HTTP request so that all calls are logged the same way,
// using the Companion log API at the appropriate levels:
//   - debug: the full request line, redacted headers, request body, redirects, and the response body
//   - info:  a one-line success summary (method, url, status, elapsed time)
//   - error: HTTP error statuses, timeouts (>5s), and network/connection failures with their error codes
// Returns the response on success, or null on any failure (callers stay fire-and-forget).
async function performRequest(
	self: ModuleInstance,
	context: string,
	spec: RequestSpec,
): Promise<Response<string> | null> {
	const { method, url, headers = {}, json } = spec

	self.log('debug', `${context}: → ${method} ${url}`)
	if (Object.keys(headers).length > 0) {
		self.log('debug', `${context}: → headers ${JSON.stringify(redactHeaders(headers))}`)
	}
	if (json !== undefined) {
		self.log('debug', `${context}: → body ${truncate(JSON.stringify(json))}`)
	}

	const startedAt = Date.now()
	try {
		const response = await got(url, {
			method,
			headers,
			json,
			responseType: 'text',
			throwHttpErrors: true,
			// Live-transmission safety: never block longer than 5s on a single request.
			timeout: { request: REQUEST_TIMEOUT_MS },
			// No retries, ever. A failed request is dead — retrying could fire a stale command
			// seconds later (mid-transmission) and stack extra waits. One attempt only.
			retry: { limit: 0 },
			hooks: {
				beforeRedirect: [
					(updatedOptions, plainResponse) => {
						self.log(
							'debug',
							`${context}: ↪ redirected to ${String(updatedOptions.url)} (HTTP ${plainResponse.statusCode})`,
						)
					},
				],
			},
		})

		const elapsed = Date.now() - startedAt
		self.log(
			'info',
			`${context}: ✓ ${method} ${url} → ${response.statusCode} ${response.statusMessage ?? ''} (${elapsed}ms)`,
		)
		if (response.body) {
			self.log('debug', `${context}: ← body ${truncate(response.body)}`)
		}
		return response
	} catch (err) {
		const elapsed = Date.now() - startedAt

		if (err instanceof HTTPError) {
			const { statusCode, statusMessage, body } = err.response
			self.log('error', `${context}: ✗ ${method} ${url} → HTTP ${statusCode} ${statusMessage ?? ''} (${elapsed}ms)`)
			const bodyText = typeof body === 'string' ? body : JSON.stringify(body)
			if (bodyText) self.log('error', `${context}: ← error body ${truncate(bodyText)}`)
		} else if (err instanceof TimeoutError) {
			self.log('error', `${context}: ✗ ${method} ${url} timed out on "${err.event}" after ${elapsed}ms`)
		} else if (err instanceof RequestError) {
			self.log('error', `${context}: ✗ ${method} ${url} failed after ${elapsed}ms: ${err.code} ${err.message}`)
		} else {
			self.log(
				'error',
				`${context}: ✗ ${method} ${url} failed after ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`,
			)
		}
		return null
	}
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
	self.log('debug', `${context}: NP ${npIndex} dispatching request`)
	await performRequest(self, context, { method: 'GET', url })
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

	const context = 'Wolfpack'
	const url = withScheme(npp.nova.url)
	const body = {
		command: 'neoprodplatsNPP.ps1',
		args: ['-config', np.svtLabel],
	}

	self.log('debug', `${context}: NPP ${nppIndex} → NP ${npIndex} (${np.svtLabel}) selecting config`)
	await performRequest(self, context, { method: 'POST', url, headers: authHeaders(self), json: body })
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

	const context = 'Nova Window Load NeoCom'
	const url = joinUrl(withScheme(npp.nova.url), `window/window_${window}/load`)
	const body = {
		url: `${joinUrl(model.general.neocomBaseUrl, np.neocomProdId)}/line/2?companion=ws://127.0.0.1:12345`,
	}

	self.log(
		'debug',
		`${context}: NPP ${nppIndex} window ${window} → NP ${npIndex} (${np.svtLabel}, prod ${np.neocomProdId})`,
	)
	await performRequest(self, context, { method: 'POST', url, headers: authHeaders(self), json: body })
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

	self.log('debug', `${context}: NPP ${nppIndex} deleting window ${windowIndex}`)
	await performRequest(self, context, { method: 'DELETE', url, headers: authHeaders(self), json: {} })
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

	self.log('debug', `${context}: NPP ${nppIndex} creating window`)
	await performRequest(self, context, { method: 'POST', url, headers: authHeaders(self), json: body })
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

	self.log('debug', `${context}: NPP ${nppIndex} window ${windowIndex} loading ${loadUrl}`)
	await performRequest(self, context, { method: 'POST', url, headers: authHeaders(self), json: body })
}

// Vindral Get Channels: GET <vindral api base>channels?take=<take>. Read-only call against the
// public Vindral API; the response body is logged at debug level (parsing into variables can be
// layered on later).
export async function vindralGetChannels(self: ModuleInstance, take: number): Promise<void> {
	const context = 'Vindral Get Channels'
	const base = self.getModel().general.vindralApiBase

	if (!base) {
		self.log('warn', `${context}: no Vindral API base URL configured`)
		return
	}

	const url = joinUrl(withScheme(base), `channels?take=${take}`)
	await performRequest(self, context, { method: 'GET', url })
}
