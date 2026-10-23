/**
 * Arduino UNO mini-interpreter (client-side).
 *
 * Menjalankan subset bahasa C++ Arduino secara async agar `delay()` tidak
 * membekukan UI. Subset yang didukung:
 *   - deklarasi variabel (int/float/double/char/bool/long/byte/unsigned + array + const)
 *   - ekspresi aritmetika/boolean, unary, ternary, penugasan (termasuk elemen array)
 *   - if/else, while, do-while, for, break, continue, return
 *   - fungsi buatan pengguna (void maupun bertipe)
 *   - builtin Arduino: pinMode, digitalRead/Write, analogRead/Write, delay,
 *     millis/micros, Serial.begin/print/println/write/available/read/readString,
 *     map, constrain, min, max, abs, random, sqrt, pow, dll.
 *
 * Tidak didukung (dengan pesan jelas): pointer (beserta `&`/`->`),
 * struct/class, alokasi new/delete, string C, dan interupsi.
 */

export type PinModeName = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'

export interface ArduinoRunnerHooks {
  pinMode(pin: number, mode: PinModeName): void
  digitalWrite(pin: number, value: number): void
  digitalRead(pin: number): number
  analogWrite(pin: number, value: number): void
  analogRead(pin: number): number
  serialOut(text: string): void
  onError(message: string): void
  onFinish(): void
}

/* ============================ Tokenizer ============================ */

interface Token {
  kind: 'ident' | 'num' | 'str' | 'char' | 'punc'
  value: string
  line: number
}

const PUNCT = [
  '<<=', '>>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<=', '>=', '&&', '||', '->',
  '<<', '>>', '{', '}', '(', ')', '[', ']', ';', ',', ':', '?', '+', '-', '*', '/', '%', '=', '<', '>', '.', '!', '&', '|', '^', '~',
]

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let line = 1
  while (i < src.length) {
    const c = src[i]
    if (c === '\n') { line++; i++; continue }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue }

    // komentar
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++
        i++
      }
      i += 2
      continue
    }

    // string literal
    if (c === '"') {
      let s = ''
      i++
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') {
          s += escapeChar(src[i + 1])
          i += 2
        } else {
          if (src[i] === '\n') line++
          s += src[i]
          i++
        }
      }
      i++ // tutup "
      tokens.push({ kind: 'str', value: s, line })
      continue
    }

    // char literal
    if (c === "'") {
      let s = ''
      i++
      while (i < src.length && src[i] !== "'") {
        if (src[i] === '\\') {
          s += escapeChar(src[i + 1])
          i += 2
        } else {
          s += src[i]
          i++
        }
      }
      i++ // tutup '
      const code = s.length ? s.charCodeAt(0) : 0
      tokens.push({ kind: 'char', value: String(code), line })
      continue
    }

    // angka (desimal/heks/float)
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let s = ''
      if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        s += '0x'; i += 2
        while (i < src.length && /[0-9a-fA-F]/.test(src[i])) { s += src[i]; i++ }
      } else {
        while (i < src.length && /[0-9.]/.test(src[i])) { s += src[i]; i++ }
      }
      // sufiks L, UL, F (diabaikan)
      while (i < src.length && /[ULFulf]/.test(src[i])) i++
      tokens.push({ kind: 'num', value: s, line })
      continue
    }

    // identifier
    if (isIdStart(c)) {
      let s = ''
      while (i < src.length && isIdChar(src[i])) { s += src[i]; i++ }
      tokens.push({ kind: 'ident', value: s, line })
      continue
    }

    // tanda baca
    const p = PUNCT.find((x) => src.startsWith(x, i))
    if (p) {
      tokens.push({ kind: 'punc', value: p, line })
      i += p.length
      continue
    }
    throw new InterpError(`Karakter tidak dikenal "${c}"`, line)
  }
  tokens.push({ kind: 'punc', value: '<EOF>', line })
  return tokens
}

function escapeChar(c: string): string {
  if (c === 'n') return '\n'
  if (c === 't') return '\t'
  if (c === 'r') return '\r'
  if (c === '\\' || c === '"' || c === "'") return c
  if (c === '0') return '\0'
  return c
}

function isIdStart(c: string) { return /[A-Za-z_]/.test(c) }
function isIdChar(c: string) { return /[A-Za-z0-9_]/.test(c) }

/* ============================ AST ============================ */

type Node =
  | { t: 'block'; body: Node[] }
  | { t: 'decl'; names: DeclItem[]; isConst: boolean; typeName: string; line: number }
  | { t: 'exprStmt'; expr: Node; line: number }
  | { t: 'if'; test: Node; then: Node; other: Node | null; line: number }
  | { t: 'while'; test: Node; body: Node; line: number }
  | { t: 'dowhile'; body: Node; test: Node; line: number }
  | { t: 'for'; init: Node | null; test: Node | null; step: Node | null; body: Node; line: number }
  | { t: 'return'; value: Node | null; line: number }
  | { t: 'break'; line: number }
  | { t: 'continue'; line: number }
  | { t: 'empty' }
  | { t: 'num'; value: number; line: number }
  | { t: 'str'; value: string; line: number }
  | { t: 'id'; id: string; line: number }
  | { t: 'binary'; op: string; left: Node; right: Node; line: number }
  | { t: 'unary'; op: string; extra?: string; operand: Node; line: number }
  | { t: 'assign'; op: string; target: Node; value: Node; line: number }
  | { t: 'call'; callee: Node; args: Node[]; line: number }
  | { t: 'memberCall'; obj: string; prop: string; args: Node[]; line: number }
  | { t: 'index'; obj: Node; index: Node; line: number }
  | { t: 'cond'; test: Node; then: Node; other: Node; line: number }
  | { t: 'member'; obj: Node; prop: string; line: number }

