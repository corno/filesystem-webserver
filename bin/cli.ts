#!/usr/bin/env node

/* eslint
    "no-new-wrappers": off
*/

import * as src from "../src"

const configuredPort = new Number(process.env.PORT).valueOf()

src.startWebserver(isNaN(configuredPort) ? 3000 : configuredPort)