/* eslint
    no-console:"off",
*/
import express from "express"
import * as fs from "fs"
import * as http from "http"
import * as url from "url"
import * as path from "path"
import socketio from "socket.io"
import { HandleCommands, ISocketServer, PushFileSystem } from "./fileSystem"
import { makeHTTPrequest } from "./makeHTTPrequest"

function directoryExists(dirPath: string) {
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()
}

export function startWebserver(port: number) {

    const app = express()
    const httpServer = http.createServer(app)
    const io = socketio(httpServer)

    const [node, script, staticdir, datadir] = process.argv

    if (staticdir === undefined) {
        console.error(`format: ${node} ${script}, <staticdir> <datadir>`)
        process.exit(1)
    }
    if (!directoryExists(staticdir)) {
        console.error(`static directory ${staticdir} does not exist`)
        process.exit(1)
    }

    if (datadir === undefined) {
        console.error(`format: ${node} ${script}, <staticdir> <datadir>`)
        process.exit(1)
    }
    if (!directoryExists(datadir)) {
        console.error(`data directory ${datadir} does not exist`)
        process.exit(1)
    }

    app.get("/", (_req, res) => {
        res.redirect("/static/index.html")
    })
    app.get("/index.html", (_req, res) => {
        res.redirect("/static/index.html")
    })
    app.get("/favicon.ico", (_req, res) => {
        res.redirect("/static/favicon.ico")
    })

    function addAppGet(
        prefix: string,
        callback: (
            res: express.Response,
            normalizedURL: string
        ) => void,
    ) {
        const prefixWithSlashes = `/${prefix}/`
        app.get(`${prefixWithSlashes}*`, (req, res) => {
            const normalizedURL = path.normalize(req.url.substr(`${prefixWithSlashes}`.length))
            callback(res, normalizedURL)
        })
    }

    function addDir(prefix: string, dir: string) {
        addAppGet(
            prefix,
            (res, normalizedURL) => {
                if (normalizedURL.startsWith("..")) {
                    res.statusCode = 403
                    res.sendFile(path.resolve('notAllowed.html'))
                } else {
                    res.sendFile(path.resolve(path.join(dir, decodeURIComponent(normalizedURL))))
                }
            }
        )
    }

    addDir("data", path.resolve(datadir))
    addDir("static", path.resolve(staticdir))

    addAppGet(
        "http",
        (res, normalizedURL) => {
            const parsedURL = url.parse("http://" + normalizedURL)
            console.log(normalizedURL)
            console.log(parsedURL.host, parsedURL.path)
            makeHTTPrequest({
                host: parsedURL.host,
                path: parsedURL.path,
            }).handleUnsafePromise(
                _error => {
                    res.statusCode = 404
                    res.sendFile(path.resolve('urlNotFound.html'))
                },
                stream => {
                    let allData = ""
                    stream.processStream(
                        null,
                        data => {
                            allData += data
                        },
                        () => {
                            console.log("SENDING")
                            res.send(allData)
                        }
                    )
                }
            )
        }
    )

    httpServer.listen(port, () => {
        console.log('listening on *:' + port)
    })

    const ioWrapper: ISocketServer = {
        emit: (event, data) => {
            io.emit(event, data)
        },
        onConnection: callback => {
            io.on("connection", s => {
                callback(s)
            })
        },
    }

    new HandleCommands(ioWrapper, datadir).handleCommands()
    new PushFileSystem(ioWrapper, datadir).pushFileSystem()
}