interface DeclItem {
  id: string
  isArray: boolean
  size: Node | null
  init: Node | null
  initList: Node[] | null
}

type FnDef = { name: string; params: string[]; body: Node[]; retType: string; line: number }

export class InterpError extends Error {
  line?: number
  constructor(message: string, line?: number) {
    super(line ? `${message} (baris ${line})` : message)
    this.line = line
  }
}

const TYPE_KEYWORDS = new Set([
  'int', 'float', 'double', 'char', 'bool', 'boolean', 'long', 'short', 'byte', 'unsigned',
  'uint8_t', 'int8_t', 'uint16_t', 'int16_t', 'uint32_t', 'int32_t', 'word', 'size_t', 'signed',
  'void',
])

/* ============================ Parser ============================ */

class Parser {
  private pos = 0
  private tokens: Token[] = []
  globalDecls: Node[] = []
  fns = new Map<string, FnDef>()
  setup: FnDef | null = null
  loop: FnDef | null = null

  private peek(o = 0) { return this.tokens[this.pos + o] }

  private next() { return this.tokens[this.pos++] }

  private expect(v: string, line?: number) {
    const t = this.next()
    if (!t || t.kind !== 'punc' || t.value !== v) {
      throw new InterpError(`Diharapkan "${v}" tetapi didapat ${t ? `"${t.value}"` : 'akhir berkas'}`, line || t?.line)
    }
    return t
  }

  private at(v: string, kind: Token['kind'] = 'punc') {
    const t = this.peek()
    return !!t && t.kind === kind && t.value === v
  }

  private isTypeTok(t: Token | undefined) {
    return !!t && t.kind === 'ident' && (TYPE_KEYWORDS.has(t.value))
  }

