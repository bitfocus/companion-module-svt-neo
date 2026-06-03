import type { ModuleInstance } from './main.js'
import type { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import { buildModel, type ServiceEndpoint } from './model.js'

// Variable-ID presentation for an NPP service endpoint.
const NPP_SERVICE_KEYS = [
	{ key: 'neo', label: 'Neo' },
	{ key: 'nova', label: 'Nova' },
] as const

// Variable-ID presentation for an NP service endpoint. NPGFX additionally exposes
// a standalone port variable since its port is configured per-unit.
const NP_SERVICE_KEYS = [
	{ key: 'composer', label: 'Composer', perUnitPort: false },
	{ key: 'npgfx', label: 'NPGFX', perUnitPort: true },
	{ key: 'vindral', label: 'Vindral', perUnitPort: false },
] as const

const NP_CHANNEL_KEYS = [
	{ key: 'pgm', suffix: 'channel_id_pgm', label: 'Channel ID PGM' },
	{ key: 'mv', suffix: 'channel_id_mv', label: 'Channel ID MV' },
	{ key: 'ubur', suffix: 'channel_id_ubur', label: 'Channel ID UBUR' },
	{ key: 'mcr', suffix: 'channel_id_mcr', label: 'Channel ID MCR' },
] as const

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const model = buildModel(self.config)

	const definitions: CompanionVariableDefinition[] = []
	const values: CompanionVariableValues = {}

	const define = (variableId: string, name: string, value: string | number): void => {
		definitions.push({ variableId, name })
		values[variableId] = value
	}

	const defineEndpoint = (idPrefix: string, namePrefix: string, ep: ServiceEndpoint): void => {
		define(`${idPrefix}_host`, `${namePrefix} host`, ep.host)
		define(`${idPrefix}_hostport`, `${namePrefix} host:port`, ep.hostPort)
		define(`${idPrefix}_url`, `${namePrefix} URL`, ep.url)
	}

	// General config fields, exposed verbatim under their config IDs.
	const g = model.general
	define('nppCount', 'NPP Count', g.nppCount)
	define('npCount', 'NP Count', g.npCount)
	define('satellite_port', 'Satellite Port', g.satellitePort)
	define('neo_port', 'NEO Port', g.neoPort)
	define('wingo_port', 'Wingo Port', g.wingoPort)
	define('nova_port', 'Nova Port', g.novaPort)
	define('satellite_baseurl', 'Satellite Base URL', g.satelliteBaseUrl)
	define('neo_baseurl', 'NEO Base URL', g.neoBaseUrl)
	define('wingo_baseurl', 'Wingo Base URL', g.wingoBaseUrl)
	define('nova_baseurl', 'Nova Base URL', g.novaBaseUrl)
	define('vindral_min_buffer', 'Vindral Min Buffer', g.vindralMinBuffer)
	define('vindral_max_buffer', 'Vindral Max Buffer', g.vindralMaxBuffer)
	define('composer_port', 'Composer API Port', g.composerPort)
	define('rtmp_base_primary', 'RTMP Primary Base', g.rtmpBasePrimary)
	define('rtmp_base_backup', 'RTMP Backup Base', g.rtmpBaseBackup)
	define('cg_host', 'CG Host', g.cgHost)

	for (const unit of model.npp) {
		for (const service of NPP_SERVICE_KEYS) {
			const ep = unit[service.key]
			defineEndpoint(`npp${unit.index}_${service.key}`, `NPP ${unit.index} ${service.label}`, ep)
		}
	}

	for (const unit of model.np) {
		define(`np${unit.index}_svtLabel`, `NP ${unit.index} SVT Label`, unit.svtLabel)

		for (const service of NP_SERVICE_KEYS) {
			const ep = unit[service.key]
			if (service.perUnitPort) {
				define(`np${unit.index}_${service.key}_port`, `NP ${unit.index} ${service.label} port`, ep.port)
			}
			defineEndpoint(`np${unit.index}_${service.key}`, `NP ${unit.index} ${service.label}`, ep)
		}

		for (const field of NP_CHANNEL_KEYS) {
			define(`np${unit.index}_${field.suffix}`, `NP ${unit.index} ${field.label}`, unit.channelIds[field.key])
		}

		define(`np${unit.index}_neocom_prod_id`, `NP ${unit.index} NeoCom Prod ID`, unit.neocomProdId)
		define(`np${unit.index}_cg_port`, `NP ${unit.index} CG Port`, unit.cgPort)
		define(`np${unit.index}_mcr_srt_url`, `NP ${unit.index} MCR SRT URL`, unit.mcrSrtUrl)
		define(`np${unit.index}_mcr_srt_url_backup`, `NP ${unit.index} MCR SRT URL Backup`, unit.mcrSrtUrlBackup)
	}

	self.setVariableDefinitions(definitions)
	self.setVariableValues(values)
}
