declare module 'JSONStream' {
  import { Transform } from 'stream'

  interface JSONStream {
    parse(pattern: string | null): Transform
    stringify(open?: string, sep?: string, close?: string): Transform
  }

  const JSONStream: JSONStream
  export = JSONStream
}
