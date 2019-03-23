# Waits Up

Simple asynchrony for modern apps

Web apps often have to manage several asynchronous operations in parallel--like XHR requests, user-driven events, or the results of long-running operations. This doesn't always go as planned. Waits Up is here to simplify some of the most common situations you may encounter while getting all the parts of an app to work together.

## Why use Waits Up?

Promises are great for one-and-done, single-dependency operations, like a click that triggers an API call. But they don't do much more than that off the shelf. Sure, you can use `Promise.all`, but you'll need to have all your ducks in a row before you start, which is an awfully synchronous thing to wish for in an asynchronous world. And the whole thing dies the moment one of your Promises throws an error, so getting things to happen in the right order is tricky.

Observables are hard to learn and have an enormous API surface. What's worse, they treat everything like a stream, which doesn't make sense for the majority of events. An XHR request isn't going to return multiple times. A calculation isn't going to finish twice. You can learn to think in a way that frames events as streams, but that's a big commitment, and maybe your app is complex enough already.

Waits Up is an in-between solution. It has a small API that builds on the strengths of Promises but delivers more flexibility and better predictability. It helps you avoid race conditions and make sense of chained events. It makes asynchrony less stressful.

## Examples

These examples can get you started with Waits Up. In order to keep the code simple, they neglect some of the nuances of the library (notably error handling). For details, skip down to the API reference.

### Situation 1: Doing things in order

You've got an array of ten functions. Each function returns a Promise which must complete before the next function is called. You can write `.then()` until your fingers hurt and introduce 20+ columns of horizontal scrolling to your app, but that's no good. Here's what Waits Up can do:

```JavaScript
import { Chainable, When } from 'waits-up'

const chainedFns = [() => getPromise1(), () => getPromise2(), ...]
const chainable = new Chainable(chainedFns)

When(chainable).then(() => {
  // Each chained function has been called, and its promise completed, in order
})
```

### Situation 2: Waiting for who-knows-what and who-knows-when

You have a component CM and a service SV. CM knows the current user's login ID, and SV knows how to use the user's login ID to get the user's account status, which it returns inside a Promise. That's great for the two of them, but you also have seven other components that need to know the user's account status, and some of them may be instantiated before CM. You want to manage this situation without refactoring the app's entire structure. Waits Up can help:

```JavaScript
/*
  Service SV
*/
import Http from 'fake-http-library'
import { Whatable } from 'waits-up'

export const accountStatusWhatable = new Whatable()

export class API {
  getAccountStatus (userId) {
    Http.get('/status?userId=' + userId).then(response => {
      accountStatusWhatable.set(response.body)
    })
  }
}

/*
  Component CM
*/
import { What } from 'waits-up'
import { accountStatusWhatable, API } from './sv.js'

const userId = 42

const api = new API()
api.getAccountStatus(userId)

What(accountStatusWhatable).then(status => {
  // You can use this same line of code in every component that needs the account status
})
```

### Situation 3: Waiting for many unknown things

You have an operation OP that runs and completes, but may later revert to a running state. Components throughout your app have event-driven methods that should run immediately if OP is complete, or wait for it to finish if it's running. Waits Up does that too:

```JavaScript
/*
  Operation OP
*/
import { Whenable } from 'waits-up'

function op() {
  // An asynchronous operation
}

export const opWhenable = new Whenable(op())

// ...later, we want to run op() again
opWhenable.push(op())

// ...or make everyone wait for a different operation
opWhenable.push( (function op2() { ... })() )

// ...or even make everyone wait for an operation we haven't defined yet
const delayedOp = new Whenable()
opWhenable.push(delayedOp)
// ...later
delayedOp.push( (function op3() { ... })() )

/*
  A component
*/
import { When } from 'waits-up'
import { opWhenable } from './op.js'
import { onEvent } from 'fake-framework'

onEvent(() => When(opWhenable).then(() => {
  // Always waits for OP to complete before calling this function
}))

```

## API

### Constructors

#### Whenable

