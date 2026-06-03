/**
 * Minimal NOVA window-manager test server for local development.
 *
 * Recognizes the NOVA window-manager REST routes used by the actions:
 *   POST   /windows                       -> create a window (returns an id)
 *   DELETE /window/window_<n>             -> delete a window
 *   POST   /window/window_<n>/load        -> load a URL / NeoCom into a window
 * Any other path is accepted and logged too.
 *
 * Logs method, URL, headers and JSON body, then replies with a small JSON ack.
 *
 * Note: this listens on the same NOVA port (3000) as the Wingo test server, so
 * run only one of them at a time (or override PORT).
 *
 * Run it with Node's built-in TypeScript support (Node >= 22.6):
 *   node --experimental-strip-types testserver/nova.ts
 *   PORT=3000 node --experimental-strip-types testserver/nova.ts
 *
 * Or via the package script:
 *   yarn testserver:nova
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

const WINDOWS_RE = /\/windows\/?$/
const WINDOW_LOAD_RE = /\/window\/window_(\d+)\/load\/?$/
const WINDOW_RE = /\/window\/window_(\d+)\/?$/

// Incrementing id for created windows, so the create route can return something useful.
let nextWindowId = 0

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', (chunk: Buffer) => chunks.push(chunk))
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		req.on('error', reject)
	})
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
	const raw = await readBody(req)
	const method = req.method ?? ''
	const url = req.url ?? ''

	console.log('\n--- incoming request ---')
	console.log(`${method} ${url}`)

	if (raw) {
		try {
			console.log('body:', JSON.stringify(JSON.parse(raw), null, 2))
		} catch {
			console.log('body (raw):', raw)
		}
	} else {
		console.log('body: <empty>')
	}

	const loadMatch = url.match(WINDOW_LOAD_RE)
	const windowMatch = url.match(WINDOW_RE)

	let responseBody: Record<string, unknown> = { ok: true, received: raw || null }

	if (method === 'POST' && WINDOWS_RE.test(url)) {
		const id = nextWindowId++
		console.log(`-> create window -> window_${id}`)
		responseBody = { ok: true, action: 'create', id, name: `window_${id}` }
	} else if (method === 'POST' && loadMatch) {
		console.log(`-> load into window ${loadMatch[1]}`)
		responseBody = { ok: true, action: 'load', window: Number(loadMatch[1]) }
	} else if (method === 'DELETE' && windowMatch) {
		console.log(`-> delete window ${windowMatch[1]}`)
		responseBody = { ok: true, action: 'delete', window: Number(windowMatch[1]) }
	}

	res.writeHead(200, { 'Content-Type': 'application/json' })
	res.end(JSON.stringify(responseBody))
})

server.listen(PORT, HOST, () => {
	console.log(`NOVA test server listening on http://${HOST}:${PORT}`)
})
