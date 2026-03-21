/* global console, process */
import { context, build } from 'esbuild';
import { revisionAssets } from './revision-assets.mjs';

const watchMode = process.argv.includes('--watch');

const baseConfig = {
  absWorkingDir: process.cwd(),
  entryPoints: ['app.jsx'],
  bundle: true,
  format: 'esm',
  outfile: './dist/app.js',
  logLevel: 'info',
};

async function runBuild() {
  await build({
    ...baseConfig,
    minify: true,
  });

  const version = await revisionAssets();
  console.log(`Build complete. Asset version ${version}`);
}

async function runWatch() {
  const ctx = await context({
    ...baseConfig,
    sourcemap: true,
    plugins: [
      {
        name: 'revision-assets',
        setup(buildApi) {
          buildApi.onEnd(async (result) => {
            if (result.errors.length > 0) {
              return;
            }

            try {
              const version = await revisionAssets();
              console.log(`Watch rebuild complete. Asset version ${version}`);
            } catch (error) {
              console.error(error);
            }
          });
        },
      },
    ],
  });

  await ctx.watch();
  console.log('Watching for changes...');
}

try {
  if (watchMode) {
    await runWatch();
  } else {
    await runBuild();
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