  parse(source: string) {
    // mini-preprosesor: buang direktiva (#include, #define, dll)
    const code = source.replace(/^[ \t]*#.*$/gm, '')
    this.tokens = tokenize(code)
    this.pos = 0

    while (!this.at('<EOF>')) {
      const t = this.peek()!
      if (t.kind === 'punc' && t.value === ';') { this.next(); continue }
      if (this.isTypeTok(t) && this.looksLikeFn()) {
        const fn = this.parseFnDef()
        if (fn.name === 'setup') { this.setup = fn; continue }
        if (fn.name === 'loop') { this.loop = fn; continue }
        this.fns.set(fn.name, fn)
        continue
      }
      if (this.isTypeTok(t) || t.value === 'const') {
        this.globalDecls.push(this.parseStatement())
        continue
      }
      throw new InterpError(`Sintaks level atas tidak didukung: "${t.value}"`, t.line)
    }
  }

  /** deteksi pola "tipe... nama(" ⇒ definisi fungsi */
  private looksLikeFn(): boolean {
    let j = this.pos
    while (j < this.tokens.length) {
      const tk = this.tokens[j]
      if (tk.kind === 'ident' && (TYPE_KEYWORDS.has(tk.value) || tk.value === 'const')) { j++; continue }
      if (tk.kind === 'punc' && tk.value === '*') { j++; continue }
      break
    }
    const name = this.tokens[j]
    const after = this.tokens[j + 1]
    return !!name && name.kind === 'ident' && !!after && after.kind === 'punc' && after.value === '('
  }

  private parseFnDef(): FnDef {
    const line = this.peek()!.line
    this.parseTypeId()
    if (this.at('const', 'ident')) this.next()
    const name = this.next().value
    this.expect('(')
    const params: string[] = []
    while (!this.at(')')) {
      this.parseTypeId()
      while (this.at('*')) this.next()
      while (this.at('[')) { this.expect('['); this.expect(']') }
      const id = this.next()
      if (id.kind !== 'ident') throw new InterpError('Nama parameter tidak valid', line)
      params.push(id.value)
      while (this.at('[')) { this.expect('['); this.expect(']'); this.next() }
      if (this.at(',')) this.expect(',')
    }
    this.expect(')')
    const body = this.parseBlock()
    return { name, params, body, retType: 'any', line }
  }

  /** Ambil tipe (termasuk majemuk "unsigned long") lalu buang; kembalikan nama tipe dasar. */
  private parseTypeId(): string {
    const first = this.next()!
    if (first.value === 'unsigned' || first.value === 'signed') {
      const nxt = this.peek()
      if (nxt && TYPE_KEYWORDS.has(nxt.value) && nxt.value !== 'unsigned' && nxt.value !== 'signed') {
        this.next()
        return nxt.value
      }
      return first.value
    }
    if (!TYPE_KEYWORDS.has(first.value)) {
      throw new InterpError(`Tipe tidak valid "${first.value}" (pointer/struct tidak didukung)`, first.line)
    }
    const nxt = this.peek()
    if (nxt && nxt.kind === 'ident' && TYPE_KEYWORDS.has(nxt.value)) {
      this.next()
      return nxt.value
    }
    return first.value
  }

  private parseBlock(): Node[] {
    this.expect('{')
    const body: Node[] = []
    while (!this.at('}') && !this.at('<EOF>')) {
      body.push(this.parseStatement())
    }
    this.expect('}')
    return body
  }

  parseStatement(): Node {
    const t = this.peek()!
    if (t.kind === 'punc' && t.value === '{') return { t: 'block', body: this.parseBlock() } as Node
    if (t.kind === 'punc' && t.value === ';') { this.next(); return { t: 'empty' } as Node }

    if (t.kind === 'ident') {
      switch (t.value) {
        case 'if': {
          this.next()
          this.expect('(')
          const test = this.parseExpr()
          this.expect(')')
          const then = this.parseStatement()
          let other: Node | null = null
          if (this.at('else')) { this.next(); other = this.parseStatement() }
          return { t: 'if', test, then, other, line: t.line }
        }
        case 'while': {
          this.next()
          this.expect('(')
          const test = this.parseExpr()
          this.expect(')')
          const body = this.parseStatement()
          return { t: 'while', test, body, line: t.line }
        }
        case 'do': {
          this.next()
          const body = this.parseStatement()
          if (!this.at('while', 'ident')) throw new InterpError(`Diharapkan "while" setelah do`, t.line)
          this.next()
          this.expect('(')
          const test = this.parseExpr()
          this.expect(')')
          this.expect(';')
          return { t: 'dowhile', body, test, line: t.line }
        }
        case 'for': {
          this.next()
          this.expect('(')
          let init: Node | null = null
          if (!this.at(';')) {
            init = this.isTypeTok(this.peek()) || this.at('const', 'ident') ? this.parseDecl() : { t: 'exprStmt', expr: this.parseExpr(), line: t.line }
          } else this.expect(';')
          const test = this.at(';') ? null : this.parseExpr()
          this.expect(';')
          const step = this.at(')') ? null : this.parseExpr()
          this.expect(')')
          const body = this.parseStatement()
          return { t: 'for', init, test, step, body, line: t.line }
        }
        case 'return': {
          this.next()
          const value = this.at(';') ? null : this.parseExpr()
          this.expect(';', t.line)
          return { t: 'return', value, line: t.line }
        }
        case 'break': {
          this.next()
          this.expect(';', t.line)
          return { t: 'break', line: t.line }
        }
        case 'continue': {
          this.next()
          this.expect(';', t.line)
          return { t: 'continue', line: t.line }
        }
      }
      if (this.isTypeTok(t) || t.value === 'const') return this.parseDecl()
    }

    const expr = this.parseExpr()
    this.expect(';', t.line)
    return { t: 'exprStmt', expr, line: t.line }
  }

  private parseDecl(): Node {
    const line = this.peek()!.line
    const isConst = this.at('const', 'ident')
    if (isConst) this.next()
    const typeName = this.parseTypeId()
    if (this.at('const', 'ident')) this.next()
    const names: DeclItem[] = []
    do {
      while (this.at('*')) this.next()
      const idTok = this.next()!
      if (idTok.kind !== 'ident') throw new InterpError('Nama variabel tidak valid', line)
      let isArray = false
      let size: Node | null = null
      let initList: Node[] | null = null
      let init: Node | null = null
      if (this.at('[')) {
        this.expect('[')
        isArray = true
        if (!this.at(']')) size = this.parseExpr()
        this.expect(']')
      }
      if (this.at('=')) {
        this.expect('=')
        if (this.at('{')) {
          if (!isArray) throw new InterpError('Inisialisasi { } hanya valid untuk array', line)
          this.expect('{')
          initList = []
          while (!this.at('}')) {
            initList.push(this.parseAssign())
            if (this.at(',')) this.expect(',')
          }
          this.expect('}')
        } else {
          init = this.parseAssign()
          if (isArray) {
            // "int arr[N] = scalar" tidak biasa: perlakukan sebagai panjang
            size = size ?? init
          }
        }
      }
      names.push({ id: idTok.value, isArray, size, init, initList })
    } while (this.at(',') && this.next())
    this.expect(';', line)
    return { t: 'decl', names, isConst, typeName, line }
  }

  parseExpr(): Node {
    let expr = this.parseTernary()
    const t = this.peek()
    if (t && t.kind === 'punc' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='].includes(t.value)) {
      this.next()
      const value = this.parseExpr()
      expr = { t: 'assign', op: t.value, target: expr, value, line: t.line }
    }
    return expr
  }

  private parseAssign(): Node { return this.parseExpr() }

  private parseTernary(): Node {
    const test = this.parseBinary(0)
    const t = this.peek()
    if (t && t.kind === 'punc' && t.value === '?') {
      this.next()
      const then = this.parseExpr()
      this.expect(':')
      const other = this.parseTernary()
      return { t: 'cond', test, then, other, line: t.line }
    }
    return test
  }

  private static PRECEDENCE = [
    ['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%'],
  ]

  private parseBinary(minLevel: number): Node {
    if (minLevel >= Parser.PRECEDENCE.length) return this.parseUnary()
    let left = this.parseBinary(minLevel + 1)
    while (true) {
      const t = this.peek()
      if (!t || t.kind !== 'punc') break
      const level = Parser.PRECEDENCE.findIndex((ops) => ops.includes(t.value))
      if (level < minLevel) break
      const op = this.next().value
      const right = this.parseBinary(level + 1)
      left = { t: 'binary', op, left, right, line: t.line }
    }
    return left
  }

  private parseUnary(): Node {
    const t = this.peek()
    if (t && t.kind === 'punc' && ['!', '-', '+', '++', '--', '~'].includes(t.value)) {
      const op = this.next().value
      const operand = this.parseUnary()
      if (op === '++' || op === '--') return { t: 'unary', op, extra: 'pre', operand, line: t.line }
      return { t: 'unary', op, operand, line: t.line }
    }
    return this.parsePostfix()
  }

  private parsePostfix(): Node {
    let expr = this.parsePrimary()
    while (true) {
      const t = this.peek()
      if (!t) break
      if (t.kind === 'punc' && t.value === '(') {
        this.next()
        const args: Node[] = []
        while (!this.at(')')) {
          args.push(this.parseAssign())
          if (this.at(',')) this.next()
        }
        this.expect(')')
        if (expr.t === 'member') {
          const mem = expr as { obj: Node; prop: string }
          if (mem.obj.t === 'id') {
            expr = { t: 'memberCall', obj: mem.obj.id, prop: mem.prop, args, line: t.line }
          } else {
            throw new InterpError('Pemanggilan metode pada ekspresi tidak didukung', t.line)
          }
        } else if (expr.t === 'id') {
          expr = { t: 'call', callee: expr, args, line: t.line }
        } else {
          throw new InterpError('Pemanggilan fungsi hanya pada nama fungsi', t.line)
        }
        continue
      }
      if (t.kind === 'punc' && t.value === '[') {
        this.next()
        const index = this.parseExpr()
        this.expect(']')
        expr = { t: 'index', obj: expr, index, line: t.line }
        continue
      }
      if (t.kind === 'punc' && t.value === '.') {
        this.next()
        const prop = this.next().value
        expr = { t: 'member', obj: expr, prop, line: t.line }
        continue
      }
      if (t.kind === 'punc' && t.value === '->') {
        throw new InterpError('Akses pointer "->" tidak didukung simulator (gunakan fungsi biasa tanpa pointer)', t.line)
      }
      if (t.kind === 'punc' && (t.value === '++' || t.value === '--')) {
        this.next()
        expr = { t: 'unary', op: t.value, extra: 'post', operand: expr, line: t.line }
        continue
      }
      break
    }
    return expr
  }

  private parsePrimary(): Node {
    const t = this.next()!
    if (t.kind === 'num') {
      const v = t.value.toLowerCase()
      const n = v.startsWith('0x') ? parseInt(t.value, 16) : parseFloat(v)
      if (Number.isNaN(n)) throw new InterpError(`Angka tidak valid "${t.value}"`, t.line)
      return { t: 'num', value: n, line: t.line }
    }
    if (t.kind === 'str') return { t: 'str', value: t.value, line: t.line }
    if (t.kind === 'char') return { t: 'num', value: Number(t.value), line: t.line }
    if (t.kind === 'ident') {
      if (t.value === 'true') return { t: 'num', value: 1, line: t.line }
      if (t.value === 'false') return { t: 'num', value: 0, line: t.line }
      if (t.value === 'NULL' || t.value === 'nullptr') {
        throw new InterpError('Pointer (NULL/new/delete/struct) tidak didukung simulator', t.line)
      }
      return { t: 'id', id: t.value, line: t.line }
    }
    if (t.kind === 'punc' && t.value === '(') {
      // cast? "(int)" di depan kurung pertama: cek isi = tipe
      if (this.isTypeTok(this.peek())) {
        this.parseTypeId()
        this.expect(')')
        const operand = this.parseUnary()
        return { t: 'unary', op: 'cast', operand, line: t.line }
      }
      const inside = this.parseExpr()
      this.expect(')')
      return inside
    }
    throw new InterpError(`Sintaks tidak dikenal "${t.value}"`, t.line)
  }
}

/* ============================ Interpreter ============================ */

interface Scope {
  vars: Map<string, { value: unknown; isConst: boolean; isFloat: boolean } >
  parent: Scope | null
}

class VarRef {
  constructor(private rec: { value: unknown; isConst: boolean }, private id: string, private line: number) {}
  get() { return this.rec.value }
  set(v: unknown) {
    if (this.rec.isConst) throw new InterpError(`Tidak bisa mengubah variabel const "${this.id}"`, this.line)
    this.rec.value = v
  }
}

function findVar(scope: Scope, id: string, line: number): VarRef {
  let s: Scope | null = scope
  while (s) {
    const rec = s.vars.get(id)
    if (rec) return new VarRef(rec, id, line)
    s = s.parent
  }
  throw new InterpError(`Variabel "${id}" tidak ditemukan — deklarasikan dulu, misal "int ${id} = 0;"`, line)
}

export class ArduinoRunner {
  private parser = new Parser()
  private globalScope: Scope = { vars: new Map(), parent: null }
  private stopped = false
  private startedAt = 0
  private opBudget = 500_000
  /** flag dipakai interpreter untuk tahu apakah iterasi pernyataan memanggil delay() */
  private tickHadDelay = false
  private serialIn: string[] = []

