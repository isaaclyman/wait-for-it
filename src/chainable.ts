import IWhenable from "./iwhenable";

export class Chainable implements IWhenable {
  _internalPromise: Promise<null>
  _internalResolve: () => void
  _internalReject: () => void

  constructor (fns?: null | Array<(...args: Array<any>) => PromiseLike<any>>) {

  }

  _done(callback: (error: any) => any): void {
    throw new Error("Method not implemented.");
  }
}
