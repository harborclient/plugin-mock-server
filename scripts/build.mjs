import { buildRenderer } from '@harborclient/sdk/build';

await buildRenderer({
  jsxRuntime: 'automatic',
  watch: process.argv.includes('--watch')
});