  constructor(private code: string, private hooks: ArduinoRunnerHooks) {}

  stop() {
    this.stopped = true
  }

  /** Serial Monitor praktikan (klik Kirim) → bisa dibaca via Serial.read()/readString() */
  feedSerial(text: string) {
    this.serialIn.push(text.replace(/\r?\n$/, '').trim())
  }

  async run() {
    try {
      this.parser.parse(this.code)

      this.startedAt = Date.now()

      // inisialisasi variabel global / tabel konstanta
      for (const decl of this.parser.globalDecls) await this.execStatement(decl, this.globalScope)

      if (this.parser.setup) {
        await this.runFunction(this.parser.setup, [])
      }

      if (this.parser.loop) {
        if (this.stopped) return
        while (!this.stopped) {
          this.opBudget = 500_000
          this.tickHadDelay = false
          await this.runFunction(this.parser.loop, [])
          if (this.stopped) break
          if (!this.tickHadDelay) {
            // loop tanpa delay: beri jeda kecil agar browser tidak padat CPU
            await this.waitReal(8)
          }
        }
        this.hooks.onFinish()
      } else {
        if (!this.stopped) {
          if (this.parser.setup) {
            this.hooks.serialOut('[Simulator] setup() selesai (tidak ada loop() untuk diulang)')
          } else {
            this.hooks.serialOut('[Simulator] Tidak ada setup() maupun loop() di kode')
          }
          this.hooks.onFinish()
        }
      }
    } catch (err) {
      if (this.stopped) return
      const msg = err instanceof Error ? err.message : String(err)
      this.hooks.onError(msg)
      this.hooks.onFinish()
    }
  }

