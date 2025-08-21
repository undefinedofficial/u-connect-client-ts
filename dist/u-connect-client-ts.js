var z = Object.defineProperty;
var O = (r, e, t) => e in r ? z(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t;
var a = (r, e, t) => O(r, typeof e != "symbol" ? e + "" : e, t);
class N {
  constructor() {
    a(this, "isOpen", !0);
    a(this, "InvokeEnd");
    a(this, "InvokeMessage");
    a(this, "InvokeError");
  }
  onError(e) {
    return this.InvokeError = e, this.isOpen || e(new Error("Transport closed")), this;
  }
  onMessage(e) {
    return this.InvokeMessage = e, this;
  }
  onEnd(e) {
    return this.InvokeEnd = e, this;
  }
  close() {
    var e;
    this.isOpen = !1, (e = this.InvokeError) == null || e.call(this, new Error("Transport closed"));
  }
}
var d = /* @__PURE__ */ ((r) => (r[r.CONNECT = 1] = "CONNECT", r[r.DISCONNECT = 2] = "DISCONNECT", r[r.UNARY_CLIENT = 3] = "UNARY_CLIENT", r[r.UNARY_SERVER = 4] = "UNARY_SERVER", r[r.STREAM_CLIENT = 5] = "STREAM_CLIENT", r[r.STREAM_SERVER = 6] = "STREAM_SERVER", r[r.STREAM_DUPLEX = 7] = "STREAM_DUPLEX", r[r.STREAM_END = 8] = "STREAM_END", r[r.ABORT = 9] = "ABORT", r))(d || {});
class A {
  constructor() {
    a(this, "_value");
    a(this, "_error");
    a(this, "_resolve");
    a(this, "_reject");
    a(this, "_task");
  }
  /**
   * Check if the PromiseValue has a stored value or error.
   * @return {boolean} true if the PromiseValue has a stored value or error, false otherwise
   */
  has() {
    return this.hasValue() || this.hasError();
  }
  /**
   * Check if the PromiseValue has a stored value.
   * @return {boolean} true if the value is not undefined, false otherwise
   */
  hasValue() {
    return this._value !== void 0;
  }
  /**
   * Check if the PromiseValue has an error stored.
   * @return {boolean} true if the error is not undefined, false otherwise
   */
  hasError() {
    return this._error !== void 0;
  }
  /**
   * Wait for the PromiseValue to resolve.
   * @return {Promise<T>} A Promise that resolves with the value or rejects with the error.
   */
  value() {
    return this._value ? Promise.resolve(this._value) : this._error ? Promise.reject(this._error) : (this._task || (this._task = new Promise((e, t) => {
      this._resolve = e, this._reject = t;
    })), this._task);
  }
  /**
   * Resolves the promise with the given value.
   * @param {T} value - The value to resolve the promise with.
   */
  resolve(e) {
    var t;
    this._value = e, (t = this._resolve) == null || t.call(this, e);
  }
  /**
   * A method to reject the promise with an error.
   * @param {Error} error - The error to reject the promise with.
   */
  reject(e) {
    var t;
    this._error = e, (t = this._reject) == null || t.call(this, e);
  }
}
class R {
  constructor(e, t, i) {
    a(this, "_result");
    a(this, "_next");
    this._transport = e, this.id = t, this.method = i, this._result = new A(), this._next = new A();
  }
  async send(e) {
    var t;
    return this._result.has() ? Promise.reject("u-connect-client-ts: client stream error") : ((t = this._next) != null && t.has() && await this._next.value(), this._next = new A(), this._transport.send({ id: this.id, type: d.STREAM_CLIENT, method: this.method, request: e }), this._next.value());
  }
  async complete() {
    return this._transport.send({ id: this.id, type: d.STREAM_END, method: this.method }), this._result.value();
  }
  result(e) {
    this._result.resolve(e);
  }
  next() {
    var e;
    (e = this._next) == null || e.resolve();
  }
  error(e) {
    var t;
    this._result.reject(e), (t = this._next) == null || t.reject(e);
  }
  close() {
    var t;
    const e = new Error("Transport closed");
    this._result.reject(e), (t = this._next) == null || t.reject(e);
  }
}
class x extends Error {
  constructor(e, t) {
    super(t), this.status = e, this.name = "MethodError";
  }
}
var f = /* @__PURE__ */ ((r) => (r[r.OK = 0] = "OK", r[r.CANCELLED = 1] = "CANCELLED", r[r.UNKNOWN = 2] = "UNKNOWN", r[r.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", r[r.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", r[r.NOT_FOUND = 5] = "NOT_FOUND", r[r.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", r[r.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", r[r.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", r[r.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", r[r.ABORTED = 10] = "ABORTED", r[r.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", r[r.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", r[r.INTERNAL = 13] = "INTERNAL", r[r.UNAVAILABLE = 14] = "UNAVAILABLE", r[r.DATA_LOSS = 15] = "DATA_LOSS", r[r.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", r))(f || {});
class $ {
  constructor(e, t, i) {
    this._transport = e, this._service = t, this._idProvider = i;
  }
  unary(e, t, i) {
    return this._transport.sendRequest(
      {
        id: this._idProvider.getId(),
        method: `${this._service}.${e}`,
        type: d.UNARY_CLIENT,
        request: t,
        meta: i == null ? void 0 : i.meta
      },
      i
    ).then((s) => ({
      method: s.method,
      response: s.response,
      status: s.status,
      meta: s.meta
    }));
  }
  clientStream(e, t) {
    const i = this._idProvider.getId(), s = `${this._service}.${e}`, n = new R(this._transport, i, s);
    return this._transport.sendRequest(
      { id: i, method: `${this._service}.${e}`, type: d.STREAM_CLIENT, request: null, meta: t == null ? void 0 : t.meta },
      t,
      (o) => {
        if (o.type === d.STREAM_CLIENT) return n.next();
        n.error(new x(f.INTERNAL, "Internal server error"));
      }
    ).then(
      (o) => n.result({
        method: o.method,
        response: o.response,
        status: o.status,
        meta: o.meta
      })
    ).catch((o) => n.error(o)), n;
  }
  serverStream(e, t, i) {
    const s = new N();
    return this._transport.sendRequest(
      {
        id: this._idProvider.getId(),
        type: d.STREAM_SERVER,
        method: `${this._service}.${e}`,
        request: t,
        meta: i == null ? void 0 : i.meta
      },
      i,
      (n) => {
        var o, c;
        if (n.type === d.STREAM_SERVER) return (o = s.InvokeMessage) == null ? void 0 : o.call(s, n.response);
        (c = s.InvokeError) == null || c.call(s, new x(f.INTERNAL, "Internal server error"));
      }
    ).then((n) => {
      var o;
      return (o = s.InvokeEnd) == null ? void 0 : o.call(s, n);
    }).catch((n) => {
      var o;
      return (o = s.InvokeError) == null ? void 0 : o.call(s, n);
    }), s;
  }
  duplex(e, t) {
    const i = this._idProvider.getId(), s = `${this._service}.${e}`, n = new R(this._transport, i, s), o = new N(), c = {
      complete() {
        return n.complete();
      },
      send(h) {
        return n.send(h);
      },
      onMessage(h) {
        o.onMessage(h);
      },
      onError(h) {
        o.onError(h);
      },
      onEnd(h) {
        o.onEnd(h);
      }
    };
    return this._transport.sendRequest(
      { id: i, method: s, type: d.STREAM_DUPLEX, meta: t == null ? void 0 : t.meta },
      t,
      (h) => {
        var w, E;
        if (h.type === d.STREAM_CLIENT) return n.next();
        if (h.type === d.STREAM_SERVER) return (w = o.InvokeMessage) == null ? void 0 : w.call(o, h.response);
        const l = new x(f.INTERNAL, "Internal server error");
        n.error(l), (E = o.InvokeError) == null || E.call(o, l);
      }
    ).then((h) => {
      var w;
      const l = {
        method: h.method,
        response: h.response,
        status: h.status,
        meta: h.meta
      };
      n.result(l), (w = o.InvokeEnd) == null || w.call(o, l);
    }).catch((h) => {
      var l;
      n.error(h), (l = o.InvokeError) == null || l.call(o, h);
    }), c;
  }
}
function F(r) {
  const e = r.length;
  let t = 0, i = 0;
  for (; i < e; ) {
    let s = r.charCodeAt(i++);
    if (s & 4294967168)
      if (!(s & 4294965248))
        t += 2;
      else {
        if (s >= 55296 && s <= 56319 && i < e) {
          const n = r.charCodeAt(i);
          (n & 64512) === 56320 && (++i, s = ((s & 1023) << 10) + (n & 1023) + 65536);
        }
        s & 4294901760 ? t += 4 : t += 3;
      }
    else {
      t++;
      continue;
    }
  }
  return t;
}
function b(r, e, t) {
  const i = r.length;
  let s = t, n = 0;
  for (; n < i; ) {
    let o = r.charCodeAt(n++);
    if (o & 4294967168)
      if (!(o & 4294965248))
        e[s++] = o >> 6 & 31 | 192;
      else {
        if (o >= 55296 && o <= 56319 && n < i) {
          const c = r.charCodeAt(n);
          (c & 64512) === 56320 && (++n, o = ((o & 1023) << 10) + (c & 1023) + 65536);
        }
        o & 4294901760 ? (e[s++] = o >> 18 & 7 | 240, e[s++] = o >> 12 & 63 | 128, e[s++] = o >> 6 & 63 | 128) : (e[s++] = o >> 12 & 15 | 224, e[s++] = o >> 6 & 63 | 128);
      }
    else {
      e[s++] = o;
      continue;
    }
    e[s++] = o & 63 | 128;
  }
}
const H = new TextEncoder(), V = 50;
function K(r, e, t) {
  H.encodeInto(r, e.subarray(t));
}
function W(r, e, t) {
  r.length > V ? K(r, e, t) : b(r, e, t);
}
const X = 4096;
function D(r, e, t) {
  let i = e;
  const s = i + t, n = [];
  let o = "";
  for (; i < s; ) {
    const c = r[i++];
    if (!(c & 128))
      n.push(c);
    else if ((c & 224) === 192) {
      const h = r[i++] & 63;
      n.push((c & 31) << 6 | h);
    } else if ((c & 240) === 224) {
      const h = r[i++] & 63, l = r[i++] & 63;
      n.push((c & 31) << 12 | h << 6 | l);
    } else if ((c & 248) === 240) {
      const h = r[i++] & 63, l = r[i++] & 63, w = r[i++] & 63;
      let E = (c & 7) << 18 | h << 12 | l << 6 | w;
      E > 65535 && (E -= 65536, n.push(E >>> 10 & 1023 | 55296), E = 56320 | E & 1023), n.push(E);
    } else
      n.push(c);
    n.length >= X && (o += String.fromCharCode(...n), n.length = 0);
  }
  return n.length > 0 && (o += String.fromCharCode(...n)), o;
}
const q = new TextDecoder(), Y = 200;
function G(r, e, t) {
  const i = r.subarray(e, e + t);
  return q.decode(i);
}
function J(r, e, t) {
  return t > Y ? G(r, e, t) : D(r, e, t);
}
class m {
  constructor(e, t) {
    this.type = e, this.data = t;
  }
}
class u extends Error {
  constructor(e) {
    super(e);
    const t = Object.create(u.prototype);
    Object.setPrototypeOf(this, t), Object.defineProperty(this, "name", {
      configurable: !0,
      enumerable: !1,
      value: u.name
    });
  }
}
const g = 4294967295;
function Z(r, e, t) {
  const i = t / 4294967296, s = t;
  r.setUint32(e, i), r.setUint32(e + 4, s);
}
function M(r, e, t) {
  const i = Math.floor(t / 4294967296), s = t;
  r.setUint32(e, i), r.setUint32(e + 4, s);
}
function C(r, e) {
  const t = r.getInt32(e), i = r.getUint32(e + 4);
  return t * 4294967296 + i;
}
function Q(r, e) {
  const t = r.getUint32(e), i = r.getUint32(e + 4);
  return t * 4294967296 + i;
}
const j = -1, ee = 4294967296 - 1, te = 17179869184 - 1;
function se({ sec: r, nsec: e }) {
  if (r >= 0 && e >= 0 && r <= te)
    if (e === 0 && r <= ee) {
      const t = new Uint8Array(4);
      return new DataView(t.buffer).setUint32(0, r), t;
    } else {
      const t = r / 4294967296, i = r & 4294967295, s = new Uint8Array(8), n = new DataView(s.buffer);
      return n.setUint32(0, e << 2 | t & 3), n.setUint32(4, i), s;
    }
  else {
    const t = new Uint8Array(12), i = new DataView(t.buffer);
    return i.setUint32(0, e), M(i, 4, r), t;
  }
}
function ie(r) {
  const e = r.getTime(), t = Math.floor(e / 1e3), i = (e - t * 1e3) * 1e6, s = Math.floor(i / 1e9);
  return {
    sec: t + s,
    nsec: i - s * 1e9
  };
}
function re(r) {
  if (r instanceof Date) {
    const e = ie(r);
    return se(e);
  } else
    return null;
}
function ne(r) {
  const e = new DataView(r.buffer, r.byteOffset, r.byteLength);
  switch (r.byteLength) {
    case 4:
      return { sec: e.getUint32(0), nsec: 0 };
    case 8: {
      const t = e.getUint32(0), i = e.getUint32(4), s = (t & 3) * 4294967296 + i, n = t >>> 2;
      return { sec: s, nsec: n };
    }
    case 12: {
      const t = C(e, 4), i = e.getUint32(0);
      return { sec: t, nsec: i };
    }
    default:
      throw new u(`Unrecognized data size for timestamp (expected 4, 8, or 12): ${r.length}`);
  }
}
function oe(r) {
  const e = ne(r);
  return new Date(e.sec * 1e3 + e.nsec / 1e6);
}
const he = {
  type: j,
  encode: re,
  decode: oe
};
class I {
  constructor() {
    this.builtInEncoders = [], this.builtInDecoders = [], this.encoders = [], this.decoders = [], this.register(he);
  }
  register({ type: e, encode: t, decode: i }) {
    if (e >= 0)
      this.encoders[e] = t, this.decoders[e] = i;
    else {
      const s = -1 - e;
      this.builtInEncoders[s] = t, this.builtInDecoders[s] = i;
    }
  }
  tryToEncode(e, t) {
    for (let i = 0; i < this.builtInEncoders.length; i++) {
      const s = this.builtInEncoders[i];
      if (s != null) {
        const n = s(e, t);
        if (n != null) {
          const o = -1 - i;
          return new m(o, n);
        }
      }
    }
    for (let i = 0; i < this.encoders.length; i++) {
      const s = this.encoders[i];
      if (s != null) {
        const n = s(e, t);
        if (n != null) {
          const o = i;
          return new m(o, n);
        }
      }
    }
    return e instanceof m ? e : null;
  }
  decode(e, t, i) {
    const s = t < 0 ? this.builtInDecoders[-1 - t] : this.decoders[t];
    return s ? s(e, t, i) : new m(t, e);
  }
}
I.defaultCodec = new I();
function ce(r) {
  return r instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && r instanceof SharedArrayBuffer;
}
function S(r) {
  return r instanceof Uint8Array ? r : ArrayBuffer.isView(r) ? new Uint8Array(r.buffer, r.byteOffset, r.byteLength) : ce(r) ? new Uint8Array(r) : Uint8Array.from(r);
}
const ae = 100, de = 2048;
class v {
  constructor(e) {
    this.entered = !1, this.extensionCodec = (e == null ? void 0 : e.extensionCodec) ?? I.defaultCodec, this.context = e == null ? void 0 : e.context, this.useBigInt64 = (e == null ? void 0 : e.useBigInt64) ?? !1, this.maxDepth = (e == null ? void 0 : e.maxDepth) ?? ae, this.initialBufferSize = (e == null ? void 0 : e.initialBufferSize) ?? de, this.sortKeys = (e == null ? void 0 : e.sortKeys) ?? !1, this.forceFloat32 = (e == null ? void 0 : e.forceFloat32) ?? !1, this.ignoreUndefined = (e == null ? void 0 : e.ignoreUndefined) ?? !1, this.forceIntegerToFloat = (e == null ? void 0 : e.forceIntegerToFloat) ?? !1, this.pos = 0, this.view = new DataView(new ArrayBuffer(this.initialBufferSize)), this.bytes = new Uint8Array(this.view.buffer);
  }
  clone() {
    return new v({
      extensionCodec: this.extensionCodec,
      context: this.context,
      useBigInt64: this.useBigInt64,
      maxDepth: this.maxDepth,
      initialBufferSize: this.initialBufferSize,
      sortKeys: this.sortKeys,
      forceFloat32: this.forceFloat32,
      ignoreUndefined: this.ignoreUndefined,
      forceIntegerToFloat: this.forceIntegerToFloat
    });
  }
  reinitializeState() {
    this.pos = 0;
  }
  /**
   * This is almost equivalent to {@link Encoder#encode}, but it returns an reference of the encoder's internal buffer and thus much faster than {@link Encoder#encode}.
   *
   * @returns Encodes the object and returns a shared reference the encoder's internal buffer.
   */
  encodeSharedRef(e) {
    if (this.entered)
      return this.clone().encodeSharedRef(e);
    try {
      return this.entered = !0, this.reinitializeState(), this.doEncode(e, 1), this.bytes.subarray(0, this.pos);
    } finally {
      this.entered = !1;
    }
  }
  /**
   * @returns Encodes the object and returns a copy of the encoder's internal buffer.
   */
  encode(e) {
    if (this.entered)
      return this.clone().encode(e);
    try {
      return this.entered = !0, this.reinitializeState(), this.doEncode(e, 1), this.bytes.slice(0, this.pos);
    } finally {
      this.entered = !1;
    }
  }
  doEncode(e, t) {
    if (t > this.maxDepth)
      throw new Error(`Too deep objects in depth ${t}`);
    e == null ? this.encodeNil() : typeof e == "boolean" ? this.encodeBoolean(e) : typeof e == "number" ? this.forceIntegerToFloat ? this.encodeNumberAsFloat(e) : this.encodeNumber(e) : typeof e == "string" ? this.encodeString(e) : this.useBigInt64 && typeof e == "bigint" ? this.encodeBigInt64(e) : this.encodeObject(e, t);
  }
  ensureBufferSizeToWrite(e) {
    const t = this.pos + e;
    this.view.byteLength < t && this.resizeBuffer(t * 2);
  }
  resizeBuffer(e) {
    const t = new ArrayBuffer(e), i = new Uint8Array(t), s = new DataView(t);
    i.set(this.bytes), this.view = s, this.bytes = i;
  }
  encodeNil() {
    this.writeU8(192);
  }
  encodeBoolean(e) {
    e === !1 ? this.writeU8(194) : this.writeU8(195);
  }
  encodeNumber(e) {
    !this.forceIntegerToFloat && Number.isSafeInteger(e) ? e >= 0 ? e < 128 ? this.writeU8(e) : e < 256 ? (this.writeU8(204), this.writeU8(e)) : e < 65536 ? (this.writeU8(205), this.writeU16(e)) : e < 4294967296 ? (this.writeU8(206), this.writeU32(e)) : this.useBigInt64 ? this.encodeNumberAsFloat(e) : (this.writeU8(207), this.writeU64(e)) : e >= -32 ? this.writeU8(224 | e + 32) : e >= -128 ? (this.writeU8(208), this.writeI8(e)) : e >= -32768 ? (this.writeU8(209), this.writeI16(e)) : e >= -2147483648 ? (this.writeU8(210), this.writeI32(e)) : this.useBigInt64 ? this.encodeNumberAsFloat(e) : (this.writeU8(211), this.writeI64(e)) : this.encodeNumberAsFloat(e);
  }
  encodeNumberAsFloat(e) {
    this.forceFloat32 ? (this.writeU8(202), this.writeF32(e)) : (this.writeU8(203), this.writeF64(e));
  }
  encodeBigInt64(e) {
    e >= BigInt(0) ? (this.writeU8(207), this.writeBigUint64(e)) : (this.writeU8(211), this.writeBigInt64(e));
  }
  writeStringHeader(e) {
    if (e < 32)
      this.writeU8(160 + e);
    else if (e < 256)
      this.writeU8(217), this.writeU8(e);
    else if (e < 65536)
      this.writeU8(218), this.writeU16(e);
    else if (e < 4294967296)
      this.writeU8(219), this.writeU32(e);
    else
      throw new Error(`Too long string: ${e} bytes in UTF-8`);
  }
  encodeString(e) {
    const i = F(e);
    this.ensureBufferSizeToWrite(5 + i), this.writeStringHeader(i), W(e, this.bytes, this.pos), this.pos += i;
  }
  encodeObject(e, t) {
    const i = this.extensionCodec.tryToEncode(e, this.context);
    if (i != null)
      this.encodeExtension(i);
    else if (Array.isArray(e))
      this.encodeArray(e, t);
    else if (ArrayBuffer.isView(e))
      this.encodeBinary(e);
    else if (typeof e == "object")
      this.encodeMap(e, t);
    else
      throw new Error(`Unrecognized object: ${Object.prototype.toString.apply(e)}`);
  }
  encodeBinary(e) {
    const t = e.byteLength;
    if (t < 256)
      this.writeU8(196), this.writeU8(t);
    else if (t < 65536)
      this.writeU8(197), this.writeU16(t);
    else if (t < 4294967296)
      this.writeU8(198), this.writeU32(t);
    else
      throw new Error(`Too large binary: ${t}`);
    const i = S(e);
    this.writeU8a(i);
  }
  encodeArray(e, t) {
    const i = e.length;
    if (i < 16)
      this.writeU8(144 + i);
    else if (i < 65536)
      this.writeU8(220), this.writeU16(i);
    else if (i < 4294967296)
      this.writeU8(221), this.writeU32(i);
    else
      throw new Error(`Too large array: ${i}`);
    for (const s of e)
      this.doEncode(s, t + 1);
  }
  countWithoutUndefined(e, t) {
    let i = 0;
    for (const s of t)
      e[s] !== void 0 && i++;
    return i;
  }
  encodeMap(e, t) {
    const i = Object.keys(e);
    this.sortKeys && i.sort();
    const s = this.ignoreUndefined ? this.countWithoutUndefined(e, i) : i.length;
    if (s < 16)
      this.writeU8(128 + s);
    else if (s < 65536)
      this.writeU8(222), this.writeU16(s);
    else if (s < 4294967296)
      this.writeU8(223), this.writeU32(s);
    else
      throw new Error(`Too large map object: ${s}`);
    for (const n of i) {
      const o = e[n];
      this.ignoreUndefined && o === void 0 || (this.encodeString(n), this.doEncode(o, t + 1));
    }
  }
  encodeExtension(e) {
    if (typeof e.data == "function") {
      const i = e.data(this.pos + 6), s = i.length;
      if (s >= 4294967296)
        throw new Error(`Too large extension object: ${s}`);
      this.writeU8(201), this.writeU32(s), this.writeI8(e.type), this.writeU8a(i);
      return;
    }
    const t = e.data.length;
    if (t === 1)
      this.writeU8(212);
    else if (t === 2)
      this.writeU8(213);
    else if (t === 4)
      this.writeU8(214);
    else if (t === 8)
      this.writeU8(215);
    else if (t === 16)
      this.writeU8(216);
    else if (t < 256)
      this.writeU8(199), this.writeU8(t);
    else if (t < 65536)
      this.writeU8(200), this.writeU16(t);
    else if (t < 4294967296)
      this.writeU8(201), this.writeU32(t);
    else
      throw new Error(`Too large extension object: ${t}`);
    this.writeI8(e.type), this.writeU8a(e.data);
  }
  writeU8(e) {
    this.ensureBufferSizeToWrite(1), this.view.setUint8(this.pos, e), this.pos++;
  }
  writeU8a(e) {
    const t = e.length;
    this.ensureBufferSizeToWrite(t), this.bytes.set(e, this.pos), this.pos += t;
  }
  writeI8(e) {
    this.ensureBufferSizeToWrite(1), this.view.setInt8(this.pos, e), this.pos++;
  }
  writeU16(e) {
    this.ensureBufferSizeToWrite(2), this.view.setUint16(this.pos, e), this.pos += 2;
  }
  writeI16(e) {
    this.ensureBufferSizeToWrite(2), this.view.setInt16(this.pos, e), this.pos += 2;
  }
  writeU32(e) {
    this.ensureBufferSizeToWrite(4), this.view.setUint32(this.pos, e), this.pos += 4;
  }
  writeI32(e) {
    this.ensureBufferSizeToWrite(4), this.view.setInt32(this.pos, e), this.pos += 4;
  }
  writeF32(e) {
    this.ensureBufferSizeToWrite(4), this.view.setFloat32(this.pos, e), this.pos += 4;
  }
  writeF64(e) {
    this.ensureBufferSizeToWrite(8), this.view.setFloat64(this.pos, e), this.pos += 8;
  }
  writeU64(e) {
    this.ensureBufferSizeToWrite(8), Z(this.view, this.pos, e), this.pos += 8;
  }
  writeI64(e) {
    this.ensureBufferSizeToWrite(8), M(this.view, this.pos, e), this.pos += 8;
  }
  writeBigUint64(e) {
    this.ensureBufferSizeToWrite(8), this.view.setBigUint64(this.pos, e), this.pos += 8;
  }
  writeBigInt64(e) {
    this.ensureBufferSizeToWrite(8), this.view.setBigInt64(this.pos, e), this.pos += 8;
  }
}
function le(r, e) {
  return new v(e).encodeSharedRef(r);
}
function T(r) {
  return `${r < 0 ? "-" : ""}0x${Math.abs(r).toString(16).padStart(2, "0")}`;
}
const fe = 16, ue = 16;
class Ee {
  constructor(e = fe, t = ue) {
    this.hit = 0, this.miss = 0, this.maxKeyLength = e, this.maxLengthPerKey = t, this.caches = [];
    for (let i = 0; i < this.maxKeyLength; i++)
      this.caches.push([]);
  }
  canBeCached(e) {
    return e > 0 && e <= this.maxKeyLength;
  }
  find(e, t, i) {
    const s = this.caches[i - 1];
    e: for (const n of s) {
      const o = n.bytes;
      for (let c = 0; c < i; c++)
        if (o[c] !== e[t + c])
          continue e;
      return n.str;
    }
    return null;
  }
  store(e, t) {
    const i = this.caches[e.length - 1], s = { bytes: e, str: t };
    i.length >= this.maxLengthPerKey ? i[Math.random() * i.length | 0] = s : i.push(s);
  }
  decode(e, t, i) {
    const s = this.find(e, t, i);
    if (s != null)
      return this.hit++, s;
    this.miss++;
    const n = D(e, t, i), o = Uint8Array.prototype.slice.call(e, t, t + i);
    return this.store(o, n), n;
  }
}
const p = "array", U = "map_key", P = "map_value", xe = (r) => {
  if (typeof r == "string" || typeof r == "number")
    return r;
  throw new u("The type of key must be string or number but " + typeof r);
};
class we {
  constructor() {
    this.stack = [], this.stackHeadPosition = -1;
  }
  get length() {
    return this.stackHeadPosition + 1;
  }
  top() {
    return this.stack[this.stackHeadPosition];
  }
  pushArrayState(e) {
    const t = this.getUninitializedStateFromPool();
    t.type = p, t.position = 0, t.size = e, t.array = new Array(e);
  }
  pushMapState(e) {
    const t = this.getUninitializedStateFromPool();
    t.type = U, t.readCount = 0, t.size = e, t.map = {};
  }
  getUninitializedStateFromPool() {
    if (this.stackHeadPosition++, this.stackHeadPosition === this.stack.length) {
      const e = {
        type: void 0,
        size: 0,
        array: void 0,
        position: 0,
        readCount: 0,
        map: void 0,
        key: null
      };
      this.stack.push(e);
    }
    return this.stack[this.stackHeadPosition];
  }
  release(e) {
    if (this.stack[this.stackHeadPosition] !== e)
      throw new Error("Invalid stack state. Released state is not on top of the stack.");
    if (e.type === p) {
      const i = e;
      i.size = 0, i.array = void 0, i.position = 0, i.type = void 0;
    }
    if (e.type === U || e.type === P) {
      const i = e;
      i.size = 0, i.map = void 0, i.readCount = 0, i.type = void 0;
    }
    this.stackHeadPosition--;
  }
  reset() {
    this.stack.length = 0, this.stackHeadPosition = -1;
  }
}
const y = -1, B = new DataView(new ArrayBuffer(0)), _e = new Uint8Array(B.buffer);
try {
  B.getInt8(0);
} catch (r) {
  if (!(r instanceof RangeError))
    throw new Error("This module is not supported in the current JavaScript engine because DataView does not throw RangeError on out-of-bounds access");
}
const L = new RangeError("Insufficient data"), ge = new Ee();
class k {
  constructor(e) {
    this.totalPos = 0, this.pos = 0, this.view = B, this.bytes = _e, this.headByte = y, this.stack = new we(), this.entered = !1, this.extensionCodec = (e == null ? void 0 : e.extensionCodec) ?? I.defaultCodec, this.context = e == null ? void 0 : e.context, this.useBigInt64 = (e == null ? void 0 : e.useBigInt64) ?? !1, this.rawStrings = (e == null ? void 0 : e.rawStrings) ?? !1, this.maxStrLength = (e == null ? void 0 : e.maxStrLength) ?? g, this.maxBinLength = (e == null ? void 0 : e.maxBinLength) ?? g, this.maxArrayLength = (e == null ? void 0 : e.maxArrayLength) ?? g, this.maxMapLength = (e == null ? void 0 : e.maxMapLength) ?? g, this.maxExtLength = (e == null ? void 0 : e.maxExtLength) ?? g, this.keyDecoder = (e == null ? void 0 : e.keyDecoder) !== void 0 ? e.keyDecoder : ge, this.mapKeyConverter = (e == null ? void 0 : e.mapKeyConverter) ?? xe;
  }
  clone() {
    return new k({
      extensionCodec: this.extensionCodec,
      context: this.context,
      useBigInt64: this.useBigInt64,
      rawStrings: this.rawStrings,
      maxStrLength: this.maxStrLength,
      maxBinLength: this.maxBinLength,
      maxArrayLength: this.maxArrayLength,
      maxMapLength: this.maxMapLength,
      maxExtLength: this.maxExtLength,
      keyDecoder: this.keyDecoder
    });
  }
  reinitializeState() {
    this.totalPos = 0, this.headByte = y, this.stack.reset();
  }
  setBuffer(e) {
    const t = S(e);
    this.bytes = t, this.view = new DataView(t.buffer, t.byteOffset, t.byteLength), this.pos = 0;
  }
  appendBuffer(e) {
    if (this.headByte === y && !this.hasRemaining(1))
      this.setBuffer(e);
    else {
      const t = this.bytes.subarray(this.pos), i = S(e), s = new Uint8Array(t.length + i.length);
      s.set(t), s.set(i, t.length), this.setBuffer(s);
    }
  }
  hasRemaining(e) {
    return this.view.byteLength - this.pos >= e;
  }
  createExtraByteError(e) {
    const { view: t, pos: i } = this;
    return new RangeError(`Extra ${t.byteLength - i} of ${t.byteLength} byte(s) found at buffer[${e}]`);
  }
  /**
   * @throws {@link DecodeError}
   * @throws {@link RangeError}
   */
  decode(e) {
    if (this.entered)
      return this.clone().decode(e);
    try {
      this.entered = !0, this.reinitializeState(), this.setBuffer(e);
      const t = this.doDecodeSync();
      if (this.hasRemaining(1))
        throw this.createExtraByteError(this.pos);
      return t;
    } finally {
      this.entered = !1;
    }
  }
  *decodeMulti(e) {
    if (this.entered) {
      yield* this.clone().decodeMulti(e);
      return;
    }
    try {
      for (this.entered = !0, this.reinitializeState(), this.setBuffer(e); this.hasRemaining(1); )
        yield this.doDecodeSync();
    } finally {
      this.entered = !1;
    }
  }
  async decodeAsync(e) {
    if (this.entered)
      return this.clone().decodeAsync(e);
    try {
      this.entered = !0;
      let t = !1, i;
      for await (const c of e) {
        if (t)
          throw this.entered = !1, this.createExtraByteError(this.totalPos);
        this.appendBuffer(c);
        try {
          i = this.doDecodeSync(), t = !0;
        } catch (h) {
          if (!(h instanceof RangeError))
            throw h;
        }
        this.totalPos += this.pos;
      }
      if (t) {
        if (this.hasRemaining(1))
          throw this.createExtraByteError(this.totalPos);
        return i;
      }
      const { headByte: s, pos: n, totalPos: o } = this;
      throw new RangeError(`Insufficient data in parsing ${T(s)} at ${o} (${n} in the current buffer)`);
    } finally {
      this.entered = !1;
    }
  }
  decodeArrayStream(e) {
    return this.decodeMultiAsync(e, !0);
  }
  decodeStream(e) {
    return this.decodeMultiAsync(e, !1);
  }
  async *decodeMultiAsync(e, t) {
    if (this.entered) {
      yield* this.clone().decodeMultiAsync(e, t);
      return;
    }
    try {
      this.entered = !0;
      let i = t, s = -1;
      for await (const n of e) {
        if (t && s === 0)
          throw this.createExtraByteError(this.totalPos);
        this.appendBuffer(n), i && (s = this.readArraySize(), i = !1, this.complete());
        try {
          for (; yield this.doDecodeSync(), --s !== 0; )
            ;
        } catch (o) {
          if (!(o instanceof RangeError))
            throw o;
        }
        this.totalPos += this.pos;
      }
    } finally {
      this.entered = !1;
    }
  }
  doDecodeSync() {
    e: for (; ; ) {
      const e = this.readHeadByte();
      let t;
      if (e >= 224)
        t = e - 256;
      else if (e < 192)
        if (e < 128)
          t = e;
        else if (e < 144) {
          const s = e - 128;
          if (s !== 0) {
            this.pushMapState(s), this.complete();
            continue e;
          } else
            t = {};
        } else if (e < 160) {
          const s = e - 144;
          if (s !== 0) {
            this.pushArrayState(s), this.complete();
            continue e;
          } else
            t = [];
        } else {
          const s = e - 160;
          t = this.decodeString(s, 0);
        }
      else if (e === 192)
        t = null;
      else if (e === 194)
        t = !1;
      else if (e === 195)
        t = !0;
      else if (e === 202)
        t = this.readF32();
      else if (e === 203)
        t = this.readF64();
      else if (e === 204)
        t = this.readU8();
      else if (e === 205)
        t = this.readU16();
      else if (e === 206)
        t = this.readU32();
      else if (e === 207)
        this.useBigInt64 ? t = this.readU64AsBigInt() : t = this.readU64();
      else if (e === 208)
        t = this.readI8();
      else if (e === 209)
        t = this.readI16();
      else if (e === 210)
        t = this.readI32();
      else if (e === 211)
        this.useBigInt64 ? t = this.readI64AsBigInt() : t = this.readI64();
      else if (e === 217) {
        const s = this.lookU8();
        t = this.decodeString(s, 1);
      } else if (e === 218) {
        const s = this.lookU16();
        t = this.decodeString(s, 2);
      } else if (e === 219) {
        const s = this.lookU32();
        t = this.decodeString(s, 4);
      } else if (e === 220) {
        const s = this.readU16();
        if (s !== 0) {
          this.pushArrayState(s), this.complete();
          continue e;
        } else
          t = [];
      } else if (e === 221) {
        const s = this.readU32();
        if (s !== 0) {
          this.pushArrayState(s), this.complete();
          continue e;
        } else
          t = [];
      } else if (e === 222) {
        const s = this.readU16();
        if (s !== 0) {
          this.pushMapState(s), this.complete();
          continue e;
        } else
          t = {};
      } else if (e === 223) {
        const s = this.readU32();
        if (s !== 0) {
          this.pushMapState(s), this.complete();
          continue e;
        } else
          t = {};
      } else if (e === 196) {
        const s = this.lookU8();
        t = this.decodeBinary(s, 1);
      } else if (e === 197) {
        const s = this.lookU16();
        t = this.decodeBinary(s, 2);
      } else if (e === 198) {
        const s = this.lookU32();
        t = this.decodeBinary(s, 4);
      } else if (e === 212)
        t = this.decodeExtension(1, 0);
      else if (e === 213)
        t = this.decodeExtension(2, 0);
      else if (e === 214)
        t = this.decodeExtension(4, 0);
      else if (e === 215)
        t = this.decodeExtension(8, 0);
      else if (e === 216)
        t = this.decodeExtension(16, 0);
      else if (e === 199) {
        const s = this.lookU8();
        t = this.decodeExtension(s, 1);
      } else if (e === 200) {
        const s = this.lookU16();
        t = this.decodeExtension(s, 2);
      } else if (e === 201) {
        const s = this.lookU32();
        t = this.decodeExtension(s, 4);
      } else
        throw new u(`Unrecognized type byte: ${T(e)}`);
      this.complete();
      const i = this.stack;
      for (; i.length > 0; ) {
        const s = i.top();
        if (s.type === p)
          if (s.array[s.position] = t, s.position++, s.position === s.size)
            t = s.array, i.release(s);
          else
            continue e;
        else if (s.type === U) {
          if (t === "__proto__")
            throw new u("The key __proto__ is not allowed");
          s.key = this.mapKeyConverter(t), s.type = P;
          continue e;
        } else if (s.map[s.key] = t, s.readCount++, s.readCount === s.size)
          t = s.map, i.release(s);
        else {
          s.key = null, s.type = U;
          continue e;
        }
      }
      return t;
    }
  }
  readHeadByte() {
    return this.headByte === y && (this.headByte = this.readU8()), this.headByte;
  }
  complete() {
    this.headByte = y;
  }
  readArraySize() {
    const e = this.readHeadByte();
    switch (e) {
      case 220:
        return this.readU16();
      case 221:
        return this.readU32();
      default: {
        if (e < 160)
          return e - 144;
        throw new u(`Unrecognized array type byte: ${T(e)}`);
      }
    }
  }
  pushMapState(e) {
    if (e > this.maxMapLength)
      throw new u(`Max length exceeded: map length (${e}) > maxMapLengthLength (${this.maxMapLength})`);
    this.stack.pushMapState(e);
  }
  pushArrayState(e) {
    if (e > this.maxArrayLength)
      throw new u(`Max length exceeded: array length (${e}) > maxArrayLength (${this.maxArrayLength})`);
    this.stack.pushArrayState(e);
  }
  decodeString(e, t) {
    return !this.rawStrings || this.stateIsMapKey() ? this.decodeUtf8String(e, t) : this.decodeBinary(e, t);
  }
  /**
   * @throws {@link RangeError}
   */
  decodeUtf8String(e, t) {
    var n;
    if (e > this.maxStrLength)
      throw new u(`Max length exceeded: UTF-8 byte length (${e}) > maxStrLength (${this.maxStrLength})`);
    if (this.bytes.byteLength < this.pos + t + e)
      throw L;
    const i = this.pos + t;
    let s;
    return this.stateIsMapKey() && ((n = this.keyDecoder) != null && n.canBeCached(e)) ? s = this.keyDecoder.decode(this.bytes, i, e) : s = J(this.bytes, i, e), this.pos += t + e, s;
  }
  stateIsMapKey() {
    return this.stack.length > 0 ? this.stack.top().type === U : !1;
  }
  /**
   * @throws {@link RangeError}
   */
  decodeBinary(e, t) {
    if (e > this.maxBinLength)
      throw new u(`Max length exceeded: bin length (${e}) > maxBinLength (${this.maxBinLength})`);
    if (!this.hasRemaining(e + t))
      throw L;
    const i = this.pos + t, s = this.bytes.subarray(i, i + e);
    return this.pos += t + e, s;
  }
  decodeExtension(e, t) {
    if (e > this.maxExtLength)
      throw new u(`Max length exceeded: ext length (${e}) > maxExtLength (${this.maxExtLength})`);
    const i = this.view.getInt8(this.pos + t), s = this.decodeBinary(
      e,
      t + 1
      /* extType */
    );
    return this.extensionCodec.decode(s, i, this.context);
  }
  lookU8() {
    return this.view.getUint8(this.pos);
  }
  lookU16() {
    return this.view.getUint16(this.pos);
  }
  lookU32() {
    return this.view.getUint32(this.pos);
  }
  readU8() {
    const e = this.view.getUint8(this.pos);
    return this.pos++, e;
  }
  readI8() {
    const e = this.view.getInt8(this.pos);
    return this.pos++, e;
  }
  readU16() {
    const e = this.view.getUint16(this.pos);
    return this.pos += 2, e;
  }
  readI16() {
    const e = this.view.getInt16(this.pos);
    return this.pos += 2, e;
  }
  readU32() {
    const e = this.view.getUint32(this.pos);
    return this.pos += 4, e;
  }
  readI32() {
    const e = this.view.getInt32(this.pos);
    return this.pos += 4, e;
  }
  readU64() {
    const e = Q(this.view, this.pos);
    return this.pos += 8, e;
  }
  readI64() {
    const e = C(this.view, this.pos);
    return this.pos += 8, e;
  }
  readU64AsBigInt() {
    const e = this.view.getBigUint64(this.pos);
    return this.pos += 8, e;
  }
  readI64AsBigInt() {
    const e = this.view.getBigInt64(this.pos);
    return this.pos += 8, e;
  }
  readF32() {
    const e = this.view.getFloat32(this.pos);
    return this.pos += 4, e;
  }
  readF64() {
    const e = this.view.getFloat64(this.pos);
    return this.pos += 8, e;
  }
}
function ye(r, e) {
  return new k(e).decode(r);
}
class Ue {
  serialize({ id: e, method: t, type: i, request: s, meta: n }) {
    return le([e, t, i, s || null, n || null]);
  }
  deserialize(e) {
    const [t, i, s, n, o, c, h] = ye(e);
    return { id: t, method: i, type: s, status: o, response: n, meta: c, error: h };
  }
}
class me {
  constructor() {
    a(this, "_listeners", /* @__PURE__ */ new Map());
  }
  on(e, t) {
    var i;
    this._listeners.has(e) || this._listeners.set(e, []), (i = this._listeners.get(e)) == null || i.push(t);
  }
  off(e, t) {
    var s, n;
    if (!this._listeners.has(e)) return;
    const i = ((s = this._listeners.get(e)) == null ? void 0 : s.indexOf(t)) ?? -1;
    i > -1 && ((n = this._listeners.get(e)) == null || n.splice(i, 1));
  }
  once(e, t) {
    const i = (s) => {
      t(s), this.off(e, i);
    };
    this.on(e, i);
  }
  emit(e, t) {
    var i;
    this._listeners.has(e) && ((i = this._listeners.get(e)) == null || i.forEach((s) => s(t)));
  }
}
var _ = /* @__PURE__ */ ((r) => (r[r.CLOSED = 0] = "CLOSED", r[r.CONNECTING = 1] = "CONNECTING", r[r.OPEN = 2] = "OPEN", r[r.RECONNECTING = 3] = "RECONNECTING", r))(_ || {});
class Te {
  constructor({
    client: e,
    url: t,
    reconnectDelay: i,
    debug: s
  }) {
    a(this, "_client");
    a(this, "_reconnectDelay", 1e3);
    a(this, "_url");
    a(this, "_socket");
    a(this, "_reconnectPromise");
    /** Current state of the connection */
    a(this, "_state");
    a(this, "_emitter");
    if (typeof WebSocket > "u" && e === void 0)
      throw new Error("WebSocket API is not supported in this environment or no client was provided.");
    this._client ?? (this._client = WebSocket), this._url = t, this._reconnectDelay = i ?? 1e3, this._reconnectPromise = null, this._socket = null, this._emitter = new me(), this._state = 0;
  }
  get state() {
    return this._state;
  }
  set state(e) {
    this._state !== e && (this._emitter.emit("status", e), this._state = e);
  }
  /**
   * Open the WebSocketTransport.
   */
  connect() {
    var e;
    return this.state !== 3 && (this.state = 1), this._reconnectPromise === null && (this._reconnectPromise = new A(), this.createSocket()), (e = this._reconnectPromise) == null ? void 0 : e.value();
  }
  /**
   * Sends a message to the server.
   */
  send(e) {
    var t;
    return (t = this._socket) == null || t.send(e), Promise.resolve();
  }
  /**
   * Closes the WebSocketTransport.
   */
  close() {
    var e, t;
    this._state = 0, (e = this._reconnectPromise) == null || e.reject(new x(f.UNAVAILABLE, "Transport closed")), this._reconnectPromise = null, (t = this._socket) == null || t.close(), this._socket = null, this._emitter.emit("close", void 0);
  }
  /**
   * Reconnects the WebSocketTransport if it is disconnected state.
   * @param {number} attempt - The number of reconnect attempts made so far. Defaults to 0.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is reconnected.
   */
  async reconnect(e = 0, t) {
    this.state === 2 && (this.state = 3);
    const i = typeof this._reconnectDelay == "function" ? this._reconnectDelay(e, t) : this._reconnectDelay;
    i !== !1 && (await new Promise((s) => setTimeout(s, i)), this.createSocket(e));
  }
  /**
   * Creates the WebSocket instance.
   * @returns true if the socket new created else false the socket already exists or created.
   */
  createSocket(e = 0) {
    var t, i;
    return ((t = this._socket) == null ? void 0 : t.readyState) !== 0 && ((i = this._socket) == null ? void 0 : i.readyState) !== 1 && (this._socket = new this._client(this._url, "u-connect-web"), this._socket.binaryType = "arraybuffer", this._socket.addEventListener("open", () => {
      var s;
      this.state = 2, (s = this._reconnectPromise) == null || s.resolve(this), this._reconnectPromise = null, this._emitter.emit("open", void 0);
    }), this._socket.addEventListener("error", (s) => this._emitter.emit("error", s)), this._socket.addEventListener("close", (s) => {
      this._emitter.emit("close", void 0), this._state !== 0 && this.reconnect(e + 1, s);
    }), this._socket.addEventListener("message", (s) => this._emitter.emit("message", s.data))), this._socket;
  }
  addEventListener(e, t) {
    return this._emitter.on(e, t);
  }
  removeEventListener(e, t) {
    return this._emitter.off(e, t);
  }
  once(e, t) {
    return this._emitter.once(e, t);
  }
}
class Ae {
  constructor() {
    /** The id of the last task */
    a(this, "_id");
    this._id = 0;
  }
  /**
   * Generates a unique ID for the task.
   * @return {number} The unique ID.
   */
  getId() {
    return (++this._id).toString();
  }
}
class Se {
  constructor(e) {
    a(this, "_options");
    /** The connection instance */
    a(this, "_socket");
    /** Map of tasks by id */
    a(this, "_tasks");
    var t, i;
    this._options = e, (t = this._options).serializer ?? (t.serializer = new Ue()), (i = this._options).idProvider ?? (i.idProvider = new Ae()), this._tasks = /* @__PURE__ */ new Map(), this._socket = e.connection, this._socket.addEventListener("message", (s) => this.onMessage(this._options.serializer.deserialize(s))), this._socket.addEventListener("open", () => {
      var s;
      return (s = this._options.logger) == null ? void 0 : s.info("connection opened");
    }), this._socket.addEventListener("error", (s) => {
      var n;
      return (n = this._options.logger) == null ? void 0 : n.error(s);
    }), this._socket.addEventListener("close", () => {
      var s;
      this.dispose(), (s = this._options.logger) == null || s.info("connection closed");
    }), this._socket.addEventListener(
      "status",
      (s) => {
        var n;
        return (n = this._options.logger) == null ? void 0 : n.info(`state change from ${_[this.state]} to ${_[s]}`);
      }
    );
  }
  get state() {
    return this._socket.state;
  }
  /**
   * Asynchronously establishes a WebSocket connection and returns a Promise that resolves to the Transport instance.
   * @return {Promise<Transport>} A Promise that resolves to the Transport instance when the connection is established.
   */
  async connect() {
    return this.state === _.OPEN ? this : (await this._socket.connect(), this);
  }
  /**
   * Disconnects the WebSocketTransport if it is not already closed.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is disconnected.
   */
  async disconnect() {
    var e, t;
    if (this.state !== _.CLOSED)
      return (e = this._options.logger) == null || e.info("call disconnect"), this.dispose(), (t = this._socket) == null || t.close(), Promise.resolve();
  }
  /**
   * Creates a local namespace with the given service ID and returns remote methods for calling.
   * @param {ServicePath} id - The ID of the service.
   * @return {IService<S>} A new TransportService instance.
   */
  service(e) {
    return new $(this, e, this._options.idProvider);
  }
  /**
   * Disposed of all tasks if the state is CLOSED.
   *
   * @return {Promise<void>} A Promise that resolves once the disposal is complete.
   */
  dispose() {
    this._tasks.forEach((e) => e.onError(new x(f.UNAVAILABLE, "Transport closed"))), this._tasks.clear();
  }
  /**
   * Serializes and sends a message over the WebSocket connection.
   * @param {PackageClient<string, string, I>} message - The message to send.
   */
  send(e) {
    return this._socket.send(this._options.serializer.serialize(e));
  }
  /**
   * Sends a message to the server and waits for a response and kills the task.
   * @param message The message to send.
   * @param options The options for the message.
   */
  async sendRequest(e, t, i) {
    if (this.state !== _.OPEN) {
      const s = [this.connect()];
      t != null && t.abort && s.push(
        new Promise(
          (n, o) => {
            var c;
            return (c = t == null ? void 0 : t.abort) == null ? void 0 : c.addEventListener("abort", () => o(new x(f.ABORTED, "Request aborted")));
          }
        )
      ), await Promise.race(s);
    }
    return new Promise((s, n) => {
      var o, c;
      if (this._tasks.set(e.id, { onMessage: i, onEnd: s, onError: n }), t != null && t.abort || t != null && t.timeout) {
        const h = async (l) => {
          const { id: w, method: E } = e;
          this._tasks.delete(w) && (await this.send({ id: w, method: E, type: d.ABORT }), n(l));
        };
        (o = t.abort) == null || o.addEventListener("abort", () => h(new x(f.ABORTED, "Request aborted"))), t.timeout && (e.meta = { ...e.meta, timeout: t.timeout.toString() }, setTimeout(() => h(new x(f.DEADLINE_EXCEEDED, "Request timed out")), t.timeout));
      }
      (c = this._options.logger) == null || c.info(`Sending request ${e.method}`), this.send(e);
    });
  }
  /**
   * Handles incoming messages from the WebSocket server.
   * @param {PackageServer<any, string, any>} message - The message received from the server.
   * @return {Promise<void>} A promise that resolves when the message is handled.
   */
  async onMessage(e) {
    var i, s, n, o, c, h;
    const t = this._tasks.get(e.id);
    switch (e.type) {
      case d.UNARY_CLIENT: {
        t && ((i = this._options.logger) == null || i.info(
          `unary responce ${e.method} ${e.status}(${f[e.status]}) ${e.error ? "error message: " + e.error : "success"}`
        ), this._tasks.delete(e.id), e.error ? t.onError(new x(e.status ?? f.INTERNAL, e.error)) : t.onEnd(e));
        break;
      }
      case d.STREAM_CLIENT:
      case d.STREAM_SERVER:
        t && ((s = this._options.logger) == null || s.info("stream data " + e.method), (n = t.onMessage) == null || n.call(t, e));
        break;
      case d.STREAM_END: {
        t && ((o = this._options.logger) == null || o.info(
          `stream end ${e.method} ${e.status}(${f[e.status]}) ${e.error ? "error message: " + e.error : "success"}`
        ), e.error ? t.onError(new x(e.status ?? f.INTERNAL, e.error)) : t.onEnd(e), this._tasks.delete(e.id));
        break;
      }
      case d.ABORT: {
        (c = this._options.logger) == null || c.info(`abort request ${e.method}`), t && t.onError(new x(e.status ?? f.ABORTED, e.error ?? "Request aborted"));
        break;
      }
      default:
        (h = this._options.logger) == null || h.error("Unknown message type: ", e);
        break;
    }
  }
}
class pe {
  error(...e) {
    console.error("%c u-connect: ", "color: #ca0000;", ...e);
  }
  warn(...e) {
    console.warn("%c u-connect: ", "color: #d8b104;", ...e);
  }
  info(...e) {
    console.info("%c u-connect: ", "color: #42AAFF;", ...e);
  }
}
export {
  $ as ClientService,
  _ as ConnectionState,
  pe as ConsoleLogger,
  Ue as MessagePackSerializer,
  x as MethodError,
  Ae as NextIdProvider,
  f as Status,
  Se as UConnectClient,
  Te as WebSocketConnection
};
