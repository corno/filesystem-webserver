
export interface ISocket {
    on(event: string, callback: (data: string) => void): void
    emit(event: string, data: string): void
}

export interface ISocketServer {
    emit(event: string, data: string): void
    onConnection(callback: (socket: ISocket) => void): void
}