  private waitReal(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }

  /** Jalankan body fungsi; handle return/break/continue di tingkat panggilan pengguna. */
  private async runFunction(fn: FnDef, args: unknown[]): Promise<unknown> {
    if (args.length !== fn.params.length) {
      throw new InterpError(`${fn.name}() dipanggil dengan ${args.length} argumen (seharusnya ${fn.params.length})`, fn.line)
    }
    const scope: Scope = { vars: new Map(), parent: this.globalScope }
    fn.params.forEach((p, i) => scope.vars.set(p, { value: args[i] ?? 0, isConst: false, isFloat: false }))
    const saved = this.control
    this.control = { type: 'none' }
    for (const st of fn.body) {
      if (this.stopped) break
      await this.execStatement(st, scope)
      if (this.control.type === 'return' || this.control.type === 'break' || this.control.type === 'continue') break
    }
    const ret = this.control.type === 'return' ? this.control.value : undefined
    this.control = saved
    return ret
  }

  private control: { type: 'none' | 'break' | 'continue' | 'return'; value?: unknown } = { type: 'none' }

  private async execBlock(body: Node[], scope: Scope): Promise<void> {
    const local: Scope = { vars: new Map(), parent: scope }
    for (const st of body) {
      if (this.stopped) return
      await this.execStatement(st, local)
      if (this.control.type !== 'none') return
    }
  }

  /* ---------- statements ---------- */

  private async execStatement(st: Node, scope: Scope): Promise<void> {
    if (--this.opBudget < 0) {
      throw new InterpError('Program terlalu berat / infinite loop terdeteksi — dihentikan simulator')
    }
    switch (st.t) {
      case 'block':
        return this.execBlock((st as { body: Node[] }).body, scope)
      case 'empty':
        return
      case 'decl': {
        const d = st as unknown as { names: DeclItem[]; isConst: boolean; typeName: string }
        const isFloatType = /float|double|boolean/i.test(d.typeName)
        for (const n of d.names) {
          if (n.isArray) {
            let arr: unknown[] = []
            if (n.initList) {
              arr = []
              for (const e of n.initList) arr.push(await this.evalExpr(e, scope))
            } else {
              const len = n.size ? Number(await this.evalExpr(n.size, scope)) || 0 : n.init ? Number(await this.evalExpr(n.init, scope)) || 0 : 0
              arr = new Array(Math.min(Math.max(len, 0), 4096)).fill(0)
            }
            scope.vars.set(n.id, { value: arr, isConst: d.isConst, isFloat: false })
          } else {
            const v = n.init ? await this.evalExpr(n.init, scope) : 0
            scope.vars.set(n.id, { value: v, isConst: d.isConst, isFloat: isFloatType })
          }
        }
        return
      }
      case 'exprStmt': {
        await this.evalExpr((st as { expr: Node }).expr, scope)
        return
      }
      case 'if': {
        const s = st as { test: Node; then: Node; other: Node | null }
        if (isTruthy(await this.evalExpr(s.test, scope))) await this.execStatement(s.then, scope)
        else if (s.other) await this.execStatement(s.other, scope)
        return
      }
      case 'while': {
        const s = st as { test: Node; body: Node; line: number }
        while (!this.stopped && isTruthy(await this.evalExpr(s.test, scope))) {
          await this.execStatement(s.body, scope)
          if (this.control.type === 'break') { this.control = { type: 'none' }; return }
          if (this.control.type === 'continue') this.control = { type: 'none' }
          if (this.control.type === 'return') return
          if (--this.opBudget < 0) throw new InterpError('Infinite loop terdeteksi di while', s.line)
        }
        return
      }
      case 'dowhile': {
        const s = st as { body: Node; test: Node; line: number }
        do {
          await this.execStatement(s.body, scope)
          if (this.control.type === 'break') { this.control = { type: 'none' }; return }
          if (this.control.type === 'continue') this.control = { type: 'none' }
          if (this.control.type === 'return') return
          if (--this.opBudget < 0) throw new InterpError('Infinite loop terdeteksi di do-while', s.line)
        } while (!this.stopped && isTruthy(await this.evalExpr(s.test, scope)))
        return
      }
      case 'for': {
        const s = st as { init: Node | null; test: Node | null; step: Node | null; body: Node; line: number }
        const forScope: Scope = { vars: new Map(), parent: scope }
        if (s.init) await this.execStatement(s.init, forScope)
        while (!this.stopped) {
          if (s.test && !isTruthy(await this.evalExpr(s.test, forScope))) break
          await this.execStatement(s.body, forScope)
          if (this.control.type === 'break') { this.control = { type: 'none' }; return }
          if (this.control.type === 'continue') this.control = { type: 'none' }
          if (this.control.type === 'return') return
          if (s.step) await this.evalExpr(s.step, forScope)
          if (--this.opBudget < 0) throw new InterpError('Infinite loop terdeteksi di for', s.line)
        }
        return
      }
      case 'return': {
        const s = st as { value: Node | null }
        this.control = { type: 'return', value: s.value ? await this.evalExpr(s.value, scope) : undefined }
        return
      }
      case 'break':
        this.control = { type: 'break' }
        return
      case 'continue':
        this.control = { type: 'continue' }
        return
    }
  }

