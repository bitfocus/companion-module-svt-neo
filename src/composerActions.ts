import type { CompanionActionDefinitions, DropdownChoice, SomeCompanionActionInputField } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { composerRaw, composerScript, composerTrigger } from './http.js'

// Inputs selectable for cut/preview/pip. The long tail (custom sources) is covered by the raw action.
const INPUT_CHOICES: DropdownChoice[] = [
	{ id: 'in1', label: 'IN1' },
	{ id: 'in2', label: 'IN2' },
	{ id: 'in3', label: 'IN3' },
	{ id: 'in4', label: 'IN4' },
	{ id: 'in5', label: 'IN5' },
	{ id: 'in6', label: 'IN6' },
	{ id: 'vs1', label: 'VS1' },
	{ id: 'vs2', label: 'VS2' },
	{ id: 'fs1', label: 'FS1 (Fullscreen)' },
]

const ON_OFF_CHOICES: DropdownChoice[] = [
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
]

const UP_DOWN_CHOICES: DropdownChoice[] = [
	{ id: 'up', label: 'Up' },
	{ id: 'down', label: 'Down' },
]

// Default external graphics-template URL for the second CG channel (cg2url). The `results` and
// `action` query parameters are appended by the action callback.
const CG2_DEFAULT_TEMPLATE_URL =
	'https://applications.svt.se/duo-engage-graphics-templates/algvandringen/audience-poll/index.html?projectid=e8fc9992-d9a6-463f-9771-ce9e3ca0d2d2'

// NP selector as a number input. Enter the NP number directly: 1 means NP01, 2 means NP02, etc.
// (not zero-padded).
function npNumberOption(): SomeCompanionActionInputField {
	return {
		id: 'np',
		type: 'number',
		label: 'NP (1 = NP01)',
		default: 1,
		min: 1,
		max: 200,
	}
}

// NP selector as a dropdown, limited to the configured NP units.
function npDropdownOption(choices: DropdownChoice[], def: string | number): SomeCompanionActionInputField {
	return {
		id: 'np',
		type: 'dropdown',
		label: 'NP',
		default: def,
		choices,
	}
}