`new Whenable()`: When constructed without arguments, this returns an incomplete Whenable. The `push()` method must be used on the Whenable or it will never complete. See the Behavior section for details on the optional second argument.

`new Whenable([promise1, promise2, ..promiseN], Behavior?)`: When constructed with an array of Promises, this returns a Whenable that will complete when every Promise has completed. If one or more of the Promises fails, the other Promises will still be awaited. See the Behaviors section below for details on the optional second argument.

`new Whenable([whenable1, whenable2, ..whenableN], Behavior?)`: When constructed with an array of Whenables, Whatables or Chainables, this returns a Whenable that will complete when each one has completed.

**Mix and match:** You can pass or push a mixture of IWhenables (Whenables, Whatables, and Chainables) and Promises to a Whenable. Each of these is called an "element" of the Whenable.

#### Whatable

`new Whatable()`: When constructed without arguments or with `undefined`, this returns an incomplete Whatable. The `set()` method must be used on the Whatable or it will never complete.

`new Whatable(promise)`: When constructed with a Promise or Promise-like, this returns a Whatable that will complete when the Promise completes and return the value resolved by the Promise.

`new Whatable(value)`: When constructed with a non-null, non-Promise-like value, this returns a Whatable that will immediately complete and return the value.

#### Chainable

`new Chainable(null?, Behavior?)`: When constructed without arguments or with `null`, this returns an incomplete Chainable. The `push()` method must be used on the Chainable or it will never complete. See the Behavior section for details on the optional second argument.

`new Chainable([fn1, fn2, ..fnN], Behavior?)`: When constructed with an array of functions that return a Promise, this returns a Chainable. Going in order, each function will be called and its Promise will be completed before the next function is called. This may also be called with an array of functions that return an IWhenable.

### Object methods

`whenable.push(element1, element2, ..elementN)`: Adds one or more elements to the Whenable. The Whenable will revert to an incomplete state until the new element is complete.

`whatable.set(value)`: Sets the value of the Whatable. This can be called multiple times, but only future calls to `What(whatable)` will receive the latest value.

`chainable.push(fn1, fn2, ..fnN)`: Adds one or more functions that return an IWhenable or Promise to the end of the Chainable's chain, meaning it will be called as soon as every other function has been called and its IWhenable or Promise has completed. The Chainable will revert to an incomplete state until the new IWhenable or Promise is complete.

### Static methods

`What(whatable)`: Returns a Promise representing the Whatable's state at the current moment. If it has never received a value, the Promise will resolve once a value is set. You generally should `What` a Whatable at the exact moment you need it. If you do so ahead of time, the value you resolve from the Promise may not be the most current value of the Whatable. You cannot `What` a Whenable.

`When(whenable)`: Returns a Promise representing the Whenable's state at the current moment. If it is incomplete, the Promise will resolve the next time the Whenable completes. The Promise from a `When` call always resolves to `null`. You generally should `When` a Whenable at the exact moment you need it. If you do so ahead of time, the Promise may resolve before the Whenable's most up-to-date series of elements has been awaited. The returned Promise resolves to an array of Promise rejection messages or IWhenable errors, if any. You can `When` a Whatable if you don't care about its value.

`When(chainable)`: Returns a Promise representing the Chainable's state at the current moment. If it is incomplete, the Promise will resolve when the current chain of functions is finished. You generally should `When` a Chainable at the exact moment you need it. If you do so ahead of time, any functions you have `push`ed may still be incomplete when the Promise resolves. The returned Promise resolves to an array of Promise rejection messages or IWhenable errors, if any.

### Behaviors

`Behavior` is an options object you can import. Its keys are:

- `Behavior.DEFAULT`: The default behavior. For Whenables, this will ensure that every element either resolves or rejects before the Whenable completes. For Chainables, this will continue to call functions and wait for Promises in order even if one of them fails.
- `Behavior.FAIL_FAST`: For Whenables, this will cause the resulting Promise to reject as soon as any element of the Whenable enters an error state (much like Promise.all). For Chainables, this will stop calling functions as soon as one of them fails.