  /* ---------- ekspresi ---------- */

  /** Cek statis: apakah ekspresi melibatkan variabel bertipe float/double (untuk pembagian riil). */
  private exprIsFloat(node: Node, scope: Scope): boolean {
    switch (node.t) {
      case 'num':
        return !Number.isInteger((node as { value: number }).value)
      case 'id': {
        const id = (node as { id: string }).id
        let s: Scope | null = scope
        while (s) {
          const rec = s.vars.get(id)
          if (rec) return rec.isFloat
          s = s.parent
        }
        return false
      }
      case 'binary':
        return this.exprIsFloat((node as { left: Node }).left, scope) || this.exprIsFloat((node as { right: Node }).right, scope)
      default:
        return false
    }
  }

  private async evalExpr(node: Node, scope: Scope): Promise<unknown> {
    if (--this.opBudget < 0) {
      throw new InterpError('Program terlalu berat / infinite loop terdeteksi')
    }
    switch (node.t) {
      case 'num': return (node as { value: number }).value
      case 'str': return (node as { value: string }).value
      case 'id': {
        const id = (node as { id: string; line: number }).id
        return resolveId(id, (node as { line: number }).line, scope)
      }
      case 'binary': {
        const b = node as { op: string; left: Node; right: Node; line: number }
        if (b.op === '&&') return isTruthy(await this.evalExpr(b.left, scope)) && isTruthy(await this.evalExpr(b.right, scope)) ? 1 : 0
        if (b.op === '||') return isTruthy(await this.evalExpr(b.left, scope)) || isTruthy(await this.evalExpr(b.right, scope)) ? 1 : 0
        const l = await this.evalExpr(b.left, scope)
        const r = await this.evalExpr(b.right, scope)
        // pembagian dengan operand bertipe float: hasil riil (bukan integer division C)
        if (b.op === '/' && (this.exprIsFloat(b.left, scope) || this.exprIsFloat(b.right, scope))) {
          if (num(r) === 0) throw new InterpError('Pembagian dengan nol', b.line)
          return num(l) / num(r)
        }
        return applyBinary(b.op, l, r, b.line)
      }
      case 'unary': {
        const u = node as { op: string; extra?: string; operand: Node; line: number }
        if (u.op === '++' || u.op === '--') {
          const old = Number(await this.evalExpr(u.operand, scope)) || 0
          const nv = u.op === '++' ? old + 1 : old - 1
          await this.storeTo(u.operand, nv, scope)
          return u.extra === 'post' ? old : nv
        }
        if (u.op === 'cast') return await this.evalExpr(u.operand, scope)
        const v = await this.evalExpr(u.operand, scope)
        switch (u.op) {
          case '!': return isTruthy(v) ? 0 : 1
          case '-': return -num(v)
          case '+': return v
          case '~': return ~num(v)
        }
        throw new InterpError(`Operator unary "${u.op}" tidak didukung`, u.line)
      }
      case 'assign': {
        const a = node as { op: string; target: Node; value: Node; line: number }
        const raw = await this.evalExpr(a.value, scope)
        if (a.op === '=') {
          await this.storeTo(a.target, raw, scope)
          return raw
        }
        const cur = await this.evalExpr(a.target, scope)
        if (['&=', '|=', '^='].includes(a.op)) {
          const base = a.op[0] as '&' | '|' | '^'
          const bv = base === '&' ? num(cur) & num(raw) : base === '|' ? num(cur) | num(raw) : num(cur) ^ num(raw)
          await this.storeTo(a.target, bv, scope)
          return bv
        }
        const base = a.op[0] as '+' | '-' | '*' | '/' | '%'
        if (base === '/' && (this.exprIsFloat(a.target, scope) || this.exprIsFloat(a.value, scope))) {
          if (num(raw) === 0) throw new InterpError('Pembagian dengan nol', a.line)
          const fv = num(cur) / num(raw)
          await this.storeTo(a.target, fv, scope)
          return fv
        }
        if (base === '/' && num(raw) === 0) throw new InterpError('Pembagian dengan nol', a.line)
        if (base === '%' && num(raw) === 0) throw new InterpError('Modulo dengan nol', a.line)
        const nv = applyBinary(base, cur, raw, a.line)
        await this.storeTo(a.target, nv, scope)
        return nv
      }
      case 'cond': {
        const c = node as { test: Node; then: Node; other: Node }
        return isTruthy(await this.evalExpr(c.test, scope)) ? await this.evalExpr(c.then, scope) : await this.evalExpr(c.other, scope)
      }
      case 'call': {
        const c = node as { callee: Node; args: Node[]; line: number }
        return this.callByName((c.callee as { id: string }).id, c.args, scope, c.line)
      }
      case 'memberCall': {
        const m = node as { obj: string; prop: string; args: Node[]; line: number }
        if (m.obj !== 'Serial') {
          throw new InterpError(`Objek "${m.obj}.${m.prop}()" tidak didukung (hanya Serial.*)`, m.line)
        }
        const args = await this.evalArgs(m.args, scope)
        return this.serialApi(m.prop, args, m.line)
      }
      case 'index': {
        const ix = node as { obj: Node; index: Node; line: number }
        const base = await this.evalExpr(ix.obj, scope)
        const i = num(await this.evalExpr(ix.index, scope))
        if (!Array.isArray(base)) throw new InterpError('Pengaksesan [i] hanya untuk array', ix.line)
        if (i < 0 || i >= base.length) {
          throw new InterpError(`Index array keluar batas: ${i} sedangkan panjang ${base.length}`, ix.line)
        }
        return base[i]
      }
      case 'member': {
        const m = node as { obj: Node; prop: string; line: number }
        const ov = await this.evalExpr(m.obj, scope)
        if (ov && typeof ov === 'object') return (ov as Record<string, unknown>)[m.prop]
        throw new InterpError(`Anggota "${m.prop}" tidak didukung`, m.line)
      }
    }
    throw new InterpError(`Ekspresi "t=${(node as { t: string }).t}" tidak didukung`)
  }

