import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
})

export default [
	// Standalone dev-only helper scripts, run via `node --experimental-strip-types`,
	// are intentionally outside the build tsconfig, so exclude them from linting.
	{ ignores: ['testserver/**'] },
	...baseConfig,
]
