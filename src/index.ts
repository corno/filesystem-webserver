/* eslint
    no-console:"off",
*/
import express from "express"
import * as http from "http"
import * as path from "path"
import socketio from "socket.io"
import { HandleCommands, ISocketServer, PushFileSystem } from "./fileSystem"

export function startWebserver(port: number) {

    const app = express()
    const httpServer = http.createServer(app)
    const io = socketio(httpServer)

    const [node, script, staticdir, datadir] = process.argv

    if (staticdir === undefined) {
        console.error(`format: ${node} ${script}, <staticdir> <datadir>`)
        process.exit(1)
    }

    if (datadir === undefined) {
        console.error(`format: ${node} ${script}, <staticdir> <datadir>`)
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

    function addDir(prefix: string, dir: string) {
        app.get(`/${prefix}/*`, (req, res) => {
            const normalizedURL = path.normalize(req.url.substr(`/${prefix}`.length))
            if (normalizedURL.startsWith("..")) {
                res.statusCode = 403
                res.sendFile(path.resolve('notAllowed.html'))
            } else {
                res.sendFile(path.resolve(path.join(dir, decodeURIComponent(normalizedURL))))
            }
        })
    }

    addDir("data", path.resolve(datadir))
    addDir("static", path.resolve(staticdir))

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