  private async evalArgs(nodes: Node[], scope: Scope): Promise<unknown[]> {
    const out: unknown[] = []
    for (const n of nodes) out.push(await this.evalExpr(n, scope))
    return out
  }

  private async callByName(name: string, argNodes: Node[], scope: Scope, line: number): Promise<unknown> {
    const fn = this.parser.fns.get(name)
    if (fn) {
      const args = await this.evalArgs(argNodes, scope)
      const ret = await this.runFunction(fn, args)
      // fungsi void yang selesai dengan loop: hindari control stray
      return ret
    }
    const args = await this.evalArgs(argNodes, scope)
    return await this.builtin(name, args, line)
  }

  /* ---------- target penugasan ---------- */

  private async storeTo(target: Node, value: unknown, scope: Scope) {
    if (target.t === 'id') {
      const idNode = target as { id: string; line: number }
      if (!hasVar(scope, idNode.id) && !isArduinoConst(idNode.id)) {
        // toleran: variabel yang belum dideklarasi dibuat otomatis (agar latihan
        // sederhana tetap jalan), meski C nyata mensyaratkan deklarasi
        scope.vars.set(idNode.id, { value, isConst: false, isFloat: false })
        return
      }
      findVar(scope, idNode.id, idNode.line).set(value)
      return
    }
    if (target.t === 'index') {
      const ix = target as { obj: Node; index: Node; line: number }
      if (ix.obj.t !== 'id') throw new InterpError('Penugasan elemen array hanya berupa nama array[i]', ix.line)
      const ref = findVar(scope, (ix.obj as { id: string }).id, ix.line)
      const arr = ref.get()
      if (!Array.isArray(arr)) throw new InterpError(`"${(ix.obj as { id: string }).id}" bukan array`, ix.line)
      const i = num(await this.evalExpr(ix.index, scope))
      if (i < 0) throw new InterpError('Index array harus >= 0', ix.line)
      if (i >= arr.length) {
        if (i >= 4096) throw new InterpError(`Index array terlalu besar (${i})`, ix.line)
        while (arr.length <= i) arr.push(0)
      }
      arr[i] = value
      return
    }
    throw new InterpError('Target penugasan tidak didukung', (target as { line?: number }).line)
  }

  /* ---------- builtin ---------- */

