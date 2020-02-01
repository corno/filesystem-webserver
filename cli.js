#!/usr/bin/env node

const startWebserver  = require("./dist/index.js").startWebserver

startWebserver(process.env.PORT || 3000)