// Build the full set of composer actions, using the supplied factory for the NP selector option.
function buildComposerActionSet(
	self: ModuleInstance,
	np: () => SomeCompanionActionInputField,
): CompanionActionDefinitions {
	return {
		composer_transition: {
			name: 'Composer: Transition',
			options: [
				np(),
				{
					id: 'transition',
					type: 'dropdown',
					label: 'Transition',
					default: 'mix',
					choices: [
						{ id: 'mix', label: 'Mix' },
						{ id: 'cut', label: 'Cut' },
						{ id: 'ftb', label: 'Fade to black' },
					],
				},
			],
			callback: async (event) => {
				await composerTrigger(
					self,
					Number(event.options.np),
					String(event.options.transition),
					undefined,
					'Composer Transition',
				)
			},
		},
		composer_cut_to_input: {
			name: 'Composer: Cut To Input',
			options: [np(), { id: 'input', type: 'dropdown', label: 'Input', default: 'in1', choices: INPUT_CHOICES }],
			callback: async (event) => {
				await composerTrigger(
					self,
					Number(event.options.np),
					'cutto',
					{ input: String(event.options.input) },
					'Composer Cut To Input',
				)
			},
		},
		composer_preview_input: {
			name: 'Composer: Preview Input',
			options: [np(), { id: 'input', type: 'dropdown', label: 'Input', default: 'in1', choices: INPUT_CHOICES }],
			callback: async (event) => {
				await composerTrigger(
					self,
					Number(event.options.np),
					'pvw',
					{ input: String(event.options.input) },
					'Composer Preview Input',
				)
			},
		},
		composer_fade_input: {
			name: 'Composer: Fade Input',
			options: [
				np(),
				{ id: 'input', type: 'number', label: 'Input number', default: 1, min: 1, max: 6 },
				{ id: 'direction', type: 'dropdown', label: 'Direction', default: 'up', choices: UP_DOWN_CHOICES },
			],
			callback: async (event) => {
				const name = `fadein${Number(event.options.input)}${String(event.options.direction)}`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer Fade Input')
			},
		},
		composer_fade_vs: {
			name: 'Composer: Fade VS',
			options: [
				np(),
				{ id: 'vs', type: 'number', label: 'VS number', default: 1, min: 1, max: 3 },
				{ id: 'direction', type: 'dropdown', label: 'Direction', default: 'up', choices: UP_DOWN_CHOICES },
			],
			callback: async (event) => {
				const name = `fadevs${Number(event.options.vs)}${String(event.options.direction)}`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer Fade VS')
			},
		},
		composer_vs_ur: {
			name: 'Composer: VS UR',
			options: [
				np(),
				{ id: 'vs', type: 'number', label: 'VS number', default: 1, min: 1, max: 3 },
				{ id: 'state', type: 'dropdown', label: 'State', default: 'on', choices: ON_OFF_CHOICES },
			],
			callback: async (event) => {
				const name = `vs${Number(event.options.vs)}ur${String(event.options.state)}`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer VS UR')
			},
		},
		composer_vs_loop: {
			name: 'Composer: VS Loop',
			options: [
				np(),
				{ id: 'vs', type: 'number', label: 'VS number', default: 2, min: 1, max: 3 },
				{ id: 'state', type: 'dropdown', label: 'State', default: 'on', choices: ON_OFF_CHOICES },
			],
			callback: async (event) => {
				const name = `vs${Number(event.options.vs)}loop${String(event.options.state)}`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer VS Loop')
			},
		},
		composer_load_vs_clip: {
			name: 'Composer: Load VS Clip',
			options: [
				np(),
				{ id: 'vs', type: 'number', label: 'VS number', default: 2, min: 1, max: 3 },
				{ id: 'clip', type: 'textinput', label: 'Clip', default: 'amafiles/' },
			],
			callback: async (event) => {
				const name = `vs${Number(event.options.vs)}`
				await composerTrigger(
					self,
					Number(event.options.np),
					name,
					{ video: String(event.options.clip ?? '') },
					'Composer Load VS Clip',
				)
			},
		},
		composer_keyer: {
			name: 'Composer: Keyer',
			options: [
				np(),
				{
					id: 'keyer',
					type: 'dropdown',
					label: 'Keyer',
					default: 'ov',
					choices: [
						{ id: 'ov', label: 'Overlay (ov)' },
						{ id: 'cg', label: 'CG' },
					],
				},
			],
			callback: async (event) => {
				const name = `${String(event.options.keyer)}key`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer Keyer')
			},
		},
		composer_keyer_toggle: {
			name: 'Composer: Keyer On/Off',
			options: [
				np(),
				{ id: 'keyer', type: 'number', label: 'Keyer number', default: 1, min: 1, max: 99 },
				{ id: 'state', type: 'dropdown', label: 'State', default: 'on', choices: ON_OFF_CHOICES },
			],
			callback: async (event) => {
				const name = `key${Number(event.options.keyer)}${String(event.options.state)}`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer Keyer On/Off')
			},
		},
		composer_kom: {
			name: 'Composer: Kom',
			options: [
				np(),
				{ id: 'direction', type: 'dropdown', label: 'Direction', default: 'up', choices: UP_DOWN_CHOICES },
			],
			callback: async (event) => {
				const name = event.options.direction === 'down' ? 'komDown' : 'komUp'
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer Kom')
			},
		},
		composer_delay: {
			name: 'Composer: Delay',
			options: [
				np(),
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: async (event) => {
				const name = `delay${String(event.options.state)}`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer Delay')
			},
		},
		composer_lufs: {
			name: 'Composer: LUFS Start/Stop',
			options: [
				np(),
				{
					id: 'action',
					type: 'dropdown',
					label: 'Action',
					default: 'start',
					choices: [
						{ id: 'start', label: 'Start' },
						{ id: 'stop', label: 'Stop' },
					],
				},
			],
			callback: async (event) => {
				const fn = event.options.action === 'stop' ? 'stopLufs' : 'startLufs'
				await composerScript(self, Number(event.options.np), fn, undefined, 'Composer LUFS')
			},
		},
		composer_pip_input: {
			name: 'Composer: PIP Input',
			options: [
				np(),
				{ id: 'slot', type: 'number', label: 'PIP slot', default: 1, min: 1, max: 3 },
				{ id: 'input', type: 'dropdown', label: 'Input', default: 'in1', choices: INPUT_CHOICES },
			],
			callback: async (event) => {
				const slot = Number(event.options.slot)
				await composerTrigger(
					self,
					Number(event.options.np),
					'pip-input',
					{ [`input${slot}`]: String(event.options.input) },
					'Composer PIP Input',
				)
			},
		},
		composer_pip_select: {
			name: 'Composer: PIP Select',
			options: [
				np(),
				{
					id: 'pip',
					type: 'dropdown',
					label: 'PIP',
					default: 'PIP',
					choices: [
						{ id: 'PIP', label: 'PIP' },
						{ id: 'PIP2', label: 'PIP2' },
					],
				},
			],
			callback: async (event) => {
				await composerTrigger(
					self,
					Number(event.options.np),
					'pip-select',
					{ input: String(event.options.pip) },
					'Composer PIP Select',
				)
			},
		},
		composer_set_pip_source: {
			name: 'Composer: Set PIP Source',
			options: [
				np(),
				{ id: 'pip', type: 'number', label: 'PIP slot', default: 1, min: 1, max: 7 },
				{ id: 'source', type: 'textinput', label: 'Source', default: '' },
			],
			callback: async (event) => {
				const pip = Number(event.options.pip)
				const source = String(event.options.source ?? '')
				const parameter = `scene=pip&pip=pip${pip}&source=${source}`
				await composerScript(self, Number(event.options.np), 'setPipSource', parameter, 'Composer Set PIP Source')
			},
		},
		composer_set_pip_position: {
			name: 'Composer: Set PIP Position',
			options: [
				np(),
				{ id: 'pip', type: 'number', label: 'PIP slot', default: 1, min: 1, max: 7 },
				{ id: 'x', type: 'number', label: 'X', default: 0, min: -100000, max: 100000 },
				{ id: 'y', type: 'number', label: 'Y', default: 0, min: -100000, max: 100000 },
			],
			callback: async (event) => {
				const pip = Number(event.options.pip)
				const x = Number(event.options.x)
				const y = Number(event.options.y)
				const parameter = `pip=pip${pip}&scene=pip&x=${x}&y=${y}`
				await composerScript(self, Number(event.options.np), 'setPipPosition', parameter, 'Composer Set PIP Position')
			},
		},
		composer_set_pip_visible: {
			name: 'Composer: Set PIP Visible',
			options: [
				np(),
				{ id: 'pip', type: 'number', label: 'PIP slot', default: 1, min: 1, max: 7 },
				{
					id: 'visible',
					type: 'dropdown',
					label: 'Visible',
					default: 'true',
					choices: [
						{ id: 'true', label: 'Visible' },
						{ id: 'false', label: 'Hidden' },
					],
				},
			],
			callback: async (event) => {
				const pip = Number(event.options.pip)
				const visible = String(event.options.visible)
				const parameter = `pip=pip${pip}&scene=pip&visible=${visible}`
				await composerScript(
					self,
					Number(event.options.np),
					'setPipSourceVisible',
					parameter,
					'Composer Set PIP Visible',
				)
			},
		},
		composer_stop_input: {
			name: 'Composer: Stop Input',
			options: [np(), { id: 'input', type: 'number', label: 'Input number', default: 1, min: 1, max: 6 }],
			callback: async (event) => {
				const name = `in${Number(event.options.input)}stop`
				await composerTrigger(self, Number(event.options.np), name, undefined, 'Composer Stop Input')
			},
		},
		composer_stream: {
			name: 'Composer: Stream Start/Stop',
			options: [
				np(),
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					default: 'pgm',
					choices: [
						{ id: 'pgm', label: 'PGM' },
						{ id: 'mv', label: 'MV' },
						{ id: 'ubur', label: 'UBUR' },
					],
				},
				{
					id: 'action',
					type: 'dropdown',
					label: 'Action',
					default: 'start',
					choices: [
						{ id: 'start', label: 'Start' },
						{ id: 'stop', label: 'Stop' },
					],
				},
			],
			callback: async (event) => {
				const npIndex = Number(event.options.np)
				const channel = String(event.options.channel) as 'pgm' | 'mv' | 'ubur'
				const action = String(event.options.action)
				if (action === 'stop') {
					await composerTrigger(self, npIndex, `stop${channel}`, undefined, 'Composer Stream Stop')
					return
				}
				const model = self.getModel()
				const unit = model.np[npIndex - 1]
				if (!unit) {
					self.log('warn', `Composer Stream: NP ${npIndex} is not configured`)
					return
				}
				const key = unit.channelIds[channel]
				const link = `${model.general.rtmpBasePrimary}${key}`
				const link2 = `${model.general.rtmpBaseBackup}${key}`
				await composerTrigger(self, npIndex, `start${channel}`, { link, link2 }, 'Composer Stream Start')
			},
		},
		composer_mcr_srt: {
			name: 'Composer: MCR SRT Start/Stop',
			options: [
				np(),
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					default: 'main',
					choices: [
						{ id: 'main', label: 'Main' },
						{ id: 'backup', label: 'Backup' },
					],
				},
				{
					id: 'action',
					type: 'dropdown',
					label: 'Action',
					default: 'start',
					choices: [
						{ id: 'start', label: 'Start' },
						{ id: 'stop', label: 'Stop' },
					],
				},
			],
			callback: async (event) => {
				const npIndex = Number(event.options.np)
				const backup = event.options.source === 'backup'
				const action = String(event.options.action)
				if (action === 'stop') {
					await composerTrigger(
						self,
						npIndex,
						backup ? 'stopmcrsrtbackup' : 'stopmcrsrt',
						undefined,
						'Composer MCR SRT Stop',
					)
					return
				}
				const model = self.getModel()
				const unit = model.np[npIndex - 1]
				if (!unit) {
					self.log('warn', `Composer MCR SRT: NP ${npIndex} is not configured`)
					return
				}
				const url = backup ? unit.mcrSrtUrlBackup : unit.mcrSrtUrl
				await composerTrigger(
					self,
					npIndex,
					backup ? 'startmcrsrtbackup' : 'startmcrsrt',
					{ url },
					'Composer MCR SRT Start',
				)
			},
		},
		composer_cg_url: {
			name: 'Composer: CG URL',
			options: [np()],
			callback: async (event) => {
				const npIndex = Number(event.options.np)
				const model = self.getModel()
				const unit = model.np[npIndex - 1]
				if (!unit) {
					self.log('warn', `Composer CG URL: NP ${npIndex} is not configured`)
					return
				}
				const cgUrl = `http://${model.general.cgHost}:${unit.cgPort}/?c=1`
				await composerTrigger(self, npIndex, 'cgurl', { url: cgUrl }, 'Composer CG URL')
			},
		},
		composer_cg2_url: {
			name: 'Composer: CG2 URL (graphics template)',
			options: [
				np(),
				{
					id: 'url',
					type: 'textinput',
					label: 'Template URL (without results/action)',
					default: CG2_DEFAULT_TEMPLATE_URL,
				},
				{
					id: 'results',
					type: 'dropdown',
					label: 'Results',
					default: 'false',
					choices: [
						{ id: 'true', label: 'True' },
						{ id: 'false', label: 'False' },
					],
				},
				{
					id: 'action',
					type: 'dropdown',
					label: 'Action',
					default: 'play',
					choices: [
						{ id: 'play', label: 'Play' },
						{ id: 'stop', label: 'Stop' },
					],
				},
			],
			callback: async (event) => {
				const base = String(event.options.url ?? '')
				const separator = base.includes('?') ? '&' : '?'
				const url = `${base}${separator}results=${String(event.options.results)}&action=${String(event.options.action)}`
				await composerTrigger(self, Number(event.options.np), 'cg2url', { url }, 'Composer CG2 URL')
			},
		},
		composer_init_production: {
			name: 'Composer: Init Production',
			options: [np()],
			callback: async (event) => {
				await composerTrigger(self, Number(event.options.np), 'initprod', undefined, 'Composer Init Production')
			},
		},
		composer_stop_srt_input: {
			name: 'Composer: Stop SRT Input (script)',
			options: [np(), { id: 'input', type: 'number', label: 'Input number', default: 1, min: 1, max: 6 }],
			callback: async (event) => {
				const parameter = `input=in${Number(event.options.input)}`
				await composerScript(self, Number(event.options.np), 'stopSrtInput', parameter, 'Composer Stop SRT Input')
			},
		},
		composer_command: {
			name: 'Composer: Command (raw)',
			options: [
				np(),
				{
					id: 'api',
					type: 'dropdown',
					label: 'API',
					default: 'trigger',
					choices: [
						{ id: 'trigger', label: 'Connector trigger (name=)' },
						{ id: 'script', label: 'Script engine (function=)' },
					],
				},
				{ id: 'command', type: 'textinput', label: 'Command', default: '' },
				{
					id: 'query',
					type: 'textinput',
					label: 'Extra query (e.g. &input=in1)',
					default: '',
				},
			],
			callback: async (event) => {
				const api = event.options.api === 'script' ? 'script' : 'trigger'
				await composerRaw(
					self,
					Number(event.options.np),
					api,
					String(event.options.command ?? ''),
					String(event.options.query ?? ''),
				)
			},
		},
	}
}

// Public entry: expose every composer action twice — once with a numeric NP input (the default,
// "1" = NP01) and once with an identical "(Dropdown NP)" variant whose NP selector is a dropdown
// limited to the configured NP units. The callbacks are identical; only the NP option differs.
export function buildComposerActions(
	self: ModuleInstance,
	npChoices: DropdownChoice[],
	npDefault: string | number,
): CompanionActionDefinitions {
	const numberSet = buildComposerActionSet(self, npNumberOption)
	const dropdownSet = buildComposerActionSet(self, () => npDropdownOption(npChoices, npDefault))

	const actions: CompanionActionDefinitions = { ...numberSet }
	for (const [id, def] of Object.entries(dropdownSet)) {
		if (!def) continue
		actions[`${id}_dropdown_np`] = { ...def, name: `${def.name} (Dropdown NP)` }
	}
	return actions
}
