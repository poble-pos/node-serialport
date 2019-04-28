const DefaultBindings = require('@serialport/bindings')
const debug = require('debug')('serialport/async-iterator')
/**
 * A transform stream that does something pretty cool.
 * @param {Object} options open options
 * @example ```
// To use the `AsyncIterator` interface:
const { open, list } = require('@serialport/async-iterator')
const ports = await list()
const arduinoPort = ports.find(info => (info.manufacture || '').includes('Arduino'))
const port = await open(arduinoPort)

// read bytes until close
for await (const bytes of port) {
  console.log(`read ${bytes.length} bytes`)
}

// read 12 bytes
const { value, end } = await port.next(12)
console.log(`read ${value.length} bytes / port closed: ${end}`)

// write a buffer
await port.write(Buffer.from('hello!'))
```
*/

const open = async ({ Bindings = DefaultBindings, readSize = 1024, ...openOptions } = {}) => {
  const binding = new Bindings()
  await binding.open(openOptions)

  const next = async (bytesToRead = readSize) => {
    if (!binding.isOpen) {
      debug('next: port is closed')
      return { value: undefined, end: true }
    }

    const readBuffer = Buffer.allocUnsafe(bytesToRead)
    try {
      debug(`next: read starting`)
      const bytesRead = await binding.read(readBuffer, 0, bytesToRead)
      debug(`next: read ${bytesRead} bytes`)
      const value = readBuffer.slice(0, bytesRead)
      return { value, end: false }
    } catch (error) {
      if (error.canceled) {
        debug(`next: read canceled`)
        return { value: undefined, end: true }
      }
      debug(`next: read error ${error.message}`)
      throw error
    }
  }

  const port = {
    [Symbol.asyncIterator]: () => port,
    next,
    write: data => binding.write(data),
    close: () => binding.close(),
    update: opt => binding.update(opt),
    set: opt => binding.set(opt),
    get: () => binding.get(),
    flush: () => binding.flush(),
    drain: () => binding.drain(),
  }
  return port
}

module.exports.open = open

module.exports.DefaultBindings.list