  private async builtin(name: string, args: unknown[], line: number): Promise<unknown> {
    const a0 = () => num(args[0])
    const a1 = () => num(args[1])

    switch (name) {
      case 'pinMode':
        this.hooks.pinMode(a0(), String(args[1]) as PinModeName)
        return 0
      case 'digitalWrite':
        this.hooks.digitalWrite(a0(), a1() !== 0 ? 1 : 0)
        return 0
      case 'digitalRead':
        return this.hooks.digitalRead(a0())
      case 'analogWrite':
        this.hooks.analogWrite(a0(), constrainNum(Math.round(a1()), 0, 255))
        return 0
      case 'analogRead':
        return this.hooks.analogRead(a0())

      case 'delay': {
        const ms = Math.max(0, a0())
        this.tickHadDelay = true
        // tunggu sungguhan (batas 10 detik per panggilan agar ujian tidak macet)
        await this.waitReal(Math.min(ms, 10_000))
        return 0
      }
      case 'delayMicroseconds':
        this.tickHadDelay = true
        return 0
      case 'millis':
        return Math.round(Date.now() - this.startedAt)
      case 'micros':
        return Math.round((Date.now() - this.startedAt) * 1000)

      case 'abs': return Math.abs(a0())
      case 'min': return Math.min(a0(), a1())
      case 'max': return Math.max(a0(), a1())
      case 'sqrt': return Math.sqrt(a0())
      case 'pow': return Math.pow(a0(), a1())
      case 'sin': return Math.sin(a0())
      case 'cos': return Math.cos(a0())
      case 'floor': return Math.floor(a0())
      case 'ceil': return Math.ceil(a0())
      case 'round': return Math.round(a0())
      case 'random': {
        const lo = args.length > 1 ? a0() : 0
        const hi = args.length > 1 ? a1() : args.length === 1 ? a0() : 0
        return Math.floor(Math.random() * (hi - lo)) + lo
      }
      case 'randomSeed':
        return 0
      case 'map': {
        const [x, inMin, inMax, outMin, outMax] = args.map(num)
        return Math.floor(((x - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin)
      }
      case 'constrain':
        return constrainNum(a0(), a1(), num(args[2]))

      case 'attachInterrupt': case 'detachInterrupt':
        forbidden(name, 'interupsi (interrupt) tidak didukung', line)
        return 0
      case 'tone': case 'noTone': case 'pulseIn': case 'shiftOut': case 'shiftIn':
      case 'Serial_printf': case 'printf': case 'itoa': case 'sprintf':
        forbidden(name, 'tidak didukung simulator (gunakan cetrain Serial.print)', line)
        return 0
    }

    throw new InterpError(`Fungsi "${name}()" tidak dikenal — periksa ejaan (huruf besar/kecil)`, line)
  }

  private serialApi(prop: string, args: unknown[], line: number): unknown {
    const fmt = (v: unknown) => {
      if (typeof v === 'number') {
        // Serial.print() Arduino default membulatkan float ke 2 desimal
        return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
      }
      return String(v ?? '')
    }
    switch (prop) {
      case 'begin':
        this.hooks.serialOut(`[Serial dimulai @${args[0]} baud]\n`)
        return 0
      case 'print':
        this.hooks.serialOut(args.map(fmt).join(''))
        return 0
      case 'println':
        this.hooks.serialOut(args.map(fmt).join('') + '\n')
        return 0
      case 'write': {
        const v = args[0]
        this.hooks.serialOut(typeof v === 'string' ? v : String.fromCharCode(num(v)))
        return 0
      }
      case 'available':
        return this.serialIn.length
      case 'read': {
        const s = this.serialIn.shift()
        return s && s.length ? s.charCodeAt(0) : -1
      }
      case 'readString':
        return this.serialIn.shift() ?? ''
      case 'flush': case 'end':
        return 0
    }
    throw new InterpError(`Serial.${prop}() tidak didukung (tapi: print/println/write/available/read/readString)`, line)
  }
}

/* ---------- konstanta & helper nilai ---------- */

const ARDUINO_CONSTS: Record<string, unknown> = {
  HIGH: 1, LOW: 0,
  INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP',
  LED_BUILTIN: 13,
  A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
  PI: Math.PI,
  true: 1, false: 0,
}

function isArduinoConst(id: string) { return id in ARDUINO_CONSTS }

function resolveId(id: string, line: number, scope: Scope): unknown {
  if (id in ARDUINO_CONSTS) return ARDUINO_CONSTS[id]
  let s: Scope | null = scope
  while (s) {
    const rec = s.vars.get(id)
    if (rec) return rec.value
    s = s.parent
  }
  throw new InterpError(`Variabel "${id}" tidak ditemukan (belum dideklarasi)`, line)
}

function hasVar(scope: Scope, id: string): boolean {
  let s: Scope | null = scope
  while (s) {
    if (s.vars.has(id)) return true
    s = s.parent
  }
  return false
}

function isTruthy(v: unknown): boolean {
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v)
  if (typeof v === 'string') return v.length > 0
  return v === true
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return v.length === 1 ? v.charCodeAt(0) : parseFloat(v) || 0
  if (v === true) return 1
  return 0
}

function constrainNum(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function forbidden(name: string, why: string, line: number): never {
  throw new InterpError(`${name}() tidak didukung simulator: ${why}`, line)
}

function applyBinary(op: string, l: unknown, r: unknown, line: number): unknown {
  const ln = num(l)
  const rn = num(r)
  switch (op) {
    case '+':
      if (typeof l === 'string') return l + num(r)
      if (typeof r === 'string') return ln + r
      return ln + rn
    case '-': return ln - rn
    case '*': return ln * rn
    case '/':
      if (rn === 0) { void line; throw new InterpError('Pembagian dengan nol', line) }
      return Number.isInteger(ln) && Number.isInteger(rn) ? Math.trunc(ln / rn) : ln / rn
    case '%':
      if (rn === 0) { throw new InterpError('Modulo dengan nol', line) }
      return ln % rn
    case '==': return eq(l, r) ? 1 : 0
    case '!=': return eq(l, r) ? 0 : 1
    case '<': return ln < rn ? 1 : 0
    case '>': return ln > rn ? 1 : 0
    case '<=': return ln <= rn ? 1 : 0
    case '>=': return ln >= rn ? 1 : 0
    case '&': return ln & rn
    case '|': return ln | rn
    case '^': return ln ^ rn
    case '<<': return ln << rn
    case '>>': return ln >> rn
  }
  throw new InterpError(`Operator "${op}" tidak didukung`, line)
}

function eq(l: unknown, r: unknown): boolean {
  if (typeof l === 'string' || typeof r === 'string') return String(l) === String(r)
  return num(l) === num(r)
}

