var Y = Object.defineProperty;
var q = (r, e, t) => e in r ? Y(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t;
var v = (r, e, t) => (q(r, typeof e != "symbol" ? e + "" : e, t), t);
class z {
  constructor() {
    v(this, "isOpen", !0);
    v(this, "InvokeEnd");
    v(this, "InvokeMessage");
    v(this, "InvokeError");
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
var p = /* @__PURE__ */ ((r) => (r[r.CONNECT = 1] = "CONNECT", r[r.DISCONNECT = 2] = "DISCONNECT", r[r.UNARY_CLIENT = 3] = "UNARY_CLIENT", r[r.UNARY_SERVER = 4] = "UNARY_SERVER", r[r.STREAM_CLIENT = 5] = "STREAM_CLIENT", r[r.STREAM_SERVER = 6] = "STREAM_SERVER", r[r.STREAM_DUPLEX = 7] = "STREAM_DUPLEX", r[r.STREAM_END = 8] = "STREAM_END", r[r.ABORT = 9] = "ABORT", r))(p || {});
class L {
  constructor() {
    v(this, "_value");
    v(this, "_error");
    v(this, "_resolve");
    v(this, "_reject");
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
    return this._value ? Promise.resolve(this._value) : this._error ? Promise.reject(this._error) : new Promise((e, t) => {
      this._resolve = e, this._reject = t;
    });
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
class V {
  constructor(e, t, i) {
    v(this, "_result");
    v(this, "_next");
    this._transport = e, this.id = t, this.method = i, this._result = new L();
  }
  async send(e) {
    return this._result.has() ? Promise.reject() : (this._next = new L(), this._transport.send({ id: this.id, type: p.STREAM_CLIENT, method: this.method, request: e }), this._next.value());
  }
  async complete() {
    return this._transport.send({ id: this.id, type: p.STREAM_END, method: this.method }), this._result.value();
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
var w = /* @__PURE__ */ ((r) => (r[r.OK = 0] = "OK", r[r.CANCELLED = 1] = "CANCELLED", r[r.UNKNOWN = 2] = "UNKNOWN", r[r.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", r[r.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", r[r.NOT_FOUND = 5] = "NOT_FOUND", r[r.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", r[r.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", r[r.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", r[r.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", r[r.ABORTED = 10] = "ABORTED", r[r.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", r[r.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", r[r.INTERNAL = 13] = "INTERNAL", r[r.UNAVAILABLE = 14] = "UNAVAILABLE", r[r.DATA_LOSS = 15] = "DATA_LOSS", r[r.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", r))(w || {});
class G {
  constructor(e, t) {
    this._transport = e, this._service = t;
  }
  unary(e, t, i) {
    return this._transport.sendRequest(
      { id: this._transport.reservateId(), method: `${this._service}.${e}`, type: p.UNARY_CLIENT, request: t },
      i
    ).then((n) => ({
      method: n.method,
      response: n.response,
      status: n.status,
      meta: n.meta
    }));
  }
  clientStream(e, t) {
    const i = this._transport.reservateId(), n = `${this._service}.${e}`, s = new V(this._transport, i, n);
    return this._transport.sendRequest(
      { id: i, method: `${this._service}.${e}`, type: p.STREAM_CLIENT, request: null },
      t,
      (o) => {
        if (o.type === p.STREAM_CLIENT) {
          s.next();
          return;
        }
        s.error(new x(w.INTERNAL, "Internal server error"));
      }
    ).then(
      (o) => s.result({
        method: o.method,
        response: o.response,
        status: o.status,
        meta: o.meta
      })
    ).catch((o) => s.error(o)), s;
  }
  serverStream(e, t, i) {
    const n = new z();
    return this._transport.sendRequest(
      { id: this._transport.reservateId(), type: p.STREAM_SERVER, method: `${this._service}.${e}`, request: t },
      i,
      (s) => {
        var o, h;
        if (s.type === p.STREAM_SERVER)
          return (o = n.InvokeMessage) == null ? void 0 : o.call(n, s.response);
        (h = n.InvokeError) == null || h.call(n, new x(w.INTERNAL, "Internal server error"));
      }
    ).then((s) => {
      var o;
      return (o = n.InvokeEnd) == null ? void 0 : o.call(n, s);
    }).catch((s) => {
      var o;
      return (o = n.InvokeError) == null ? void 0 : o.call(n, s);
    }), n;
  }
  duplex(e, t) {
    const i = this._transport.reservateId(), n = `${this._service}.${e}`, s = new V(this._transport, i, n), o = new z(), h = {
      complete() {
        return s.complete();
      },
      send(c) {
        return s.send(c);
      },
      onMessage(c) {
        o.onMessage(c);
      },
      onError(c) {
        o.onError(c);
      },
      onEnd(c) {
        o.onEnd(c);
      }
    };
    return this._transport.sendRequest({ id: i, method: n, type: p.STREAM_DUPLEX }, t, (c) => {
      var f, l;
      if (c.type === p.STREAM_CLIENT) {
        s.next();
        return;
      }
      if (c.type === p.STREAM_SERVER)
        return (f = o.InvokeMessage) == null ? void 0 : f.call(o, c.response);
      const a = new x(w.INTERNAL, "Internal server error");
      s.error(a), (l = o.InvokeError) == null || l.call(o, a);
    }).then((c) => {
      var f;
      const a = {
        method: c.method,
        response: c.response,
        status: c.status,
        meta: c.meta
      };
      s.result(a), (f = o.InvokeEnd) == null || f.call(o, a);
    }).catch((c) => {
      var a;
      s.error(c), (a = o.InvokeError) == null || a.call(o, c);
    }), h;
  }
}
function J(r) {
  for (var e = r.length, t = 0, i = 0; i < e; ) {
    var n = r.charCodeAt(i++);
    if (n & 4294967168)
      if (!(n & 4294965248))
        t += 2;
      else {
        if (n >= 55296 && n <= 56319 && i < e) {
          var s = r.charCodeAt(i);
          (s & 64512) === 56320 && (++i, n = ((n & 1023) << 10) + (s & 1023) + 65536);
        }
        n & 4294901760 ? t += 4 : t += 3;
      }
    else {
      t++;
      continue;
    }
  }
  return t;
}
function Z(r, e, t) {
  for (var i = r.length, n = t, s = 0; s < i; ) {
    var o = r.charCodeAt(s++);
    if (o & 4294967168)
      if (!(o & 4294965248))
        e[n++] = o >> 6 & 31 | 192;
      else {
        if (o >= 55296 && o <= 56319 && s < i) {
          var h = r.charCodeAt(s);
          (h & 64512) === 56320 && (++s, o = ((o & 1023) << 10) + (h & 1023) + 65536);
        }
        o & 4294901760 ? (e[n++] = o >> 18 & 7 | 240, e[n++] = o >> 12 & 63 | 128, e[n++] = o >> 6 & 63 | 128) : (e[n++] = o >> 12 & 15 | 224, e[n++] = o >> 6 & 63 | 128);
      }
    else {
      e[n++] = o;
      continue;
    }
    e[n++] = o & 63 | 128;
  }
}
var Q = new TextEncoder(), j = 50;
function ee(r, e, t) {
  Q.encodeInto(r, e.subarray(t));
}
function te(r, e, t) {
  r.length > j ? ee(r, e, t) : Z(r, e, t);
}
var re = 4096;
function $(r, e, t) {
  for (var i = e, n = i + t, s = [], o = ""; i < n; ) {
    var h = r[i++];
    if (!(h & 128))
      s.push(h);
    else if ((h & 224) === 192) {
      var c = r[i++] & 63;
      s.push((h & 31) << 6 | c);
    } else if ((h & 240) === 224) {
      var c = r[i++] & 63, a = r[i++] & 63;
      s.push((h & 31) << 12 | c << 6 | a);
    } else if ((h & 248) === 240) {
      var c = r[i++] & 63, a = r[i++] & 63, f = r[i++] & 63, l = (h & 7) << 18 | c << 12 | a << 6 | f;
      l > 65535 && (l -= 65536, s.push(l >>> 10 & 1023 | 55296), l = 56320 | l & 1023), s.push(l);
    } else
      s.push(h);
    s.length >= re && (o += String.fromCharCode.apply(String, s), s.length = 0);
  }
  return s.length > 0 && (o += String.fromCharCode.apply(String, s)), o;
}
var ie = new TextDecoder(), ne = 200;
function se(r, e, t) {
  var i = r.subarray(e, e + t);
  return ie.decode(i);
}
function oe(r, e, t) {
  return t > ne ? se(r, e, t) : $(r, e, t);
}
var N = (
  /** @class */
  /* @__PURE__ */ function() {
    function r(e, t) {
      this.type = e, this.data = t;
    }
    return r;
  }()
), ae = /* @__PURE__ */ function() {
  var r = function(e, t) {
    return r = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(i, n) {
      i.__proto__ = n;
    } || function(i, n) {
      for (var s in n)
        Object.prototype.hasOwnProperty.call(n, s) && (i[s] = n[s]);
    }, r(e, t);
  };
  return function(e, t) {
    if (typeof t != "function" && t !== null)
      throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
    r(e, t);
    function i() {
      this.constructor = e;
    }
    e.prototype = t === null ? Object.create(t) : (i.prototype = t.prototype, new i());
  };
}(), U = (
  /** @class */
  function(r) {
    ae(e, r);
    function e(t) {
      var i = r.call(this, t) || this, n = Object.create(e.prototype);
      return Object.setPrototypeOf(i, n), Object.defineProperty(i, "name", {
        configurable: !0,
        enumerable: !1,
        value: e.name
      }), i;
    }
    return e;
  }(Error)
), m = 4294967295;
function he(r, e, t) {
  var i = t / 4294967296, n = t;
  r.setUint32(e, i), r.setUint32(e + 4, n);
}
function H(r, e, t) {
  var i = Math.floor(t / 4294967296), n = t;
  r.setUint32(e, i), r.setUint32(e + 4, n);
}
function X(r, e) {
  var t = r.getInt32(e), i = r.getUint32(e + 4);
  return t * 4294967296 + i;
}
function ce(r, e) {
  var t = r.getUint32(e), i = r.getUint32(e + 4);
  return t * 4294967296 + i;
}
var fe = -1, ue = 4294967296 - 1, le = 17179869184 - 1;
function de(r) {
  var e = r.sec, t = r.nsec;
  if (e >= 0 && t >= 0 && e <= le)
    if (t === 0 && e <= ue) {
      var i = new Uint8Array(4), n = new DataView(i.buffer);
      return n.setUint32(0, e), i;
    } else {
      var s = e / 4294967296, o = e & 4294967295, i = new Uint8Array(8), n = new DataView(i.buffer);
      return n.setUint32(0, t << 2 | s & 3), n.setUint32(4, o), i;
    }
  else {
    var i = new Uint8Array(12), n = new DataView(i.buffer);
    return n.setUint32(0, t), H(n, 4, e), i;
  }
}
function ve(r) {
  var e = r.getTime(), t = Math.floor(e / 1e3), i = (e - t * 1e3) * 1e6, n = Math.floor(i / 1e9);
  return {
    sec: t + n,
    nsec: i - n * 1e9
  };
}
function pe(r) {
  if (r instanceof Date) {
    var e = ve(r);
    return de(e);
  } else
    return null;
}
function Ee(r) {
  var e = new DataView(r.buffer, r.byteOffset, r.byteLength);
  switch (r.byteLength) {
    case 4: {
      var t = e.getUint32(0), i = 0;
      return { sec: t, nsec: i };
    }
    case 8: {
      var n = e.getUint32(0), s = e.getUint32(4), t = (n & 3) * 4294967296 + s, i = n >>> 2;
      return { sec: t, nsec: i };
    }
    case 12: {
      var t = X(e, 4), i = e.getUint32(0);
      return { sec: t, nsec: i };
    }
    default:
      throw new U("Unrecognized data size for timestamp (expected 4, 8, or 12): ".concat(r.length));
  }
}
function we(r) {
  var e = Ee(r);
  return new Date(e.sec * 1e3 + e.nsec / 1e6);
}
var xe = {
  type: fe,
  encode: pe,
  decode: we
}, K = (
  /** @class */
  function() {
    function r() {
      this.builtInEncoders = [], this.builtInDecoders = [], this.encoders = [], this.decoders = [], this.register(xe);
    }
    return r.prototype.register = function(e) {
      var t = e.type, i = e.encode, n = e.decode;
      if (t >= 0)
        this.encoders[t] = i, this.decoders[t] = n;
      else {
        var s = 1 + t;
        this.builtInEncoders[s] = i, this.builtInDecoders[s] = n;
      }
    }, r.prototype.tryToEncode = function(e, t) {
      for (var i = 0; i < this.builtInEncoders.length; i++) {
        var n = this.builtInEncoders[i];
        if (n != null) {
          var s = n(e, t);
          if (s != null) {
            var o = -1 - i;
            return new N(o, s);
          }
        }
      }
      for (var i = 0; i < this.encoders.length; i++) {
        var n = this.encoders[i];
        if (n != null) {
          var s = n(e, t);
          if (s != null) {
            var o = i;
            return new N(o, s);
          }
        }
      }
      return e instanceof N ? e : null;
    }, r.prototype.decode = function(e, t, i) {
      var n = t < 0 ? this.builtInDecoders[-1 - t] : this.decoders[t];
      return n ? n(e, t, i) : new N(t, e);
    }, r.defaultCodec = new r(), r;
  }()
);
function R(r) {
  return r instanceof Uint8Array ? r : ArrayBuffer.isView(r) ? new Uint8Array(r.buffer, r.byteOffset, r.byteLength) : r instanceof ArrayBuffer ? new Uint8Array(r) : Uint8Array.from(r);
}
function ye(r) {
  if (r instanceof ArrayBuffer)
    return new DataView(r);
  var e = R(r);
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
var _e = 100, Ue = 2048, ge = (
  /** @class */
  function() {
    function r(e) {
      var t, i, n, s, o, h, c, a;
      this.extensionCodec = (t = e == null ? void 0 : e.extensionCodec) !== null && t !== void 0 ? t : K.defaultCodec, this.context = e == null ? void 0 : e.context, this.useBigInt64 = (i = e == null ? void 0 : e.useBigInt64) !== null && i !== void 0 ? i : !1, this.maxDepth = (n = e == null ? void 0 : e.maxDepth) !== null && n !== void 0 ? n : _e, this.initialBufferSize = (s = e == null ? void 0 : e.initialBufferSize) !== null && s !== void 0 ? s : Ue, this.sortKeys = (o = e == null ? void 0 : e.sortKeys) !== null && o !== void 0 ? o : !1, this.forceFloat32 = (h = e == null ? void 0 : e.forceFloat32) !== null && h !== void 0 ? h : !1, this.ignoreUndefined = (c = e == null ? void 0 : e.ignoreUndefined) !== null && c !== void 0 ? c : !1, this.forceIntegerToFloat = (a = e == null ? void 0 : e.forceIntegerToFloat) !== null && a !== void 0 ? a : !1, this.pos = 0, this.view = new DataView(new ArrayBuffer(this.initialBufferSize)), this.bytes = new Uint8Array(this.view.buffer);
    }
    return r.prototype.reinitializeState = function() {
      this.pos = 0;
    }, r.prototype.encodeSharedRef = function(e) {
      return this.reinitializeState(), this.doEncode(e, 1), this.bytes.subarray(0, this.pos);
    }, r.prototype.encode = function(e) {
      return this.reinitializeState(), this.doEncode(e, 1), this.bytes.slice(0, this.pos);
    }, r.prototype.doEncode = function(e, t) {
      if (t > this.maxDepth)
        throw new Error("Too deep objects in depth ".concat(t));
      e == null ? this.encodeNil() : typeof e == "boolean" ? this.encodeBoolean(e) : typeof e == "number" ? this.forceIntegerToFloat ? this.encodeNumberAsFloat(e) : this.encodeNumber(e) : typeof e == "string" ? this.encodeString(e) : this.useBigInt64 && typeof e == "bigint" ? this.encodeBigInt64(e) : this.encodeObject(e, t);
    }, r.prototype.ensureBufferSizeToWrite = function(e) {
      var t = this.pos + e;
      this.view.byteLength < t && this.resizeBuffer(t * 2);
    }, r.prototype.resizeBuffer = function(e) {
      var t = new ArrayBuffer(e), i = new Uint8Array(t), n = new DataView(t);
      i.set(this.bytes), this.view = n, this.bytes = i;
    }, r.prototype.encodeNil = function() {
      this.writeU8(192);
    }, r.prototype.encodeBoolean = function(e) {
      e === !1 ? this.writeU8(194) : this.writeU8(195);
    }, r.prototype.encodeNumber = function(e) {
      !this.forceIntegerToFloat && Number.isSafeInteger(e) ? e >= 0 ? e < 128 ? this.writeU8(e) : e < 256 ? (this.writeU8(204), this.writeU8(e)) : e < 65536 ? (this.writeU8(205), this.writeU16(e)) : e < 4294967296 ? (this.writeU8(206), this.writeU32(e)) : this.useBigInt64 ? this.encodeNumberAsFloat(e) : (this.writeU8(207), this.writeU64(e)) : e >= -32 ? this.writeU8(224 | e + 32) : e >= -128 ? (this.writeU8(208), this.writeI8(e)) : e >= -32768 ? (this.writeU8(209), this.writeI16(e)) : e >= -2147483648 ? (this.writeU8(210), this.writeI32(e)) : this.useBigInt64 ? this.encodeNumberAsFloat(e) : (this.writeU8(211), this.writeI64(e)) : this.encodeNumberAsFloat(e);
    }, r.prototype.encodeNumberAsFloat = function(e) {
      this.forceFloat32 ? (this.writeU8(202), this.writeF32(e)) : (this.writeU8(203), this.writeF64(e));
    }, r.prototype.encodeBigInt64 = function(e) {
      e >= BigInt(0) ? (this.writeU8(207), this.writeBigUint64(e)) : (this.writeU8(211), this.writeBigInt64(e));
    }, r.prototype.writeStringHeader = function(e) {
      if (e < 32)
        this.writeU8(160 + e);
      else if (e < 256)
        this.writeU8(217), this.writeU8(e);
      else if (e < 65536)
        this.writeU8(218), this.writeU16(e);
      else if (e < 4294967296)
        this.writeU8(219), this.writeU32(e);
      else
        throw new Error("Too long string: ".concat(e, " bytes in UTF-8"));
    }, r.prototype.encodeString = function(e) {
      var t = 5, i = J(e);
      this.ensureBufferSizeToWrite(t + i), this.writeStringHeader(i), te(e, this.bytes, this.pos), this.pos += i;
    }, r.prototype.encodeObject = function(e, t) {
      var i = this.extensionCodec.tryToEncode(e, this.context);
      if (i != null)
        this.encodeExtension(i);
      else if (Array.isArray(e))
        this.encodeArray(e, t);
      else if (ArrayBuffer.isView(e))
        this.encodeBinary(e);
      else if (typeof e == "object")
        this.encodeMap(e, t);
      else
        throw new Error("Unrecognized object: ".concat(Object.prototype.toString.apply(e)));
    }, r.prototype.encodeBinary = function(e) {
      var t = e.byteLength;
      if (t < 256)
        this.writeU8(196), this.writeU8(t);
      else if (t < 65536)
        this.writeU8(197), this.writeU16(t);
      else if (t < 4294967296)
        this.writeU8(198), this.writeU32(t);
      else
        throw new Error("Too large binary: ".concat(t));
      var i = R(e);
      this.writeU8a(i);
    }, r.prototype.encodeArray = function(e, t) {
      var i = e.length;
      if (i < 16)
        this.writeU8(144 + i);
      else if (i < 65536)
        this.writeU8(220), this.writeU16(i);
      else if (i < 4294967296)
        this.writeU8(221), this.writeU32(i);
      else
        throw new Error("Too large array: ".concat(i));
      for (var n = 0, s = e; n < s.length; n++) {
        var o = s[n];
        this.doEncode(o, t + 1);
      }
    }, r.prototype.countWithoutUndefined = function(e, t) {
      for (var i = 0, n = 0, s = t; n < s.length; n++) {
        var o = s[n];
        e[o] !== void 0 && i++;
      }
      return i;
    }, r.prototype.encodeMap = function(e, t) {
      var i = Object.keys(e);
      this.sortKeys && i.sort();
      var n = this.ignoreUndefined ? this.countWithoutUndefined(e, i) : i.length;
      if (n < 16)
        this.writeU8(128 + n);
      else if (n < 65536)
        this.writeU8(222), this.writeU16(n);
      else if (n < 4294967296)
        this.writeU8(223), this.writeU32(n);
      else
        throw new Error("Too large map object: ".concat(n));
      for (var s = 0, o = i; s < o.length; s++) {
        var h = o[s], c = e[h];
        this.ignoreUndefined && c === void 0 || (this.encodeString(h), this.doEncode(c, t + 1));
      }
    }, r.prototype.encodeExtension = function(e) {
      var t = e.data.length;
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
        throw new Error("Too large extension object: ".concat(t));
      this.writeI8(e.type), this.writeU8a(e.data);
    }, r.prototype.writeU8 = function(e) {
      this.ensureBufferSizeToWrite(1), this.view.setUint8(this.pos, e), this.pos++;
    }, r.prototype.writeU8a = function(e) {
      var t = e.length;
      this.ensureBufferSizeToWrite(t), this.bytes.set(e, this.pos), this.pos += t;
    }, r.prototype.writeI8 = function(e) {
      this.ensureBufferSizeToWrite(1), this.view.setInt8(this.pos, e), this.pos++;
    }, r.prototype.writeU16 = function(e) {
      this.ensureBufferSizeToWrite(2), this.view.setUint16(this.pos, e), this.pos += 2;
    }, r.prototype.writeI16 = function(e) {
      this.ensureBufferSizeToWrite(2), this.view.setInt16(this.pos, e), this.pos += 2;
    }, r.prototype.writeU32 = function(e) {
      this.ensureBufferSizeToWrite(4), this.view.setUint32(this.pos, e), this.pos += 4;
    }, r.prototype.writeI32 = function(e) {
      this.ensureBufferSizeToWrite(4), this.view.setInt32(this.pos, e), this.pos += 4;
    }, r.prototype.writeF32 = function(e) {
      this.ensureBufferSizeToWrite(4), this.view.setFloat32(this.pos, e), this.pos += 4;
    }, r.prototype.writeF64 = function(e) {
      this.ensureBufferSizeToWrite(8), this.view.setFloat64(this.pos, e), this.pos += 8;
    }, r.prototype.writeU64 = function(e) {
      this.ensureBufferSizeToWrite(8), he(this.view, this.pos, e), this.pos += 8;
    }, r.prototype.writeI64 = function(e) {
      this.ensureBufferSizeToWrite(8), H(this.view, this.pos, e), this.pos += 8;
    }, r.prototype.writeBigUint64 = function(e) {
      this.ensureBufferSizeToWrite(8), this.view.setBigUint64(this.pos, e), this.pos += 8;
    }, r.prototype.writeBigInt64 = function(e) {
      this.ensureBufferSizeToWrite(8), this.view.setBigInt64(this.pos, e), this.pos += 8;
    }, r;
  }()
);
function Ae(r, e) {
  var t = new ge(e);
  return t.encodeSharedRef(r);
}
function D(r) {
  return "".concat(r < 0 ? "-" : "", "0x").concat(Math.abs(r).toString(16).padStart(2, "0"));
}
var Ie = 16, me = 16, Te = (
  /** @class */
  function() {
    function r(e, t) {
      e === void 0 && (e = Ie), t === void 0 && (t = me), this.maxKeyLength = e, this.maxLengthPerKey = t, this.hit = 0, this.miss = 0, this.caches = [];
      for (var i = 0; i < this.maxKeyLength; i++)
        this.caches.push([]);
    }
    return r.prototype.canBeCached = function(e) {
      return e > 0 && e <= this.maxKeyLength;
    }, r.prototype.find = function(e, t, i) {
      var n = this.caches[i - 1];
      e:
        for (var s = 0, o = n; s < o.length; s++) {
          for (var h = o[s], c = h.bytes, a = 0; a < i; a++)
            if (c[a] !== e[t + a])
              continue e;
          return h.str;
        }
      return null;
    }, r.prototype.store = function(e, t) {
      var i = this.caches[e.length - 1], n = { bytes: e, str: t };
      i.length >= this.maxLengthPerKey ? i[Math.random() * i.length | 0] = n : i.push(n);
    }, r.prototype.decode = function(e, t, i) {
      var n = this.find(e, t, i);
      if (n != null)
        return this.hit++, n;
      this.miss++;
      var s = $(e, t, i), o = Uint8Array.prototype.slice.call(e, t, t + i);
      return this.store(o, s), s;
    }, r;
  }()
), Ne = function(r, e, t, i) {
  function n(s) {
    return s instanceof t ? s : new t(function(o) {
      o(s);
    });
  }
  return new (t || (t = Promise))(function(s, o) {
    function h(f) {
      try {
        a(i.next(f));
      } catch (l) {
        o(l);
      }
    }
    function c(f) {
      try {
        a(i.throw(f));
      } catch (l) {
        o(l);
      }
    }
    function a(f) {
      f.done ? s(f.value) : n(f.value).then(h, c);
    }
    a((i = i.apply(r, e || [])).next());
  });
}, M = function(r, e) {
  var t = { label: 0, sent: function() {
    if (s[0] & 1)
      throw s[1];
    return s[1];
  }, trys: [], ops: [] }, i, n, s, o;
  return o = { next: h(0), throw: h(1), return: h(2) }, typeof Symbol == "function" && (o[Symbol.iterator] = function() {
    return this;
  }), o;
  function h(a) {
    return function(f) {
      return c([a, f]);
    };
  }
  function c(a) {
    if (i)
      throw new TypeError("Generator is already executing.");
    for (; o && (o = 0, a[0] && (t = 0)), t; )
      try {
        if (i = 1, n && (s = a[0] & 2 ? n.return : a[0] ? n.throw || ((s = n.return) && s.call(n), 0) : n.next) && !(s = s.call(n, a[1])).done)
          return s;
        switch (n = 0, s && (a = [a[0] & 2, s.value]), a[0]) {
          case 0:
          case 1:
            s = a;
            break;
          case 4:
            return t.label++, { value: a[1], done: !1 };
          case 5:
            t.label++, n = a[1], a = [0];
            continue;
          case 7:
            a = t.ops.pop(), t.trys.pop();
            continue;
          default:
            if (s = t.trys, !(s = s.length > 0 && s[s.length - 1]) && (a[0] === 6 || a[0] === 2)) {
              t = 0;
              continue;
            }
            if (a[0] === 3 && (!s || a[1] > s[0] && a[1] < s[3])) {
              t.label = a[1];
              break;
            }
            if (a[0] === 6 && t.label < s[1]) {
              t.label = s[1], s = a;
              break;
            }
            if (s && t.label < s[2]) {
              t.label = s[2], t.ops.push(a);
              break;
            }
            s[2] && t.ops.pop(), t.trys.pop();
            continue;
        }
        a = e.call(r, t);
      } catch (f) {
        a = [6, f], n = 0;
      } finally {
        i = s = 0;
      }
    if (a[0] & 5)
      throw a[1];
    return { value: a[0] ? a[1] : void 0, done: !0 };
  }
}, F = function(r) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var e = r[Symbol.asyncIterator], t;
  return e ? e.call(r) : (r = typeof __values == "function" ? __values(r) : r[Symbol.iterator](), t = {}, i("next"), i("throw"), i("return"), t[Symbol.asyncIterator] = function() {
    return this;
  }, t);
  function i(s) {
    t[s] = r[s] && function(o) {
      return new Promise(function(h, c) {
        o = r[s](o), n(h, c, o.done, o.value);
      });
    };
  }
  function n(s, o, h, c) {
    Promise.resolve(c).then(function(a) {
      s({ value: a, done: h });
    }, o);
  }
}, I = function(r) {
  return this instanceof I ? (this.v = r, this) : new I(r);
}, Se = function(r, e, t) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var i = t.apply(r, e || []), n, s = [];
  return n = {}, o("next"), o("throw"), o("return"), n[Symbol.asyncIterator] = function() {
    return this;
  }, n;
  function o(u) {
    i[u] && (n[u] = function(E) {
      return new Promise(function(g, A) {
        s.push([u, E, g, A]) > 1 || h(u, E);
      });
    });
  }
  function h(u, E) {
    try {
      c(i[u](E));
    } catch (g) {
      l(s[0][3], g);
    }
  }
  function c(u) {
    u.value instanceof I ? Promise.resolve(u.value.v).then(a, f) : l(s[0][2], u);
  }
  function a(u) {
    h("next", u);
  }
  function f(u) {
    h("throw", u);
  }
  function l(u, E) {
    u(E), s.shift(), s.length && h(s[0][0], s[0][1]);
  }
}, b = "array", S = "map_key", Re = "map_value", De = function(r) {
  return typeof r == "string" || typeof r == "number";
}, T = -1, O = new DataView(new ArrayBuffer(0)), Me = new Uint8Array(O.buffer);
try {
  O.getInt8(0);
} catch (r) {
  if (!(r instanceof RangeError))
    throw new Error("This module is not supported in the current JavaScript engine because DataView does not throw RangeError on out-of-bounds access");
}
var k = RangeError, W = new k("Insufficient data"), Ce = new Te(), Le = (
  /** @class */
  function() {
    function r(e) {
      var t, i, n, s, o, h, c;
      this.totalPos = 0, this.pos = 0, this.view = O, this.bytes = Me, this.headByte = T, this.stack = [], this.extensionCodec = (t = e == null ? void 0 : e.extensionCodec) !== null && t !== void 0 ? t : K.defaultCodec, this.context = e == null ? void 0 : e.context, this.useBigInt64 = (i = e == null ? void 0 : e.useBigInt64) !== null && i !== void 0 ? i : !1, this.maxStrLength = (n = e == null ? void 0 : e.maxStrLength) !== null && n !== void 0 ? n : m, this.maxBinLength = (s = e == null ? void 0 : e.maxBinLength) !== null && s !== void 0 ? s : m, this.maxArrayLength = (o = e == null ? void 0 : e.maxArrayLength) !== null && o !== void 0 ? o : m, this.maxMapLength = (h = e == null ? void 0 : e.maxMapLength) !== null && h !== void 0 ? h : m, this.maxExtLength = (c = e == null ? void 0 : e.maxExtLength) !== null && c !== void 0 ? c : m, this.keyDecoder = (e == null ? void 0 : e.keyDecoder) !== void 0 ? e.keyDecoder : Ce;
    }
    return r.prototype.reinitializeState = function() {
      this.totalPos = 0, this.headByte = T, this.stack.length = 0;
    }, r.prototype.setBuffer = function(e) {
      this.bytes = R(e), this.view = ye(this.bytes), this.pos = 0;
    }, r.prototype.appendBuffer = function(e) {
      if (this.headByte === T && !this.hasRemaining(1))
        this.setBuffer(e);
      else {
        var t = this.bytes.subarray(this.pos), i = R(e), n = new Uint8Array(t.length + i.length);
        n.set(t), n.set(i, t.length), this.setBuffer(n);
      }
    }, r.prototype.hasRemaining = function(e) {
      return this.view.byteLength - this.pos >= e;
    }, r.prototype.createExtraByteError = function(e) {
      var t = this, i = t.view, n = t.pos;
      return new RangeError("Extra ".concat(i.byteLength - n, " of ").concat(i.byteLength, " byte(s) found at buffer[").concat(e, "]"));
    }, r.prototype.decode = function(e) {
      this.reinitializeState(), this.setBuffer(e);
      var t = this.doDecodeSync();
      if (this.hasRemaining(1))
        throw this.createExtraByteError(this.pos);
      return t;
    }, r.prototype.decodeMulti = function(e) {
      return M(this, function(t) {
        switch (t.label) {
          case 0:
            this.reinitializeState(), this.setBuffer(e), t.label = 1;
          case 1:
            return this.hasRemaining(1) ? [4, this.doDecodeSync()] : [3, 3];
          case 2:
            return t.sent(), [3, 1];
          case 3:
            return [
              2
              /*return*/
            ];
        }
      });
    }, r.prototype.decodeAsync = function(e) {
      var t, i, n, s, o, h, c;
      return Ne(this, void 0, void 0, function() {
        var a, f, l, u, E, g, A, d;
        return M(this, function(y) {
          switch (y.label) {
            case 0:
              a = !1, y.label = 1;
            case 1:
              y.trys.push([1, 6, 7, 12]), t = !0, i = F(e), y.label = 2;
            case 2:
              return [4, i.next()];
            case 3:
              if (n = y.sent(), s = n.done, !!s)
                return [3, 5];
              c = n.value, t = !1;
              try {
                if (l = c, a)
                  throw this.createExtraByteError(this.totalPos);
                this.appendBuffer(l);
                try {
                  f = this.doDecodeSync(), a = !0;
                } catch (P) {
                  if (!(P instanceof k))
                    throw P;
                }
                this.totalPos += this.pos;
              } finally {
                t = !0;
              }
              y.label = 4;
            case 4:
              return [3, 2];
            case 5:
              return [3, 12];
            case 6:
              return u = y.sent(), o = { error: u }, [3, 12];
            case 7:
              return y.trys.push([7, , 10, 11]), !t && !s && (h = i.return) ? [4, h.call(i)] : [3, 9];
            case 8:
              y.sent(), y.label = 9;
            case 9:
              return [3, 11];
            case 10:
              if (o)
                throw o.error;
              return [
                7
                /*endfinally*/
              ];
            case 11:
              return [
                7
                /*endfinally*/
              ];
            case 12:
              if (a) {
                if (this.hasRemaining(1))
                  throw this.createExtraByteError(this.totalPos);
                return [2, f];
              }
              throw E = this, g = E.headByte, A = E.pos, d = E.totalPos, new RangeError("Insufficient data in parsing ".concat(D(g), " at ").concat(d, " (").concat(A, " in the current buffer)"));
          }
        });
      });
    }, r.prototype.decodeArrayStream = function(e) {
      return this.decodeMultiAsync(e, !0);
    }, r.prototype.decodeStream = function(e) {
      return this.decodeMultiAsync(e, !1);
    }, r.prototype.decodeMultiAsync = function(e, t) {
      return Se(this, arguments, function() {
        var n, s, o, h, c, a, f, l, u, E, g, A;
        return M(this, function(d) {
          switch (d.label) {
            case 0:
              n = t, s = -1, d.label = 1;
            case 1:
              d.trys.push([1, 15, 16, 21]), o = !0, h = F(e), d.label = 2;
            case 2:
              return [4, I(h.next())];
            case 3:
              if (c = d.sent(), u = c.done, !!u)
                return [3, 14];
              A = c.value, o = !1, d.label = 4;
            case 4:
              if (d.trys.push([4, , 12, 13]), a = A, t && s === 0)
                throw this.createExtraByteError(this.totalPos);
              this.appendBuffer(a), n && (s = this.readArraySize(), n = !1, this.complete()), d.label = 5;
            case 5:
              d.trys.push([5, 10, , 11]), d.label = 6;
            case 6:
              return [4, I(this.doDecodeSync())];
            case 7:
              return [4, d.sent()];
            case 8:
              return d.sent(), --s === 0 ? [3, 9] : [3, 6];
            case 9:
              return [3, 11];
            case 10:
              if (f = d.sent(), !(f instanceof k))
                throw f;
              return [3, 11];
            case 11:
              return this.totalPos += this.pos, [3, 13];
            case 12:
              return o = !0, [
                7
                /*endfinally*/
              ];
            case 13:
              return [3, 2];
            case 14:
              return [3, 21];
            case 15:
              return l = d.sent(), E = { error: l }, [3, 21];
            case 16:
              return d.trys.push([16, , 19, 20]), !o && !u && (g = h.return) ? [4, I(g.call(h))] : [3, 18];
            case 17:
              d.sent(), d.label = 18;
            case 18:
              return [3, 20];
            case 19:
              if (E)
                throw E.error;
              return [
                7
                /*endfinally*/
              ];
            case 20:
              return [
                7
                /*endfinally*/
              ];
            case 21:
              return [
                2
                /*return*/
              ];
          }
        });
      });
    }, r.prototype.doDecodeSync = function() {
      e:
        for (; ; ) {
          var e = this.readHeadByte(), t = void 0;
          if (e >= 224)
            t = e - 256;
          else if (e < 192)
            if (e < 128)
              t = e;
            else if (e < 144) {
              var i = e - 128;
              if (i !== 0) {
                this.pushMapState(i), this.complete();
                continue e;
              } else
                t = {};
            } else if (e < 160) {
              var i = e - 144;
              if (i !== 0) {
                this.pushArrayState(i), this.complete();
                continue e;
              } else
                t = [];
            } else {
              var n = e - 160;
              t = this.decodeUtf8String(n, 0);
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
            var n = this.lookU8();
            t = this.decodeUtf8String(n, 1);
          } else if (e === 218) {
            var n = this.lookU16();
            t = this.decodeUtf8String(n, 2);
          } else if (e === 219) {
            var n = this.lookU32();
            t = this.decodeUtf8String(n, 4);
          } else if (e === 220) {
            var i = this.readU16();
            if (i !== 0) {
              this.pushArrayState(i), this.complete();
              continue e;
            } else
              t = [];
          } else if (e === 221) {
            var i = this.readU32();
            if (i !== 0) {
              this.pushArrayState(i), this.complete();
              continue e;
            } else
              t = [];
          } else if (e === 222) {
            var i = this.readU16();
            if (i !== 0) {
              this.pushMapState(i), this.complete();
              continue e;
            } else
              t = {};
          } else if (e === 223) {
            var i = this.readU32();
            if (i !== 0) {
              this.pushMapState(i), this.complete();
              continue e;
            } else
              t = {};
          } else if (e === 196) {
            var i = this.lookU8();
            t = this.decodeBinary(i, 1);
          } else if (e === 197) {
            var i = this.lookU16();
            t = this.decodeBinary(i, 2);
          } else if (e === 198) {
            var i = this.lookU32();
            t = this.decodeBinary(i, 4);
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
            var i = this.lookU8();
            t = this.decodeExtension(i, 1);
          } else if (e === 200) {
            var i = this.lookU16();
            t = this.decodeExtension(i, 2);
          } else if (e === 201) {
            var i = this.lookU32();
            t = this.decodeExtension(i, 4);
          } else
            throw new U("Unrecognized type byte: ".concat(D(e)));
          this.complete();
          for (var s = this.stack; s.length > 0; ) {
            var o = s[s.length - 1];
            if (o.type === b)
              if (o.array[o.position] = t, o.position++, o.position === o.size)
                s.pop(), t = o.array;
              else
                continue e;
            else if (o.type === S) {
              if (!De(t))
                throw new U("The type of key must be string or number but " + typeof t);
              if (t === "__proto__")
                throw new U("The key __proto__ is not allowed");
              o.key = t, o.type = Re;
              continue e;
            } else if (o.map[o.key] = t, o.readCount++, o.readCount === o.size)
              s.pop(), t = o.map;
            else {
              o.key = null, o.type = S;
              continue e;
            }
          }
          return t;
        }
    }, r.prototype.readHeadByte = function() {
      return this.headByte === T && (this.headByte = this.readU8()), this.headByte;
    }, r.prototype.complete = function() {
      this.headByte = T;
    }, r.prototype.readArraySize = function() {
      var e = this.readHeadByte();
      switch (e) {
        case 220:
          return this.readU16();
        case 221:
          return this.readU32();
        default: {
          if (e < 160)
            return e - 144;
          throw new U("Unrecognized array type byte: ".concat(D(e)));
        }
      }
    }, r.prototype.pushMapState = function(e) {
      if (e > this.maxMapLength)
        throw new U("Max length exceeded: map length (".concat(e, ") > maxMapLengthLength (").concat(this.maxMapLength, ")"));
      this.stack.push({
        type: S,
        size: e,
        key: null,
        readCount: 0,
        map: {}
      });
    }, r.prototype.pushArrayState = function(e) {
      if (e > this.maxArrayLength)
        throw new U("Max length exceeded: array length (".concat(e, ") > maxArrayLength (").concat(this.maxArrayLength, ")"));
      this.stack.push({
        type: b,
        size: e,
        array: new Array(e),
        position: 0
      });
    }, r.prototype.decodeUtf8String = function(e, t) {
      var i;
      if (e > this.maxStrLength)
        throw new U("Max length exceeded: UTF-8 byte length (".concat(e, ") > maxStrLength (").concat(this.maxStrLength, ")"));
      if (this.bytes.byteLength < this.pos + t + e)
        throw W;
      var n = this.pos + t, s;
      return this.stateIsMapKey() && (!((i = this.keyDecoder) === null || i === void 0) && i.canBeCached(e)) ? s = this.keyDecoder.decode(this.bytes, n, e) : s = oe(this.bytes, n, e), this.pos += t + e, s;
    }, r.prototype.stateIsMapKey = function() {
      if (this.stack.length > 0) {
        var e = this.stack[this.stack.length - 1];
        return e.type === S;
      }
      return !1;
    }, r.prototype.decodeBinary = function(e, t) {
      if (e > this.maxBinLength)
        throw new U("Max length exceeded: bin length (".concat(e, ") > maxBinLength (").concat(this.maxBinLength, ")"));
      if (!this.hasRemaining(e + t))
        throw W;
      var i = this.pos + t, n = this.bytes.subarray(i, i + e);
      return this.pos += t + e, n;
    }, r.prototype.decodeExtension = function(e, t) {
      if (e > this.maxExtLength)
        throw new U("Max length exceeded: ext length (".concat(e, ") > maxExtLength (").concat(this.maxExtLength, ")"));
      var i = this.view.getInt8(this.pos + t), n = this.decodeBinary(
        e,
        t + 1
        /* extType */
      );
      return this.extensionCodec.decode(n, i, this.context);
    }, r.prototype.lookU8 = function() {
      return this.view.getUint8(this.pos);
    }, r.prototype.lookU16 = function() {
      return this.view.getUint16(this.pos);
    }, r.prototype.lookU32 = function() {
      return this.view.getUint32(this.pos);
    }, r.prototype.readU8 = function() {
      var e = this.view.getUint8(this.pos);
      return this.pos++, e;
    }, r.prototype.readI8 = function() {
      var e = this.view.getInt8(this.pos);
      return this.pos++, e;
    }, r.prototype.readU16 = function() {
      var e = this.view.getUint16(this.pos);
      return this.pos += 2, e;
    }, r.prototype.readI16 = function() {
      var e = this.view.getInt16(this.pos);
      return this.pos += 2, e;
    }, r.prototype.readU32 = function() {
      var e = this.view.getUint32(this.pos);
      return this.pos += 4, e;
    }, r.prototype.readI32 = function() {
      var e = this.view.getInt32(this.pos);
      return this.pos += 4, e;
    }, r.prototype.readU64 = function() {
      var e = ce(this.view, this.pos);
      return this.pos += 8, e;
    }, r.prototype.readI64 = function() {
      var e = X(this.view, this.pos);
      return this.pos += 8, e;
    }, r.prototype.readU64AsBigInt = function() {
      var e = this.view.getBigUint64(this.pos);
      return this.pos += 8, e;
    }, r.prototype.readI64AsBigInt = function() {
      var e = this.view.getBigInt64(this.pos);
      return this.pos += 8, e;
    }, r.prototype.readF32 = function() {
      var e = this.view.getFloat32(this.pos);
      return this.pos += 4, e;
    }, r.prototype.readF64 = function() {
      var e = this.view.getFloat64(this.pos);
      return this.pos += 8, e;
    }, r;
  }()
);
function ke(r, e) {
  var t = new Le(e);
  return t.decode(r);
}
class Be {
  constructor() {
    v(this, "_listeners", /* @__PURE__ */ new Map());
  }
  on(e, t) {
    var i;
    this._listeners.has(e) || this._listeners.set(e, []), (i = this._listeners.get(e)) == null || i.push(t);
  }
  off(e, t) {
    var n, s;
    if (!this._listeners.has(e))
      return;
    const i = ((n = this._listeners.get(e)) == null ? void 0 : n.indexOf(t)) ?? -1;
    i > -1 && ((s = this._listeners.get(e)) == null || s.splice(i, 1));
  }
  once(e, t) {
    const i = (n) => {
      t(n), this.off(e, i);
    };
    this.on(e, i);
  }
  emit(e, t) {
    var i;
    this._listeners.has(e) && ((i = this._listeners.get(e)) == null || i.forEach((n) => n(t)));
  }
}
function _(r) {
  console.info("%c u-connect : ", "color: #42AAFF;", r);
}
function C(r) {
  console.warn("%c u-connect : ", "color: #d8b104;", r);
}
function Oe(r, ...e) {
  console.error("%c u-connect : ", "color: #ca0000;", r, ...e);
}
var B = /* @__PURE__ */ ((r) => (r[r.CLOSED = 0] = "CLOSED", r[r.CONNECTING = 1] = "CONNECTING", r[r.OPEN = 2] = "OPEN", r[r.RECONNECTING = 3] = "RECONNECTING", r))(B || {});
class ze {
  constructor(e) {
    v(this, "_options");
    v(this, "_emitter");
    /** The websocket instance */
    v(this, "_socket");
    /** The number of reconnect attempts */
    v(this, "_attempts", 0);
    v(this, "_reconnectPromises");
    /** The id of the last task */
    v(this, "_id");
    /** Map of tasks by id */
    v(this, "_tasks");
    /** Current state of the connection */
    v(this, "_state");
    if (typeof WebSocket > "u" && e.client === void 0)
      throw new Error("WebSocket API is not supported in this environment or no client was provided.");
    this._options = {
      reconnectDelay: 1e3,
      client: e.client || WebSocket,
      ...e
    }, this._emitter = new Be(), this._attempts = 0, this._reconnectPromises = [], this._id = 0, this._tasks = /* @__PURE__ */ new Map(), this._state = 0;
  }
  get state() {
    return this._state;
  }
  set state(e) {
    this._options.debug && _(`state change from ${B[this._state]} to ${B[e]}`), this._state = e, this._emitter.emit("status", e);
  }
  /**
   * Asynchronously establishes a WebSocket connection and returns a Promise that resolves to the Transport instance.
   * @return {Promise<Transport>} A Promise that resolves to the Transport instance when the connection is established.
   */
  async connect() {
    if (this.state === 2)
      return this;
    this.state = 1;
    const e = new L();
    return this._reconnectPromises.push(e), this.createSocket(), e.value();
  }
  /**
   * Disconnects the WebSocketTransport if it is not already closed.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is disconnected.
   */
  async disconnect() {
    if (this.state !== 0)
      return this._options.debug && _("disconnect"), this.dispose(), Promise.resolve();
  }
  /**
   * Creates a local namespace with the given service ID and returns remote methods for calling.
   * @param {ServicePath} id - The ID of the service.
   * @return {IService<S>} A new TransportService instance.
   */
  service(e) {
    return new G(this, e);
  }
  /**
   * Reconnects the WebSocketTransport if it is disconnected state.
   * @param {number} attempt - The number of reconnect attempts made so far. Defaults to 0.
   * @return {Promise<void>} A Promise that resolves once the WebSocketTransport is reconnected.
   */
  async reconnect(e = 0) {
    this.state === 2 && (this._id = 0, this._tasks.forEach((i) => i.onError(new x(w.UNAVAILABLE, "Transport closed"))), this._tasks.clear(), this.state = 3);
    const t = typeof this._options.reconnectDelay == "function" ? this._options.reconnectDelay(e) : this._options.reconnectDelay;
    t !== !1 && (await new Promise((i) => setTimeout(i, t)), this._options.debug && _("connecting attempt №" + e), this.createSocket());
  }
  /**
   * Creates the WebSocket instance.
   * @returns true if the socket new created else false the socket already exists or created.
   */
  createSocket() {
    var e, t;
    return ((e = this._socket) == null ? void 0 : e.readyState) !== 0 && ((t = this._socket) == null ? void 0 : t.readyState) !== 1 ? (this._socket = new this._options.client(this._options.url, "u-connect-web"), this._socket.binaryType = "arraybuffer", this._socket.addEventListener("open", () => {
      this.state = 2, this._attempts = 0, this._reconnectPromises.forEach((i) => i.resolve(this)), this._reconnectPromises = [], this._options.debug && _("connected");
    }), this._socket.addEventListener("error", (i) => {
      this._options.debug && _(i);
    }), this._socket.addEventListener("close", (i) => {
      this._state !== 0 && this.reconnect(this._attempts++);
    }), this._socket.addEventListener("message", (i) => this.onMessage(this.deserialize(i.data))), !0) : !1;
  }
  /**
   * Dispose the WebSocketTransport by closing the tasks and socket if the state is not CLOSED.
   *
   * @return {Promise<void>} A Promise that resolves once the disposal is complete.
   */
  dispose() {
    var e;
    this.state !== 0 && (this._id = 0, this.state = 0, this._tasks.forEach((t) => t.onError(new x(w.UNAVAILABLE, "Transport closed"))), this._tasks.clear(), this._reconnectPromises.forEach((t) => t.reject(new x(w.UNAVAILABLE, "Transport closed"))), this._reconnectPromises = [], (e = this._socket) == null || e.close());
  }
  /**
   * Serializes and sends a message over the WebSocket connection.
   * @param {PackageClient<string, string, I>} message - The message to send.
   * @param {ServiceMethodOptions} [options] - The options for the message.
   */
  send(e, t) {
    this._options.debug && _("send data " + e.method), this._socket.send(this.serialize(e, t));
  }
  /**
   * The last step in serializes a TransportPackageClient object and returns the serialized data.
   *
   * @param {PackageClient<any, any, P>} options - The TransportPackageClient object to serialize.
   * @param {TransportServiceOptions} [options] - The options for the message.
   * @returns {any} - The serialized data.
   */
  serialize({ id: e, method: t, type: i, request: n }, s) {
    return Ae([e, t, i, n || null, (s == null ? void 0 : s.meta) || null]);
  }
  /**
   * The first step in deserializes a message received over connection and returns a TransportPackageServer object.
   *
   * @param {any} message - The message to be deserialized.
   * @return {PackageServer<any, any, P>} - The deserialized TransportPackageServer object.
   */
  deserialize(e) {
    const [t, i, n, s, o, h, c] = ke(e);
    return { id: t, method: i, type: n, status: o, response: s, meta: h, error: c };
  }
  /**
   * Sends a message to the server and waits for a response and kills the task.
   * @param message The message to send.
   * @param options The options for the message.
   */
  async sendRequest(e, t, i) {
    return this.state !== 2 && await this.connect(), new Promise((n, s) => {
      var o;
      if (this._tasks.set(e.id, { onMessage: i, onEnd: n, onError: s }), this.send(e, t), t != null && t.abort || t != null && t.timeout) {
        const h = (c) => {
          const { id: a, method: f } = e;
          this.send({ id: a, method: f, type: p.ABORT }), s(c);
        };
        (o = t.abort) == null || o.addEventListener("abort", () => h(new x(w.ABORTED, "Request aborted"))), t.timeout && setTimeout(() => h(new x(w.DEADLINE_EXCEEDED, "Request timed out")), t.timeout);
      }
    });
  }
  /**
   * Generates a unique ID for the task.
   * @return {number} The unique ID.
   */
  reservateId() {
    return ++this._id;
  }
  /**
   * Handles incoming messages from the WebSocket server.
   * @param {PackageServer<any, string, any>} message - The message received from the server.
   * @return {Promise<void>} A promise that resolves when the message is handled.
   */
  async onMessage(e) {
    var i;
    const t = this._tasks.get(e.id);
    switch (e.type) {
      case p.UNARY_CLIENT: {
        t && (this._options.debug && _(
          `unary responce ${e.method} ${e.status}(${w[e.status]}) ${e.error ? "error message: " + e.error : "success"}`
        ), this._tasks.delete(e.id), e.error ? t.onError(new x(e.status ?? w.INTERNAL, e.error)) : t.onEnd(e));
        break;
      }
      case p.STREAM_CLIENT:
      case p.STREAM_SERVER:
        t && (this._options.debug && _("stream data " + e.method), (i = t.onMessage) == null || i.call(t, e));
        break;
      case p.STREAM_END: {
        t && (this._options.debug && _(
          `stream end ${e.method} ${e.status}(${w[e.status]}) ${e.error ? "error message: " + e.error : "success"}`
        ), e.error ? t.onError(new x(e.status ?? w.INTERNAL, e.error)) : t.onEnd(e), this._tasks.delete(e.id));
        break;
      }
      case p.ABORT: {
        this._options.debug && _(`abort request ${e.method}`), t && t.onError(new x(e.status ?? w.ABORTED, e.error ?? "Request aborted"));
        break;
      }
      case p.CONNECT:
        C("type CONNECT in received");
        break;
      case p.DISCONNECT:
        C("type DISCONNECT in received");
        break;
      case p.UNARY_SERVER:
        C("type UNARY_SERVER in received");
        break;
      default:
        Oe("Unknown message type: ", e);
        break;
    }
  }
  on(e, t) {
    return this._emitter.on(e, t);
  }
  off(e, t) {
    return this._emitter.off(e, t);
  }
  once(e, t) {
    return this._emitter.once(e, t);
  }
}
export {
  G as ClientService,
  x as MethodError,
  w as Status,
  B as TransportState,
  ze as UConnectClient
};
