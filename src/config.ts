import { type SomeCompanionConfigField } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export interface ModuleConfig {
	nppCount: number
	npCount: number
	vindral_min_buffer: number
	vindral_max_buffer: number
	composer_port: number
	rtmp_base_primary: string
	rtmp_base_backup: string
	cg_host: string
	neocom_baseurl: string
	wingo_token: string
	// generative type template for the npp and np config fields
	[key: `npp_${number}_${'neo' | 'nova'}`]: string
	[key: `np_${number}_${'composer' | 'npgfx' | 'vindral'}`]: string
	[key: `np_${number}_npgfx_port`]: number
	[key: `np_${number}_channel_id_${'pgm' | 'mv' | 'ubur' | 'mcr'}`]: string
	[key: `np_${number}_neocom_prod_id`]: string
	[key: `np_${number}_cg_port`]: number
	[key: `np_${number}_mcr_srt_url`]: string
	[key: `np_${number}_mcr_srt_url_backup`]: string
}

export function GetConfigFields(config?: ModuleConfig): SomeCompanionConfigField[] {
	// `getConfigFields()` can be called before `init()` populates the config,
	// so fall back to an empty object and sensible counts when it's missing.
	const safeConfig = (config ?? {}) as ModuleConfig
	const nppCount = safeConfig.nppCount ?? 1
	const npCount = safeConfig.npCount ?? 1

	const configFields: SomeCompanionConfigField[] = [
		{
			id: `genconfig_label`,
			type: 'static-text',
			label: ``,
			value: `**General Configuration**`,
			width: 12,
		},
		{
			type: 'number',
			id: 'nppCount',
			label: 'NPP Count',
			width: 6,
			min: 1,
			max: 200,
			default: 1,
		},
		{
			type: 'number',
			id: 'npCount',
			label: 'NP Count',
			width: 6,
			min: 1,
			max: 200,
			default: 1,
		},

		{
			id: `genconfig_baseurl_label`,
			type: 'static-text',
			label: ``,
			value: `**Base URL Configuration**`,
			width: 12,
		},

		{
			id: 'satellite_baseurl',
			type: 'textinput',
			label: 'Satellite Base Path',
			width: 6,
			default: '/api/',
		},

		{
			id: 'neo_baseurl',
			type: 'textinput',
			label: 'NEO Base Path',
			width: 6,
			default: '/',
		},

		{
			id: 'wingo_baseurl',
			type: 'textinput',
			label: 'Wingo Base Path',
			width: 6,
			default: '/',
		},

		{
			id: 'nova_baseurl',
			type: 'textinput',
			label: 'Nova Base Path',
			width: 6,
			default: '/',
		},

		{
			id: 'neocom_baseurl',
			type: 'textinput',
			label: 'NeoCom Base URL',
			width: 12,
			default: 'https://com.meh.se/production-calls/production/',
		},

		{
			id: 'wingo_token',
			type: 'textinput',
			label: 'NOVA / Wingo API Bearer Token',
			width: 12,
			default: '',
		},

		{
			id: `genconfig_ports_label`,
			type: 'static-text',
			label: ``,
			value: `**Port Configuration**`,
			width: 12,
		},

		// Satellite Port:9999, NEO Port:3000, Wingo Port:8080

		{
			id: 'satellite_port',
			type: 'number',
			label: 'Satellite Port',
			width: 6,
			min: 1,
			max: 65535,
			default: 9999,
		},

		{
			id: 'neo_port',
			type: 'number',
			label: 'NEO Port',
			width: 6,
			min: 1,
			max: 65535,
			default: 3000,
		},

		{
			id: 'wingo_port',
			type: 'number',
			label: 'Wingo Port',
			width: 6,
			min: 1,
			max: 65535,
			default: 8080,
		},

		{
			id: 'nova_port',
			type: 'number',
			label: 'Nova Port',
			width: 6,
			min: 1,
			max: 65535,
			default: 3000,
		},

		{
			id: 'composer_port',
			type: 'number',
			label: 'Composer API Port',
			width: 6,
			min: 1,
			max: 65535,
			default: 44433,
		},

		{
			id: `genconfig_vindral_label`,
			type: 'static-text',
			label: ``,
			value: `**Vindral Configuration**`,
			width: 12,
		},

		{
			id: 'vindral_min_buffer',
			type: 'number',
			label: 'Vindral Min Buffer',
			width: 6,
			min: 0,
			max: 100000,
			default: 300,
		},

		{
			id: 'vindral_max_buffer',
			type: 'number',
			label: 'Vindral Max Buffer',
			width: 6,
			min: 0,
			max: 100000,
			default: 300,
		},

		{
			id: `genconfig_composer_label`,
			type: 'static-text',
			label: ``,
			value: `**Composer / Stream Configuration**`,
			width: 12,
		},

		{
			id: 'rtmp_base_primary',
			type: 'textinput',
			label: 'RTMP Primary Base',
			width: 12,
			default: 'rtmp://',
		},

		{
			id: 'rtmp_base_backup',
			type: 'textinput',
			label: 'RTMP Backup Base',
			width: 12,
			default: 'rtmp://',
		},

		{
			id: 'cg_host',
			type: 'textinput',
			label: 'CG Host',
			width: 12,
			default: 'vip-neo-itc-pr01',
		},
	]

	// For every NPP unit we have a NEO and NOVA config field
	for (let i = 1; i <= nppCount; i++) {
		configFields.push({
			id: `npp_${i}_label`,
			type: 'static-text',
			label: ``,
			value: `**NPP ${i}**`,
			width: 12,
		})

		configFields.push({
			type: 'textinput',
			id: `npp_${i}_neo`,
			label: `Neo ${i} host`,
			width: 8,
		})

		// nova controls wingo, neoplay, and a local companion
		configFields.push({
			type: 'textinput',
			id: `npp_${i}_nova`,
			label: `Nova ${i} host`,
			width: 8,
		})
	}

	// For every NP unit, we have Composer, NPGFX, and Vindral config fields
	for (let i = 1; i <= npCount; i++) {
		configFields.push({
			id: `np_${i}_label`,
			type: 'static-text',
			label: ``,
			value: `**NP ${i}**`,
			width: 12,
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_composer`,
			label: `Composer ${i} host`,
			width: 8,
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_npgfx`,
			label: `NPGFX ${i} host`,
			width: 8,
		})

		configFields.push({
			type: 'number',
			id: `np_${i}_npgfx_port`,
			label: `NPGFX ${i} port`,
			width: 4,
			min: 1,
			max: 65535,
			default: 5257,
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_vindral`,
			label: `Vindral ${i} host`,
			width: 8,
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_channel_id_pgm`,
			label: `Channel ID PGM ${i}`,
			width: 6,
			default: '',
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_channel_id_mv`,
			label: `Channel ID MV ${i}`,
			width: 6,
			default: '',
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_channel_id_ubur`,
			label: `Channel ID UBUR ${i}`,
			width: 6,
			default: '',
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_channel_id_mcr`,
			label: `Channel ID MCR ${i}`,
			width: 6,
			default: '',
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_neocom_prod_id`,
			label: `NeoCom Prod ID ${i}`,
			width: 6,
			default: '',
		})

		configFields.push({
			type: 'number',
			id: `np_${i}_cg_port`,
			label: `CG Port ${i}`,
			width: 6,
			min: 1,
			max: 65535,
			default: 8080,
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_mcr_srt_url`,
			label: `MCR SRT URL ${i}`,
			width: 12,
			default: '',
		})

		configFields.push({
			type: 'textinput',
			id: `np_${i}_mcr_srt_url_backup`,
			label: `MCR SRT URL Backup ${i}`,
			width: 12,
			default: '',
		})
	}

	// check if the current config value has a value, if not, set it to the default (both for numbers and textinputs)
	const configValues = safeConfig as unknown as Record<string, unknown>

	for (const field of configFields) {
		if (field.type === 'static-text') continue

		const currentValue = configValues[field.id]
		if (currentValue !== undefined && currentValue !== '') continue

		if ('default' in field && field.default !== undefined) {
			configValues[field.id] = field.default
		} else if (field.type === 'textinput') {
			configValues[field.id] = ''
		}

		console.log(`Setting ${field.id} to ${configValues[field.id]}`)
	}

	return [...configFields]
}

// Config keys whose values are sensitive and must never be written to the log verbatim.
const SENSITIVE_CONFIG_KEYS = new Set<string>(['wingo_token'])

// Render a config value for the log: empty values are made obvious and secrets are masked.
function formatConfigValue(key: string, value: unknown): string {
	if (value === undefined || value === '') return '(empty)'
	if (SENSITIVE_CONFIG_KEYS.has(key)) return '***redacted***'
	return JSON.stringify(value)
}

// Log one `info` line per config field that actually changed between the previous and new config,
// followed by a summary. Called from `configUpdated` so the operator gets a clear audit trail of
// what was edited in the configuration pane (with secrets redacted).
export function logConfigChanges(self: ModuleInstance, previous: ModuleConfig | undefined, next: ModuleConfig): void {
	const prev = (previous ?? {}) as unknown as Record<string, unknown>
	const curr = (next ?? {}) as unknown as Record<string, unknown>

	const keys = [...new Set<string>([...Object.keys(prev), ...Object.keys(curr)])].sort()
	let changes = 0

	for (const key of keys) {
		const before = prev[key]
		const after = curr[key]
		if (before === after) continue

		self.log(
			'info',
			`Config: "${key}" changed from ${formatConfigValue(key, before)} to ${formatConfigValue(key, after)}`,
		)
		changes++
	}

	self.log(
		'info',
		changes === 0
			? 'Config: saved with no value changes'
			: `Config: ${changes} setting${changes === 1 ? '' : 's'} updated`,
	)
}
