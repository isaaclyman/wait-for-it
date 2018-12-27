import {Whatable} from './whatable'
import {Chainable} from './chainable'
import Behavior from './behavior';
import IWhenable from './iwhenable';

type WhenableElement = PromiseLike<any> | IWhenable

export class Whenable implements IWhenable {
  _internalPromise: Promise<null>

  private queue: Array<WhenableElement>
  private queueResults: Array<{ value: any, error: any }>
  private callbacks: Array<(error: any) => any> = []
  private internalResolve: () => void
  private internalReject: (errors: any[]) => void

  constructor (elements?: null | Array<WhenableElement>, private behavior?: Behavior) {
    if (elements !== null) {
      this.queue.push(...elements)
      this.listenQueue(elements)
    }

    this._internalPromise = new Promise((resolve, reject) => {
      this.internalResolve = () => resolve(null)
      this.internalReject = reject
    })
  }

  push (...elements: Array<WhenableElement>): void {
    if (elements !== null) {
      this.queue.push(...elements)
      this.listenQueue(elements)
    }
  }

  _done (callback: (error: any) => any): void {
    this.callbacks.push(callback)
  }

  private listenQueue (queue: Array<WhenableElement>): void {
    this.queue.forEach(element => {
      const promiseElement = (<Promise<any>>element)
      if (promiseElement.then) {
        promiseElement.then(result => this.pushResult(result, null), err => this.pushResult(null, err))
        return
      }
      
      const whenableElement = (<IWhenable>element)
      if (whenableElement._done) {
        whenableElement._done(err => this.pushResult(null, err))
        return
      }

      throw new Error(`Only Promise-likes, Whenables, Whatables and Chainables may be elements of a Whenable.
      Invalid element: ${element}`)
    })
  }

  private pushResult (value: any, error: any): void {
    this.queueResults.push({ value, error })
    if (this.queueResults.length === this.queue.length) {
      this.completeWhenable()
      return
    }

    if (error !== null && this.behavior === Behavior.FAIL_FAST) {
      this.completeWhenable()
      return
    }
  }

  private completeWhenable (): void {
    const errors = this.queueResults.filter(el => el.error !== null)
    if (errors.length) {
      this.internalReject(errors)
      this.notifyCallbacks(errors)
      return
    }

    this.internalResolve()
    this.notifyCallbacks()
  }

  private notifyCallbacks (error: any = null): void {
    this.callbacks.forEach(cb => cb(error))
    this.callbacks.splice(0, this.callbacks.length)
  }
}

export function When(whenable: Whenable | Whatable<any> | Chainable): Promise<null> {
  return (<Promise<any>>whenable._internalPromise).then(() => null)
}
