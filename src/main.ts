import { createServeCommand } from '@cloudquery/plugin-sdk-javascript/plugin/serve';

import { newFilePlugin } from "./plugin.js"

const main = () => {
  createServeCommand(newFilePlugin()).parse();
};

main();
