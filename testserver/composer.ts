/**
 * Minimal Composer command-API test server for local development.
 *
 * Recognizes the two Composer REST endpoints used by the actions:
 *   GET /api/connector/trigger?name=<command>[&key=value...]
 *   GET /api/scriptengine/execute?function=<command>[&parameter=<value>]
 * Any other path is accepted and logged too.
 *
 * Logs method, path, the decoded query params, then replies with a small JSON ack.
 *
 * Point an NP's Composer host at this server and set the Composer API Port to 44433.
 *
 * Run it with Node's built-in TypeScript support (Node >= 22.6):
 *   node --experimental-strip-types testserver/composer.ts
 *   PORT=44433 node --experimental-strip-types testserver/composer.ts
 *
 * Or via the package script:
 *   yarn testserver:composer
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORT = Number(process.env.PORT ?? 44433)
const HOST = process.env.HOST ?? '0.0.0.0'

const TRIGGER_RE = /^\/api\/connector\/trigger\/?$/
const SCRIPT_RE = /^\/api\/scriptengine\/execute\/?$/

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
	const method = req.method ?? ''
	const rawUrl = req.url ?? ''
	const parsed = new URL(rawUrl, `http://${req.headers.host ?? HOST}`)
	const query = Object.fromEntries(parsed.searchParams.entries())

	console.log('\n--- incoming request ---')
	console.log(`${method} ${rawUrl}`)
	console.log('query:', JSON.stringify(query, null, 2))

	let responseBody: Record<string, unknown> = { ok: true, query }

	if (TRIGGER_RE.test(parsed.pathname)) {
		console.log(`-> connector trigger -> name=${query.name ?? ''}`)
		responseBody = { ok: true, api: 'trigger', name: query.name ?? null, query }
	} else if (SCRIPT_RE.test(parsed.pathname)) {
		console.log(`-> script engine -> function=${query.function ?? ''}`)
		responseBody = { ok: true, api: 'script', function: query.function ?? null, query }
	}

	res.writeHead(200, { 'Content-Type': 'application/json' })
	res.end(JSON.stringify(responseBody))
})

server.listen(PORT, HOST, () => {
	console.log(`Composer test server listening on http://${HOST}:${PORT}`)
})
