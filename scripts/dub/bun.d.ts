// Minimal ambient declarations for the Bun globals this pipeline uses, so `tsc` can check
// scripts/dub without adding @types/bun to the app's dependency tree.
interface BunSubprocess {
  stdin: { write(chunk: Uint8Array): void; flush(): Promise<number>; end(): void }
  stdout: ReadableStream<Uint8Array>
  stderr: ReadableStream<Uint8Array>
  exited: Promise<number>
}

interface BunSpawnOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  stdin?: 'pipe' | 'inherit' | 'ignore'
  stdout?: 'pipe' | 'inherit' | 'ignore'
  stderr?: 'pipe' | 'inherit' | 'ignore'
}

interface BunFile {
  text(): Promise<string>
}

declare class BunCryptoHasher {
  constructor(algorithm: string)
  update(input: string): void
  digest(encoding: 'hex'): string
}

interface BunGlobal {
  argv: string[]
  spawn(cmd: string[], options?: BunSpawnOptions): BunSubprocess
  file(path: string): BunFile
  sleep(ms: number): Promise<void>
  CryptoHasher: typeof BunCryptoHasher
}

declare const Bun: BunGlobal

interface ImportMeta {
  dir: string
  url: string
}
