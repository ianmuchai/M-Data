import { rm } from 'node:fs/promises';

const paths = ['dist', 'backend.log', 'backend.err.log', 'frontend.log', 'frontend.err.log'];

await Promise.all(
  paths.map((path) =>
    rm(path, { force: true, recursive: true }).catch((error) => {
      console.warn(`Could not remove ${path}: ${error.message}`);
    }),
  ),
);
