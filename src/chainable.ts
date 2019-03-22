import IWhenable from './iwhenable'
import Behavior from './behavior'

type ChainableElement = (...args: Array<any>) => PromiseLike<any> | IWhenable

export class Chainable implements IWhenable {
  _internalPromise: Promise<null>

  private internalResolve: () => void
  private internalReject: () => void
  private queue: Array<ChainableElement> = []

  constructor(
    fns?: null | Array<ChainableElement>,
    private behavior?: Behavior
  ) {
    if (!!fns && fns.length) {
      this.queue.push(...fns)
      this.queueNext()
    }

    this._internalPromise = new Promise((resolve, reject) => {
      this.internalResolve = () => resolve(null)
      this.internalReject = reject
    })
  }

  push(...fns: Array<ChainableElement>): void {
    if (!fns) {
      return
    }

    this.queue.push(...fns)
  }

  _done(callback: (error: any) => any): void {
    throw new Error('Method not implemented.')
  }

  private queueNext(): void {
    if (!this.queue.length) {
      this.completeChainable()
      return
    }

    const firstFn = this.queue.shift()
    const firstResult = firstFn()

    const promiseResult = <PromiseLike<any>>firstResult
    const whenableResult = <IWhenable>firstResult
    if (promiseResult.then) {
      promiseResult.then(
        () => this.queueNext(),
        err => {
          if (this.behavior === Behavior.FAIL_FAST) {
            this.completeChainable(err)
          }
        }
      )
      return
    }

    if (whenableResult._done) {
      whenableResult._done(err => {
        if (err && this.behavior === Behavior.FAIL_FAST) {
          this.completeChainable(err)
          return
        }

        this.queueNext()
      })
      return
    }

    throw new Error(`Only Promise-likes, Whenables, Whatables and Chainables may be returned by a Chainable function.
      Invalid function: ${firstFn}`)
  }

  private completeChainable(err?: any): void {}
}
