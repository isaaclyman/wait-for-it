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

    this._internalPromise = this.queueNext()
  }

  push(...fns: Array<ChainableElement>): void {
    if (!fns) {
      return
    }

    if (!this.queue.length) {
      this.queue.push(...fns)
      this._internalPromise = this.queueNext()
    }
  }

  _done(callback: (error: any) => any): void {
    throw new Error('Method not implemented.')
  }

  private queueNext(): Promise<any> {
    if (!this.queue.length) {
      this.completeChainable()
      return Promise.resolve()
    }

    const firstFn = this.queue.shift()
    const firstResult = firstFn()

    const promiseResult = <PromiseLike<any>>firstResult
    const whenableResult = <IWhenable>firstResult
    if (promiseResult.then) {
      return new Promise((resolve, reject) => {
        promiseResult.then(
          () => resolve(this.queueNext()),
          err => {
            if (this.behavior === Behavior.FAIL_FAST) {
              reject(this.completeChainable(err))
              return
            }

            resolve(this.queueNext())
          }
        )
      })
    }

    if (whenableResult._done) {
      return new Promise((resolve, reject) => {
        whenableResult._done(err => {
          if (err && this.behavior === Behavior.FAIL_FAST) {
            reject(this.completeChainable(err))
            return
          }

          resolve(this.queueNext())
        })
      })
    }

    throw new Error(`Only Promise-likes, Whenables, Whatables and Chainables may be returned by a Chainable function.
      Invalid function: ${firstFn}`)
  }

  private completeChainable(err?: any): void {}
}
