/* eslint
    no-console:"off",
*/
import * as fs from "fs"
import glob from "glob"
import * as path from "path"
import { ISocketServer } from "./ISocketServer"

type NodeID = {
    dir: string
    base: string
    type:
    | ["dir", {
        globalID: string
    }]
    | ["file"]
}

export class PushFileSystem {
    private readonly io: ISocketServer
    private readonly datadir: string
    private readonly resolvedDataDir: string
    private readonly datadirglob: string
    constructor(io: ISocketServer, datadir: string) {
        this.io = io
        this.datadir = datadir
        this.resolvedDataDir = path.resolve(this.datadir)

        this.datadirglob = this.resolvedDataDir + "/**"
    }

    private getNodes(callback: (nodes: string[]) => void) {

        glob(this.datadirglob, { mark: true }, (err, rawNodes) => {
            if (err) {
                console.error(err)
                return
            }
            console.log("raw nodes")
            console.log(rawNodes)
            const first = rawNodes[0]
            if (path.relative(this.datadir, first) !== "") {
                console.log(first)
                console.log(this.resolvedDataDir)
                throw new Error("expected the first entry to be the root")
            }
            callback(rawNodes
                .slice(1, rawNodes.length)
                .map(rm => {
                    if (!rm.startsWith(first)) {
                        throw new Error("entry does not start with expected root")
                    }
                    return rm.substring(first.length)
                })
                .sort((a, b) => {
                    return a.localeCompare(b)
                })
            )
        })
    }

    private reportFile(change: string, node: string) {
        this.io.emit(change, JSON.stringify(this.parsePath(node)))
        console.error('file:', change, node, this.parsePath(node))
    }

    private parsePath(nodePath: string): NodeID {
        const parsed = path.parse(nodePath)
        return {
            dir: parsed.dir,
            base: parsed.base,
            type: nodePath.endsWith("/")
                ? ["dir", {
                    globalID: nodePath.substr(0, nodePath.length - 1), //strip the trailing slash
                }]
                : ["file"],
        }
    }
    public pushFileSystem() {


        this.getNodes(nodes => {

            let currentNodes = nodes

            console.log("current nodes")
            console.log(currentNodes)

            this.io.onConnection(socket => {
                socket.emit("initial-directory-structure", JSON.stringify(currentNodes.map(cm => this.parsePath(cm))))
            })

            fs.watch(this.resolvedDataDir, { persistent: true, recursive: true }, () => {
                this.getNodes(newNodes => {
                    let i = 0
                    let j = 0
                    while (true) {
                        if (i === currentNodes.length && j === newNodes.length) {
                            break
                        }
                        if (i === currentNodes.length) {
                            //no more current nodes
                            this.reportFile('added', newNodes[j])
                            j++
                        } else if (j === newNodes.length) {
                            //no more new nodes
                            this.reportFile('removed', currentNodes[i])
                            i++
                        } else {
                            if (newNodes[j] < currentNodes[i]) {
                                this.reportFile('added', newNodes[j])
                                j++
                            } else if (newNodes[j] > currentNodes[i]) {
                                this.reportFile('removed', currentNodes[i])
                                i++
                            } else {
                                i++
                                j++
                            }
                        }
                    }
                    currentNodes = newNodes
                })
            })
        })
    }
}