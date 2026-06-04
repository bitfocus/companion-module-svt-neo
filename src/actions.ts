import type { ModuleInstance } from './main.js'
import {
	novaWindowLoadNeocom,
	vindralGetChannels,
	windowCreate,
	windowDelete,
	windowLoadUrl,
	wolfpackSelector,
	type WindowService,
} from './http.js'
import { buildComposerActions } from './composerActions.js'

// Target dropdown shared by the window-manager actions: control the Nova or Neo endpoint.
const TARGET_CHOICES = [
	{ id: 'nova', label: 'Nova' },
	{ id: 'neo', label: 'Neo' },
] as const

function toService(value: unknown): WindowService {
	return value === 'neo' ? 'neo' : 'nova'
}

export function UpdateActions(self: ModuleInstance): void {
	const model = self.getModel()

	// NP dropdown choices derived from the configured NP count (NP01, NP02, ...).
	const npChoices = model.np.map((unit) => ({ id: unit.index, label: unit.svtLabel }))
	const npChoicesSafe = npChoices.length > 0 ? npChoices : [{ id: 1, label: 'NP01' }]
	const npDefault = npChoicesSafe[0].id

	// NPP dropdown choices derived from the configured NPP count (NPP01, NPP02, ...).
	const nppChoices = model.npp.map((unit) => ({ id: unit.index, label: `NPP${String(unit.index).padStart(2, '0')}` }))
	const nppChoicesSafe = nppChoices.length > 0 ? nppChoices : [{ id: 1, label: 'NPP01' }]

	self.setActionDefinitions({
		dummy_np: {
			name: 'Dummy NP Action',
			options: [
				{
					id: 'np',
					type: 'dropdown',
					label: 'NP',
					default: npChoicesSafe[0].id,
					choices: npChoicesSafe,
				},
			],
			callback: async () => {
				// Intentionally does nothing.
			},
		},
		dummy_npp: {
			name: 'Dummy NPP Action',
			options: [
				{
					id: 'npp',
					type: 'dropdown',
					label: 'NPP',
					default: nppChoicesSafe[0].id,
					choices: nppChoicesSafe,
				},
			],
			callback: async () => {
				// Intentionally does nothing.
			},
		},
		wolfpack: {
			name: 'Wolfpack',
			options: [
				{
					id: 'npp',
					type: 'number',
					label: 'NPP',
					default: 1,
					min: 1,
					max: 200,
				},
				{
					id: 'np',
					type: 'dropdown',
					label: 'NP',
					default: npDefault,
					choices: npChoicesSafe,
				},
			],
			callback: async (event) => {
				const nppIndex = Number(event.options.npp)
				const npIndex = Number(event.options.np)
				await wolfpackSelector(self, nppIndex, npIndex)
			},
		},
		nova_window_load_neocom: {
			name: 'Nova Window Load Neocom',
			options: [
				{
					id: 'npp',
					type: 'number',
					label: 'NPP',
					default: 1,
					min: 1,
					max: 200,
				},
				{
					id: 'window',
					type: 'number',
					label: 'Window',
					default: 0,
					min: 0,
					max: 100,
				},
				{
					id: 'np',
					type: 'dropdown',
					label: 'NP',
					default: npDefault,
					choices: npChoicesSafe,
				},
			],
			callback: async (event) => {
				const nppIndex = Number(event.options.npp)
				const npIndex = Number(event.options.np)
				const window = Number(event.options.window)
				await novaWindowLoadNeocom(self, nppIndex, npIndex, window)
			},
		},
		window_delete: {
			name: 'Window Delete',
			options: [
				{
					id: 'target',
					type: 'dropdown',
					label: 'Target',
					default: 'nova',
					choices: [...TARGET_CHOICES],
				},
				{
					id: 'npp',
					type: 'number',
					label: 'NPP',
					default: 1,
					min: 1,
					max: 200,
				},
				{
					id: 'window',
					type: 'number',
					label: 'Window',
					default: 0,
					min: 0,
					max: 100,
				},
			],
			callback: async (event) => {
				const service = toService(event.options.target)
				const nppIndex = Number(event.options.npp)
				const window = Number(event.options.window)
				await windowDelete(self, service, nppIndex, window)
			},
		},
		window_create: {
			name: 'Window Create',
			options: [
				{
					id: 'target',
					type: 'dropdown',
					label: 'Target',
					default: 'nova',
					choices: [...TARGET_CHOICES],
				},
				{
					id: 'npp',
					type: 'number',
					label: 'NPP',
					default: 1,
					min: 1,
					max: 200,
				},
				{
					id: 'display',
					type: 'number',
					label: 'Display',
					default: 0,
					min: 0,
					max: 64,
				},
				{
					id: 'x',
					type: 'number',
					label: 'X',
					default: 1920,
					min: -100000,
					max: 100000,
				},
				{
					id: 'y',
					type: 'number',
					label: 'Y',
					default: 0,
					min: -100000,
					max: 100000,
				},
				{
					id: 'width',
					type: 'number',
					label: 'Width',
					default: 1920,
					min: 0,
					max: 100000,
				},
				{
					id: 'height',
					type: 'number',
					label: 'Height',
					default: 1080,
					min: 0,
					max: 100000,
				},
				{
					id: 'fullscreenMode',
					type: 'textinput',
					label: 'Fullscreen Mode',
					default: 'none',
				},
			],
			callback: async (event) => {
				const service = toService(event.options.target)
				const nppIndex = Number(event.options.npp)
				await windowCreate(self, service, nppIndex, {
					display: Number(event.options.display),
					x: Number(event.options.x),
					y: Number(event.options.y),
					width: Number(event.options.width),
					height: Number(event.options.height),
					fullscreenMode: String(event.options.fullscreenMode ?? 'none'),
				})
			},
		},
		window_load_url: {
			name: 'Window Load URL',
			options: [
				{
					id: 'target',
					type: 'dropdown',
					label: 'Target',
					default: 'nova',
					choices: [...TARGET_CHOICES],
				},
				{
					id: 'npp',
					type: 'number',
					label: 'NPP',
					default: 1,
					min: 1,
					max: 200,
				},
				{
					id: 'window',
					type: 'number',
					label: 'Window',
					default: 0,
					min: 0,
					max: 100,
				},
				{
					id: 'url',
					type: 'textinput',
					label: 'URL',
					default: '',
				},
			],
			callback: async (event) => {
				const service = toService(event.options.target)
				const nppIndex = Number(event.options.npp)
				const window = Number(event.options.window)
				const url = String(event.options.url ?? '')
				await windowLoadUrl(self, service, nppIndex, window, url)
			},
		},
		vindral_get_channels: {
			name: 'Vindral: Get Channels',
			options: [
				{
					id: 'take',
					type: 'number',
					label: 'Take (max channels)',
					default: 300,
					min: 1,
					max: 100000,
				},
			],
			callback: async (event) => {
				await vindralGetChannels(self, Number(event.options.take))
			},
		},
		...buildComposerActions(self, npChoicesSafe, npDefault),
	})
}
