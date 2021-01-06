import * as fs from "fs"
import * as path from "path"
import { ISocketServer } from "./ISocketServer"

type NodePath = {
    dir: string
    base: string
}

type RenameData = {
    old: NodePath
    new: NodePath
}

type SaveData = {
    fullpath: string
    data: string
}


export class HandleCommands {
    socketServer: ISocketServer
    datadir: string
    constructor(io: ISocketServer, datadir: string) {
        this.socketServer = io
        this.datadir = datadir
    }
    public handleCommands(): void {

        this.socketServer.onConnection(socket => {
            socket.on('rename', msg => {
                const renameData: RenameData = JSON.parse(msg) //eslint-disable-line
                this.createPath(renameData.old, old => {
                    this.createPath(renameData.new, newP => {
                        fs.rename(old, newP, err => {
                            if (err) {
                                console.error(err)
                            }
                        })

                    })
                })
            })

            socket.on('save-file', msg => {
                const saveData: SaveData = JSON.parse(msg) //eslint-disable-line
                this.createPath2(saveData.fullpath, thePath => {
                    fs.writeFile(thePath, saveData.data, err => {
                        if (err) {
                            console.error("could not save file")
                        }
                    })
                })
            })

        })
    }
    private createPath2(np: string, callback: (pathString: string) => void) {
        const normalizedDir = path.normalize(np)
        if (normalizedDir.startsWith("..")) {
            console.error("path outside of context")
        }
        callback(path.join(this.datadir, np))
    }
    private createPath(np: NodePath, callback: (pathString: string) => void) {
        this.createPath2(path.join(np.dir, np.base), callback)
    }
}
