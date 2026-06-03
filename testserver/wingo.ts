/**
 * Minimal NOVA Wingo test server for local development.
 *
 * Listens for the POST requests the Wolfpack action sends and logs the method,
 * URL, headers and JSON body, then replies with a small JSON ack.
 *
 * Run it with Node's built-in TypeScript support (Node >= 22.6):
 *   node --experimental-strip-types testserver/wingo.ts
 *   PORT=3000 node --experimental-strip-types testserver/wingo.ts
 *
 * Or via the package script:
 *   yarn testserver:wingo
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

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

	console.log('\n--- incoming request ---')
	console.log(`${req.method} ${req.url}`)
	console.log('headers:', JSON.stringify(req.headers, null, 2))

	if (raw) {
		try {
			console.log('body:', JSON.stringify(JSON.parse(raw), null, 2))
		} catch {
			console.log('body (raw):', raw)
		}
	} else {
		console.log('body: <empty>')
	}

	res.writeHead(200, { 'Content-Type': 'application/json' })
	res.end(JSON.stringify({ ok: true, received: raw || null }))
})

server.listen(PORT, HOST, () => {
	console.log(`NOVA Wingo test server listening on http://${HOST}:${PORT}`)
})
