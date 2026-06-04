import type { ModuleConfig } from './config.js'

// A single resolved service endpoint (host + port + base URL and the strings derived from them).
// `port` is '' when unset so callers can mirror the empty-display behaviour of variables.
export interface ServiceEndpoint {
	host: string
	port: number | ''
	baseUrl: string
	// `${host}:${port}`, or '' when there is no host.
	hostPort: string
	// `${host}:${port}${baseUrl}`, or '' when there is no host.
	url: string
}

export interface NppUnit {
	index: number
	neo: ServiceEndpoint
	nova: ServiceEndpoint
}

export interface NpChannelIds {
	pgm: string
	mv: string
	ubur: string
	mcr: string
}

export interface NpUnit {
	index: number
	// Zero-padded SVT label, e.g. NP03.
	svtLabel: string
	composer: ServiceEndpoint
	// Composer command API (connector trigger / script engine), on the composer host : composer port.
	composerApi: ServiceEndpoint
	// NPGFX uses a per-unit port and is not HTTP, so it has no base URL.
	npgfx: ServiceEndpoint
	vindral: ServiceEndpoint
	channelIds: NpChannelIds
	neocomProdId: string
	cgPort: number | ''
	mcrSrtUrl: string
	mcrSrtUrlBackup: string
}

export interface GeneralConfig {
	nppCount: number
	npCount: number
	satellitePort: number | ''
	neoPort: number | ''
	wingoPort: number | ''
	novaPort: number | ''
	satelliteBaseUrl: string
	neoBaseUrl: string
	wingoBaseUrl: string
	novaBaseUrl: string
	vindralMinBuffer: number | ''
	vindralMaxBuffer: number | ''
	vindralApiBase: string
	composerPort: number | ''
	rtmpBasePrimary: string
	rtmpBaseBackup: string
	cgHost: string
	neocomBaseUrl: string
	wingoToken: string
}

export interface NeoModel {
	general: GeneralConfig
	npp: NppUnit[]
	np: NpUnit[]
}

function num(config: Record<string, unknown>, key: string): number | '' {
	return (config[key] as number | undefined) ?? ''
}

function str(config: Record<string, unknown>, key: string): string {
	return (config[key] as string | undefined) ?? ''
}

function endpoint(host: string, port: number | '', baseUrl: string): ServiceEndpoint {
	return {
		host,
		port,
		baseUrl,
		hostPort: host ? `${host}:${port}` : '',
		url: host ? `${host}:${port}${baseUrl}` : '',
	}
}

// Resolve the raw config into a typed model. This is the single source of truth for
// all derived values (host:port strings, URLs, SVT labels); both the variable
// definitions and the action/feedback callbacks should build from this.
export function buildModel(rawConfig: ModuleConfig | undefined): NeoModel {
	const config = (rawConfig ?? {}) as unknown as Record<string, unknown>

	const nppCount = (config.nppCount as number | undefined) ?? 1
	const npCount = (config.npCount as number | undefined) ?? 1

	const neoPort = num(config, 'neo_port')
	const novaPort = num(config, 'nova_port')
	const composerPort = num(config, 'composer_port')
	const neoBaseUrl = str(config, 'neo_baseurl')
	const novaBaseUrl = str(config, 'nova_baseurl')

	const general: GeneralConfig = {
		nppCount,
		npCount,
		satellitePort: num(config, 'satellite_port'),
		neoPort,
		wingoPort: num(config, 'wingo_port'),
		novaPort,
		satelliteBaseUrl: str(config, 'satellite_baseurl'),
		neoBaseUrl,
		wingoBaseUrl: str(config, 'wingo_baseurl'),
		novaBaseUrl,
		vindralMinBuffer: num(config, 'vindral_min_buffer'),
		vindralMaxBuffer: num(config, 'vindral_max_buffer'),
		vindralApiBase: str(config, 'vindral_api_base'),
		composerPort,
		rtmpBasePrimary: str(config, 'rtmp_base_primary'),
		rtmpBaseBackup: str(config, 'rtmp_base_backup'),
		cgHost: str(config, 'cg_host'),
		neocomBaseUrl: str(config, 'neocom_baseurl'),
		wingoToken: str(config, 'wingo_token'),
	}

	const npp: NppUnit[] = []
	for (let i = 1; i <= nppCount; i++) {
		npp.push({
			index: i,
			neo: endpoint(str(config, `npp_${i}_neo`), neoPort, neoBaseUrl),
			// Nova uses the Nova port/base URL.
			nova: endpoint(str(config, `npp_${i}_nova`), novaPort, novaBaseUrl),
		})
	}

	const np: NpUnit[] = []
	for (let i = 1; i <= npCount; i++) {
		const composerHost = str(config, `np_${i}_composer`)
		np.push({
			index: i,
			svtLabel: `NP${String(i).padStart(2, '0')}`,
			composer: endpoint(composerHost, neoPort, neoBaseUrl),
			// The command API lives on the composer host at the dedicated composer port, no base URL.
			composerApi: endpoint(composerHost, composerPort, ''),
			npgfx: endpoint(str(config, `np_${i}_npgfx`), num(config, `np_${i}_npgfx_port`), ''),
			vindral: endpoint(str(config, `np_${i}_vindral`), neoPort, neoBaseUrl),
			channelIds: {
				pgm: str(config, `np_${i}_channel_id_pgm`),
				mv: str(config, `np_${i}_channel_id_mv`),
				ubur: str(config, `np_${i}_channel_id_ubur`),
				mcr: str(config, `np_${i}_channel_id_mcr`),
			},
			neocomProdId: str(config, `np_${i}_neocom_prod_id`),
			cgPort: num(config, `np_${i}_cg_port`),
			mcrSrtUrl: str(config, `np_${i}_mcr_srt_url`),
			mcrSrtUrlBackup: str(config, `np_${i}_mcr_srt_url_backup`),
		})
	}

	return { general, npp, np }
}
