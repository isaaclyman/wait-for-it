import { Whatable, What } from '../..'

test('Whatable returns a value to What, called before it is set', done => {
  let value = null
  const future = new Whatable()

  What(future).then(val => (value = val))
  future.set(1)

  setTimeout(() => {
    expect(value).toBe(1)
    done()
  })
})

test('Whatable returns a value to What, called after it is set', done => {
  const future = new Whatable()
  future.set(1)
  What(future).then(val => {
    expect(val).toBe(1)
    done()
  })
})

test('Whatable returns a value to What, set in the constructor', done => {
  const future = new Whatable(1)
  What(future).then(val => {
    expect(val).toBe(1)
    done()
  })
})

test('Whatable returns a value to multiple Whats', done => {
  let value = 0
  const future = new Whatable()
  What(future).then((val: number) => (value += val))
  What(future).then((val: number) => (value += val))
  future.set(1)
  What(future).then((val: number) => (value += val))

  setTimeout(() => {
    expect(value).toBe(3)
    done()
  })
})

test('Whatable can be constructed with a Promise', done => {
  const future = new Whatable(Promise.resolve(1))
  What(future).then(val => {
    expect(val).toBe(1)
    done()
  })
})

test('Whatable can be set with a Promise', done => {
  const future = new Whatable()
  What(future).then(val => {
    expect(val).toBe(1)
    done()
  })

  future.set(Promise.resolve(1))
})

test('Whatable returns different values when it is set multiple times', done => {
  const future = new Whatable()

  What(future).then(val => {
    expect(val).toBe(1)

    setTimeout(() => {
      future.set(2)
      What(future).then(val => {
        expect(val).toBe(2)

        setTimeout(() => {
          future.set(3)
          What(future).then(val => {
            expect(val).toBe(3)
            done()
          })
        })
      })
    })
  })

  future.set(1)
})
