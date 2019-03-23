import { Whatable } from './whatable'
import { Chainable } from './chainable'
import Behavior from './behavior'
import IWhenable from './iwhenable'

type WhenableElement = PromiseLike<any> | IWhenable

export class Whenable implements IWhenable {
  _internalPromise: Promise<null>

  private queue: Array<WhenableElement> = []
  private queueResults: Array<{ value: any; error: any }>
  private callbacks: Array<(error: any) => any> = []
  private internalResolve: () => void
  private internalReject: (errors: any[]) => void

  constructor(elements?: Array<WhenableElement>, private behavior?: Behavior) {
    if (Array.isArray(elements)) {
      this.queue.push(...elements)
      this.listenQueue(elements)
    }

    this._internalPromise = new Promise((resolve, reject) => {
      this.internalResolve = () => resolve(null)
      this.internalReject = reject
    })
  }

  push(...elements: Array<WhenableElement>): void {
    if (!elements) {
      return
    }

    this.queue.push(...elements)
    this.listenQueue(elements)
  }

  _done(callback: (errors: any) => any): void {
    this.callbacks.push(callback)
    this.checkImmediateCompletion()
  }

  private listenQueue(queue: Array<WhenableElement>): void {
    queue.forEach(element => {
      const promiseElement = <PromiseLike<any>>element
      const whenableElement = <IWhenable>element

      if (promiseElement.then) {
        promiseElement.then(
          result => this.pushResult(result, null),
          err => this.pushResult(null, err)
        )
        return
      } else if (whenableElement._done) {
        whenableElement._done(err => this.pushResult(null, err))
        return
      }

      throw new Error(`Only Promise-likes, Whenables, Whatables and Chainables may be elements of a Whenable.
      Invalid element: ${element}`)
    })
  }

  private pushResult(value: any, error: any): void {
    this.queueResults.push({ value, error })
    this.checkImmediateCompletion()
  }

  private checkImmediateCompletion(): void {
    if (this.queueResults.length === this.queue.length) {
      this.completeWhenable()
      return
    }

    if (
      this.behavior === Behavior.FAIL_FAST &&
      this.queueResults.some(r => r.error !== null)
    ) {
      this.completeWhenable()
      return
    }
  }

  private completeWhenable(): void {
    const errors = this.queueResults
      .map(el => el.error)
      .filter(err => err !== null)
    if (errors.length) {
      this.internalReject(errors)
      this.notifyCallbacks(errors)
      return
    }

    this.internalResolve()
    this.notifyCallbacks()
  }

  private notifyCallbacks(errors: any = null): void {
    this.callbacks.forEach(cb => cb(errors))
    this.callbacks.splice(0, this.callbacks.length)
  }
}

export function When(
  whenable: Whenable | Whatable<any> | Chainable
): Promise<any[]> {
  return (<Promise<any>>whenable._internalPromise).then(() => null)
}
