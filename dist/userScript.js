(function tvadblock() {
  if (!/(^|\.)(hulu\.com)$/.test(location.hostname) && location.protocol !== "file:" && location.protocol !== "app:" && !/^(localhost|127.0.0.1)$/.test(location.hostname)) {
    return;
  }
  if (window.__tvadblock_hulu) {
    return;
  }
  window.__tvadblock_hulu = true;
  const scriptletGlobals = {};
  function setConstant(...args) {
    setConstantFn(false, ...args);
  }
  function setConstantFn(trusted = false, chain = "", rawValue = "", ...varargs) {
    if (chain === "") {
      return;
    }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix("set-constant", chain, rawValue);
    const extraArgs = safe.parseVarargs(varargs);
    function setConstant2(chain2, rawValue2) {
      const trappedProp = (() => {
        const pos = chain2.lastIndexOf(".");
        if (pos === -1) {
          return chain2;
        }
        return chain2.slice(pos + 1);
      })();
      const cloakFunc = (fn) => {
        safe.Object_defineProperty(fn, "name", { value: trappedProp });
        return new Proxy(fn, {
          defineProperty(target, prop) {
            if (prop !== "toString") {
              return Reflect.defineProperty(...arguments);
            }
            return true;
          },
          deleteProperty(target, prop) {
            if (prop !== "toString") {
              return Reflect.deleteProperty(...arguments);
            }
            return true;
          },
          get(target, prop) {
            if (prop === "toString") {
              return function() {
                return `function ${trappedProp}() { [native code] }`;
              }.bind(null);
            }
            return Reflect.get(...arguments);
          }
        });
      };
      if (trappedProp === "") {
        return;
      }
      const thisScript = document.currentScript;
      let normalValue = validateConstantFn(trusted, rawValue2, extraArgs);
      if (rawValue2 === "noopFunc" || rawValue2 === "trueFunc" || rawValue2 === "falseFunc") {
        normalValue = cloakFunc(normalValue);
      }
      let aborted = false;
      const mustAbort = function(v) {
        if (trusted) {
          return false;
        }
        if (aborted) {
          return true;
        }
        aborted = v !== void 0 && v !== null && (normalValue !== void 0 && normalValue !== null) && typeof v !== typeof normalValue;
        if (aborted) {
          safe.uboLog(logPrefix, `Aborted because value set to ${v}`);
        }
        return aborted;
      };
      const trapProp = function(owner, prop, configurable, handler) {
        if (handler.init(configurable ? owner[prop] : normalValue) === false) {
          return;
        }
        const odesc = safe.Object_getOwnPropertyDescriptor(owner, prop);
        let prevGetter, prevSetter;
        if (odesc instanceof safe.Object) {
          owner[prop] = normalValue;
          if (odesc.get instanceof Function) {
            prevGetter = odesc.get;
          }
          if (odesc.set instanceof Function) {
            prevSetter = odesc.set;
          }
        }
        try {
          safe.Object_defineProperty(owner, prop, {
            configurable,
            get() {
              if (prevGetter !== void 0) {
                prevGetter();
              }
              return handler.getter();
            },
            set(a) {
              if (prevSetter !== void 0) {
                prevSetter(a);
              }
              handler.setter(a);
            }
          });
          safe.uboLog(logPrefix, "Trap installed");
        } catch (ex) {
          safe.uboErr(logPrefix, ex);
        }
      };
      const trapChain = function(owner, chain3) {
        const pos = chain3.indexOf(".");
        if (pos === -1) {
          trapProp(owner, chain3, false, {
            v: void 0,
            init: function(v2) {
              if (mustAbort(v2)) {
                return false;
              }
              this.v = v2;
              return true;
            },
            getter: function() {
              if (document.currentScript === thisScript) {
                return this.v;
              }
              safe.uboLog(logPrefix, "Property read");
              return normalValue;
            },
            setter: function(a) {
              if (mustAbort(a) === false) {
                return;
              }
              normalValue = a;
            }
          });
          return;
        }
        const prop = chain3.slice(0, pos);
        const v = owner[prop];
        chain3 = chain3.slice(pos + 1);
        if (v instanceof safe.Object || typeof v === "object" && v !== null) {
          trapChain(v, chain3);
          return;
        }
        trapProp(owner, prop, true, {
          v: void 0,
          init: function(v2) {
            this.v = v2;
            return true;
          },
          getter: function() {
            return this.v;
          },
          setter: function(a) {
            this.v = a;
            if (a instanceof safe.Object) {
              trapChain(a, chain3);
            }
          }
        });
      };
      trapChain(window, chain2);
    }
    runAt(() => {
      setConstant2(chain, rawValue);
    }, extraArgs.runAt);
  }
  function runAt(fn, when) {
    const intFromReadyState = (state) => {
      const targets = {
        "loading": 1,
        "asap": 1,
        "interactive": 2,
        "end": 2,
        "2": 2,
        "complete": 3,
        "idle": 3,
        "3": 3
      };
      const tokens = Array.isArray(state) ? state : [state];
      for (const token of tokens) {
        const prop = `${token}`;
        if (Object.hasOwn(targets, prop) === false) {
          continue;
        }
        return targets[prop];
      }
      return 0;
    };
    const runAt2 = intFromReadyState(when);
    if (intFromReadyState(document.readyState) >= runAt2) {
      fn();
      return;
    }
    const onStateChange = () => {
      if (intFromReadyState(document.readyState) < runAt2) {
        return;
      }
      fn();
      safe.removeEventListener.apply(document, args);
    };
    const safe = safeSelf();
    const args = ["readystatechange", onStateChange, { capture: true }];
    safe.addEventListener.apply(document, args);
  }
  function safeSelf() {
    if (safeSelf.safe) {
      return safeSelf.safe;
    }
    const self2 = globalThis;
    const safe = {
      "Array_from": Array.from,
      "Error": self2.Error,
      "Function_toString": Function.prototype.call.bind(self2.Function.prototype.toString),
      "Math_floor": Math.floor,
      "Math_max": Math.max,
      "Math_min": Math.min,
      "Math_random": Math.random,
      "Object": Object,
      "Object_defineProperty": Object.defineProperty.bind(Object),
      "Object_defineProperties": Object.defineProperties.bind(Object),
      "Object_fromEntries": Object.fromEntries.bind(Object),
      "Object_getOwnPropertyDescriptor": Object.getOwnPropertyDescriptor.bind(Object),
      "Object_hasOwn": Object.hasOwn.bind(Object),
      "Object_toString": Object.prototype.toString,
      "RegExp": self2.RegExp,
      "RegExp_test": Function.prototype.call.bind(self2.RegExp.prototype.test),
      "RegExp_exec": self2.RegExp.prototype.exec,
      "Request_clone": self2.Request.prototype.clone,
      "String": self2.String,
      "String_fromCharCode": String.fromCharCode,
      "String_split": String.prototype.split,
      "XMLHttpRequest": self2.XMLHttpRequest,
      "addEventListener": self2.EventTarget.prototype.addEventListener,
      "removeEventListener": self2.EventTarget.prototype.removeEventListener,
      "fetch": self2.fetch,
      "JSON": self2.JSON,
      "JSON_parse": Function.prototype.call.bind(self2.JSON.parse, self2.JSON),
      "JSON_stringify": Function.prototype.call.bind(self2.JSON.stringify, self2.JSON),
      "log": console.log.bind(console),
      // Properties
      logLevel: 0,
      // Methods
      makeLogPrefix(...args) {
        return this.sendToLogger && `[${args.join(" \u205D ")}]` || "";
      },
      uboLog(...args) {
        if (this.sendToLogger === void 0) {
          return;
        }
        if (args === void 0 || args[0] === "") {
          return;
        }
        return this.sendToLogger("info", ...args);
      },
      uboErr(...args) {
        if (this.sendToLogger === void 0) {
          return;
        }
        if (args === void 0 || args[0] === "") {
          return;
        }
        return this.sendToLogger("error", ...args);
      },
      escapeRegexChars(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      },
      initPattern(pattern, options = {}) {
        if (pattern === "") {
          return { matchAll: true, expect: true };
        }
        const expect = options.canNegate !== true || pattern.startsWith("!") === false;
        if (expect === false) {
          pattern = pattern.slice(1);
        }
        const match = /^\/(.+)\/([gimsu]*)$/.exec(pattern);
        if (match !== null) {
          return {
            re: new this.RegExp(
              match[1],
              match[2] || options.flags
            ),
            expect
          };
        }
        if (options.flags !== void 0) {
          return {
            re: new this.RegExp(
              this.escapeRegexChars(pattern),
              options.flags
            ),
            expect
          };
        }
        return { pattern, expect };
      },
      testPattern(details, haystack) {
        if (details.matchAll) {
          return true;
        }
        if (details.re) {
          return this.RegExp_test(details.re, haystack) === details.expect;
        }
        return haystack.includes(details.pattern) === details.expect;
      },
      patternToRegex(pattern, flags = void 0, verbatim = false) {
        if (pattern === "") {
          return /^/;
        }
        const match = /^\/(.+)\/([gimsu]*)$/.exec(pattern);
        if (match === null) {
          const reStr = this.escapeRegexChars(pattern);
          return new RegExp(verbatim ? `^${reStr}$` : reStr, flags);
        }
        try {
          return new RegExp(match[1], match[2] || void 0);
        } catch {
        }
        return /^/;
      },
      parseVarargs(varargs) {
        const entries = varargs.reduce((out, v, i, a) => {
          if (i & 1) {
            return out;
          }
          const rawValue = a[i + 1];
          const value = /^\d+$/.test(rawValue) ? parseInt(rawValue, 10) : rawValue;
          out.push([a[i], value]);
          return out;
        }, []);
        return this.Object_fromEntries(entries);
      }
    };
    safeSelf.safe = safe;
    if (scriptletGlobals.bcSecret === void 0) {
      return safe;
    }
    safe.logLevel = scriptletGlobals.logLevel || 1;
    let lastLogType = "";
    let lastLogText = "";
    let lastLogTime = 0;
    safe.toLogText = (type, ...args) => {
      if (args.length === 0) {
        return;
      }
      const text = `[${document.location.hostname || document.location.href}]${args.join(" ")}`;
      if (text === lastLogText && type === lastLogType) {
        if (Date.now() - lastLogTime < 5e3) {
          return;
        }
      }
      lastLogType = type;
      lastLogText = text;
      lastLogTime = Date.now();
      return text;
    };
    try {
      const bc = new self2.BroadcastChannel(scriptletGlobals.bcSecret);
      let bcBuffer = [];
      safe.sendToLogger = (type, ...args) => {
        const text = safe.toLogText(type, ...args);
        if (text === void 0) {
          return;
        }
        if (bcBuffer === void 0) {
          return bc.postMessage({ what: "messageToLogger", type, text });
        }
        bcBuffer.push({ type, text });
      };
      bc.onmessage = (ev) => {
        const msg = ev.data;
        switch (msg) {
          case "iamready!":
            if (bcBuffer === void 0) {
              break;
            }
            bcBuffer.forEach(
              ({ type, text }) => bc.postMessage({ what: "messageToLogger", type, text })
            );
            bcBuffer = void 0;
            break;
          case "setScriptletLogLevelToOne":
            safe.logLevel = 1;
            break;
          case "setScriptletLogLevelToTwo":
            safe.logLevel = 2;
            break;
        }
      };
      bc.postMessage("areyouready?");
    } catch {
      safe.sendToLogger = (type, ...args) => {
        const text = safe.toLogText(type, ...args);
        if (text === void 0) {
          return;
        }
        safe.log(`uBO ${text}`);
      };
    }
    return safe;
  }
  function validateConstantFn(trusted, raw, extraArgs = {}) {
    const safe = safeSelf();
    let value;
    if (raw === "undefined") {
      value = void 0;
    } else if (raw === "false") {
      value = false;
    } else if (raw === "true") {
      value = true;
    } else if (raw === "null") {
      value = null;
    } else if (raw === "''" || raw === "") {
      value = "";
    } else if (raw === "[]" || raw === "emptyArr") {
      value = [];
    } else if (raw === "{}" || raw === "emptyObj") {
      value = {};
    } else if (raw === "noopFunc") {
      value = function() {
      };
    } else if (raw === "trueFunc") {
      value = function() {
        return true;
      };
    } else if (raw === "falseFunc") {
      value = function() {
        return false;
      };
    } else if (raw === "throwFunc") {
      value = function() {
        throw "";
      };
    } else if (/^-?\d+$/.test(raw)) {
      value = parseInt(raw);
      if (isNaN(raw)) {
        return;
      }
      if (Math.abs(raw) > 32767) {
        return;
      }
    } else if (trusted) {
      if (raw.startsWith("json:")) {
        try {
          value = safe.JSON_parse(raw.slice(5));
        } catch {
          return;
        }
      } else if (raw.startsWith("{") && raw.endsWith("}")) {
        try {
          value = safe.JSON_parse(raw).value;
        } catch {
          return;
        }
      }
    } else {
      return;
    }
    if (extraArgs.as !== void 0) {
      if (extraArgs.as === "function") {
        return () => value;
      } else if (extraArgs.as === "callback") {
        return () => (() => value);
      } else if (extraArgs.as === "resolved") {
        return Promise.resolve(value);
      } else if (extraArgs.as === "rejected") {
        return Promise.reject(value);
      }
    }
    return value;
  }
  function jsonPruneFetchResponse(rawPrunePaths = "", rawNeedlePaths = "", ...varargs) {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix("json-prune-fetch-response", rawPrunePaths, rawNeedlePaths);
    const extraArgs = safe.parseVarargs(varargs);
    const propNeedles = parsePropertiesToMatchFn(extraArgs.propsToMatch, "url");
    const stackNeedle = safe.initPattern(extraArgs.stackToMatch || "", { canNegate: true });
    const logall = rawPrunePaths === "";
    const applyHandler = function(target, thisArg, args) {
      const fetchPromise = Reflect.apply(target, thisArg, args);
      if (propNeedles.size !== 0) {
        const props = collateFetchArgumentsFn(...args);
        const matched = matchObjectPropertiesFn(propNeedles, props);
        if (matched === void 0) {
          return fetchPromise;
        }
        if (safe.logLevel > 1) {
          safe.uboLog(logPrefix, `Matched "propsToMatch":
	${matched.join("\n	")}`);
        }
      }
      return fetchPromise.then((responseBefore) => {
        const response = responseBefore.clone();
        return response.json().then((objBefore) => {
          if (typeof objBefore !== "object") {
            return responseBefore;
          }
          if (logall) {
            safe.uboLog(logPrefix, safe.JSON_stringify(objBefore, null, 2));
            return responseBefore;
          }
          const objAfter = objectPruneFn(
            objBefore,
            rawPrunePaths,
            rawNeedlePaths,
            stackNeedle,
            extraArgs
          );
          if (typeof objAfter !== "object") {
            return responseBefore;
          }
          safe.uboLog(logPrefix, "Pruned");
          const responseAfter = Response.json(objAfter, {
            status: responseBefore.status,
            statusText: responseBefore.statusText,
            headers: responseBefore.headers
          });
          Object.defineProperties(responseAfter, {
            ok: { value: responseBefore.ok },
            redirected: { value: responseBefore.redirected },
            type: { value: responseBefore.type },
            url: { value: responseBefore.url }
          });
          return responseAfter;
        }).catch((reason) => {
          safe.uboErr(logPrefix, "Error:", reason);
          return responseBefore;
        });
      }).catch((reason) => {
        safe.uboErr(logPrefix, "Error:", reason);
        return fetchPromise;
      });
    };
    self.fetch = new Proxy(self.fetch, {
      apply: applyHandler
    });
  }
  function collateFetchArgumentsFn(resource, options) {
    const safe = safeSelf();
    const props = [
      "body",
      "cache",
      "credentials",
      "duplex",
      "headers",
      "integrity",
      "keepalive",
      "method",
      "mode",
      "priority",
      "redirect",
      "referrer",
      "referrerPolicy",
      "url"
    ];
    const out = {};
    if (collateFetchArgumentsFn.collateKnownProps === void 0) {
      collateFetchArgumentsFn.collateKnownProps = (src, out2) => {
        for (const prop of props) {
          if (src[prop] === void 0) {
            continue;
          }
          out2[prop] = src[prop];
        }
      };
    }
    if (typeof resource !== "object" || safe.Object_toString.call(resource) !== "[object Request]") {
      out.url = `${resource}`;
    } else {
      let clone;
      try {
        clone = safe.Request_clone.call(resource);
      } catch {
      }
      collateFetchArgumentsFn.collateKnownProps(clone || resource, out);
    }
    if (typeof options === "object" && options !== null) {
      collateFetchArgumentsFn.collateKnownProps(options, out);
    }
    return out;
  }
  function matchObjectPropertiesFn(propNeedles, ...objs) {
    const safe = safeSelf();
    const matched = [];
    for (const obj of objs) {
      if (obj instanceof Object === false) {
        continue;
      }
      for (const [prop, details] of propNeedles) {
        let value = obj[prop];
        if (value === void 0) {
          continue;
        }
        if (typeof value !== "string") {
          try {
            value = safe.JSON_stringify(value);
          } catch {
          }
          if (typeof value !== "string") {
            continue;
          }
        }
        if (safe.testPattern(details, value) === false) {
          return;
        }
        matched.push(`${prop}: ${value}`);
      }
    }
    return matched;
  }
  function objectPruneFn(obj, rawPrunePaths, rawNeedlePaths, stackNeedleDetails = { matchAll: true }, extraArgs = {}) {
    if (typeof rawPrunePaths !== "string") {
      return;
    }
    const safe = safeSelf();
    const prunePaths = rawPrunePaths !== "" ? safe.String_split.call(rawPrunePaths, / +/) : [];
    const needlePaths = prunePaths.length !== 0 && rawNeedlePaths !== "" ? safe.String_split.call(rawNeedlePaths, / +/) : [];
    if (stackNeedleDetails.matchAll !== true) {
      if (matchesStackTraceFn(stackNeedleDetails, extraArgs.logstack) === false) {
        return;
      }
    }
    if (objectPruneFn.mustProcess === void 0) {
      objectPruneFn.mustProcess = (root, needlePaths2) => {
        for (const needlePath of needlePaths2) {
          if (objectFindOwnerFn(root, needlePath) === false) {
            return false;
          }
        }
        return true;
      };
    }
    if (prunePaths.length === 0) {
      return;
    }
    let outcome = "nomatch";
    if (objectPruneFn.mustProcess(obj, needlePaths)) {
      for (const path of prunePaths) {
        if (objectFindOwnerFn(obj, path, true)) {
          outcome = "match";
        }
      }
    }
    if (outcome === "match") {
      return obj;
    }
  }
  function matchesStackTraceFn(needleDetails, logLevel = "") {
    const safe = safeSelf();
    const exceptionToken = getExceptionTokenFn();
    const error = new safe.Error(exceptionToken);
    const docURL = new URL(self.location.href);
    docURL.hash = "";
    const reLine = /(.*?@)?(\S+)(:\d+):\d+\)?$/;
    const lines = [];
    for (let line of safe.String_split.call(error.stack, /[\n\r]+/)) {
      if (line.includes(exceptionToken)) {
        continue;
      }
      line = line.trim();
      const match = safe.RegExp_exec.call(reLine, line);
      if (match === null) {
        continue;
      }
      let url = match[2];
      if (url.startsWith("(")) {
        url = url.slice(1);
      }
      if (url === docURL.href) {
        url = "inlineScript";
      } else if (url.startsWith("<anonymous>")) {
        url = "injectedScript";
      }
      let fn = match[1] !== void 0 ? match[1].slice(0, -1) : line.slice(0, match.index).trim();
      if (fn.startsWith("at")) {
        fn = fn.slice(2).trim();
      }
      let rowcol = match[3];
      lines.push(" " + `${fn} ${url}${rowcol}:1`.trim());
    }
    lines[0] = `stackDepth:${lines.length - 1}`;
    const stack = lines.join("	");
    const r = needleDetails.matchAll !== true && safe.testPattern(needleDetails, stack);
    if (logLevel === "all" || logLevel === "match" && r || logLevel === "nomatch" && !r) {
      safe.uboLog(stack.replace(/\t/g, "\n"));
    }
    return r;
  }
  function getExceptionTokenFn() {
    const token = getRandomTokenFn();
    const oe = self.onerror;
    self.onerror = function(msg, ...args) {
      if (typeof msg === "string" && msg.includes(token)) {
        return true;
      }
      if (oe instanceof Function) {
        return oe.call(this, msg, ...args);
      }
    }.bind();
    return token;
  }
  function getRandomTokenFn() {
    const safe = safeSelf();
    return safe.String_fromCharCode(Date.now() % 26 + 97) + safe.Math_floor(safe.Math_random() * 982451653 + 982451653).toString(36);
  }
  function objectFindOwnerFn(root, path, prune = false) {
    const safe = safeSelf();
    let owner = root;
    let chain = path;
    for (; ; ) {
      if (typeof owner !== "object" || owner === null) {
        return false;
      }
      const pos = chain.indexOf(".");
      if (pos === -1) {
        if (prune === false) {
          return safe.Object_hasOwn(owner, chain);
        }
        let modified = false;
        if (chain === "*") {
          for (const key in owner) {
            if (safe.Object_hasOwn(owner, key) === false) {
              continue;
            }
            delete owner[key];
            modified = true;
          }
        } else if (safe.Object_hasOwn(owner, chain)) {
          delete owner[chain];
          modified = true;
        }
        return modified;
      }
      const prop = chain.slice(0, pos);
      const next = chain.slice(pos + 1);
      let found = false;
      if (prop === "[-]" && Array.isArray(owner)) {
        let i = owner.length;
        while (i--) {
          if (objectFindOwnerFn(owner[i], next) === false) {
            continue;
          }
          owner.splice(i, 1);
          found = true;
        }
        return found;
      }
      if (prop === "{-}" && owner instanceof Object) {
        for (const key of Object.keys(owner)) {
          if (objectFindOwnerFn(owner[key], next) === false) {
            continue;
          }
          delete owner[key];
          found = true;
        }
        return found;
      }
      if (prop === "[]" && Array.isArray(owner) || prop === "{}" && owner instanceof Object || prop === "*" && owner instanceof Object) {
        for (const key of Object.keys(owner)) {
          if (objectFindOwnerFn(owner[key], next, prune) === false) {
            continue;
          }
          found = true;
        }
        return found;
      }
      if (safe.Object_hasOwn(owner, prop) === false) {
        return false;
      }
      owner = owner[prop];
      chain = chain.slice(pos + 1);
    }
  }
  function parsePropertiesToMatchFn(propsToMatch, implicit = "") {
    const safe = safeSelf();
    const needles = /* @__PURE__ */ new Map();
    if (propsToMatch === void 0 || propsToMatch === "") {
      return needles;
    }
    const options = { canNegate: true };
    for (const needle of safe.String_split.call(propsToMatch, /\s+/)) {
      let [prop, pattern] = safe.String_split.call(needle, ":");
      if (prop === "") {
        continue;
      }
      if (pattern !== void 0 && /[^$\w -]/.test(prop)) {
        prop = `${prop}:${pattern}`;
        pattern = void 0;
      }
      if (pattern !== void 0) {
        needles.set(prop, safe.initPattern(pattern, options));
      } else if (implicit !== "") {
        needles.set(implicit, safe.initPattern(prop, options));
      }
    }
    return needles;
  }
  function jsonPrune(rawPrunePaths = "", rawNeedlePaths = "", stackNeedle = "", ...varargs) {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix("json-prune", rawPrunePaths, rawNeedlePaths, stackNeedle);
    const stackNeedleDetails = safe.initPattern(stackNeedle, { canNegate: true });
    const extraArgs = safe.parseVarargs(varargs);
    proxyApplyFn("JSON.parse", function(context) {
      const objBefore = context.reflect();
      if (rawPrunePaths === "") {
        safe.uboLog(logPrefix, safe.JSON_stringify(objBefore, null, 2));
      }
      const objAfter = objectPruneFn(
        objBefore,
        rawPrunePaths,
        rawNeedlePaths,
        stackNeedleDetails,
        extraArgs
      );
      if (objAfter === void 0) {
        return objBefore;
      }
      safe.uboLog(logPrefix, "Pruned");
      if (safe.logLevel > 1) {
        safe.uboLog(logPrefix, `After pruning:
${safe.JSON_stringify(objAfter, null, 2)}`);
      }
      return objAfter;
    });
  }
  function proxyApplyFn(target = "", handler = "", options = {}) {
    var _a;
    let context = globalThis;
    let prop = target;
    for (; ; ) {
      const pos = prop.indexOf(".");
      if (pos === -1) {
        break;
      }
      context = context[prop.slice(0, pos)];
      if (context instanceof Object === false) {
        return;
      }
      prop = prop.slice(pos + 1);
    }
    const fn = context[prop];
    if (typeof fn !== "function") {
      return;
    }
    if (proxyApplyFn.CtorContext === void 0) {
      proxyApplyFn.ctorContexts = [];
      proxyApplyFn.CtorContext = class {
        constructor(...args) {
          this.init(...args);
        }
        init(callFn, callArgs) {
          this.callFn = callFn;
          this.callArgs = callArgs;
          return this;
        }
        reflect() {
          const r = Reflect.construct(this.callFn, this.callArgs);
          this.callFn = this.callArgs = this.private = void 0;
          proxyApplyFn.ctorContexts.push(this);
          return r;
        }
        static factory(...args) {
          return proxyApplyFn.ctorContexts.length !== 0 ? proxyApplyFn.ctorContexts.pop().init(...args) : new proxyApplyFn.CtorContext(...args);
        }
      };
      proxyApplyFn.applyContexts = [];
      proxyApplyFn.ApplyContext = class {
        constructor(...args) {
          this.init(...args);
        }
        init(callFn, thisArg, callArgs) {
          this.callFn = callFn;
          this.thisArg = thisArg;
          this.callArgs = callArgs;
          return this;
        }
        reflect() {
          const r = Reflect.apply(this.callFn, this.thisArg, this.callArgs);
          this.callFn = this.thisArg = this.callArgs = this.private = void 0;
          proxyApplyFn.applyContexts.push(this);
          return r;
        }
        static factory(...args) {
          return proxyApplyFn.applyContexts.length !== 0 ? proxyApplyFn.applyContexts.pop().init(...args) : new proxyApplyFn.ApplyContext(...args);
        }
      };
      proxyApplyFn.isCtor = /* @__PURE__ */ new Map();
      proxyApplyFn.proxies = /* @__PURE__ */ new WeakMap();
      if ((options.skipToString || proxyApplyFn.skipToString) !== true) {
        proxyApplyFn.nativeToString = Function.prototype.toString;
        const proxiedToString = new Proxy(Function.prototype.toString, {
          apply(target2, thisArg) {
            let proxied = thisArg;
            for (; ; ) {
              const fn2 = proxyApplyFn.proxies.get(proxied);
              if (fn2 === void 0) {
                break;
              }
              proxied = fn2;
            }
            return proxyApplyFn.nativeToString.call(proxied);
          }
        });
        proxyApplyFn.proxies.set(proxiedToString, proxyApplyFn.nativeToString);
        Function.prototype.toString = proxiedToString;
      }
    }
    if (proxyApplyFn.isCtor.has(target) === false) {
      proxyApplyFn.isCtor.set(target, ((_a = fn.prototype) == null ? void 0 : _a.constructor) === fn);
    }
    const proxyDetails = {
      apply(target2, thisArg, args) {
        return handler(proxyApplyFn.ApplyContext.factory(target2, thisArg, args));
      }
    };
    if (proxyApplyFn.isCtor.get(target)) {
      proxyDetails.construct = function(target2, args) {
        return handler(proxyApplyFn.CtorContext.factory(target2, args));
      };
    }
    const proxiedTarget = new Proxy(fn, proxyDetails);
    proxyApplyFn.proxies.set(proxiedTarget, fn);
    context[prop] = proxiedTarget;
  }
  function xmlPrune(selector = "", selectorCheck = "", urlPattern = "", ...varargs) {
    if (typeof selector !== "string") {
      return;
    }
    if (selector === "") {
      return;
    }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix("xml-prune", selector, selectorCheck, urlPattern);
    const reUrl = safe.patternToRegex(urlPattern);
    const extraArgs = safe.parseVarargs(varargs);
    const queryAll = (xmlDoc, selector2) => {
      const isXpath = /^xpath\(.+\)$/.test(selector2);
      if (isXpath === false) {
        return Array.from(xmlDoc.querySelectorAll(selector2));
      }
      const xpr = xmlDoc.evaluate(
        selector2.slice(6, -1),
        xmlDoc,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const out = [];
      for (let i = 0; i < xpr.snapshotLength; i++) {
        const node = xpr.snapshotItem(i);
        out.push(node);
      }
      return out;
    };
    const pruneFromDoc = (xmlDoc) => {
      try {
        if (selectorCheck !== "" && xmlDoc.querySelector(selectorCheck) === null) {
          return xmlDoc;
        }
        if (extraArgs.logdoc) {
          const serializer = new XMLSerializer();
          safe.uboLog(logPrefix, `Document is
	${serializer.serializeToString(xmlDoc)}`);
        }
        const items = queryAll(xmlDoc, selector);
        if (items.length === 0) {
          return xmlDoc;
        }
        safe.uboLog(logPrefix, `Removing ${items.length} items`);
        for (const item of items) {
          if (item.nodeType === 1) {
            item.remove();
          } else if (item.nodeType === 2) {
            item.ownerElement.removeAttribute(item.nodeName);
          }
          safe.uboLog(logPrefix, `${item.constructor.name}.${item.nodeName} removed`);
        }
      } catch (ex) {
        safe.uboErr(logPrefix, `Error: ${ex}`);
      }
      return xmlDoc;
    };
    const pruneFromText = (text) => {
      if ((/^\s*</.test(text) && />\s*$/.test(text)) === false) {
        return text;
      }
      try {
        const xmlParser = new DOMParser();
        const xmlDoc = xmlParser.parseFromString(text, "text/xml");
        pruneFromDoc(xmlDoc);
        const serializer = new XMLSerializer();
        text = serializer.serializeToString(xmlDoc);
      } catch {
      }
      return text;
    };
    const urlFromArg = (arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      if (arg instanceof Request) {
        return arg.url;
      }
      return String(arg);
    };
    self.fetch = new Proxy(self.fetch, {
      apply: function(target, thisArg, args) {
        const fetchPromise = Reflect.apply(target, thisArg, args);
        if (reUrl.test(urlFromArg(args[0])) === false) {
          return fetchPromise;
        }
        return fetchPromise.then((responseBefore) => {
          const response = responseBefore.clone();
          return response.text().then((text) => {
            const responseAfter = new Response(pruneFromText(text), {
              status: responseBefore.status,
              statusText: responseBefore.statusText,
              headers: responseBefore.headers
            });
            Object.defineProperties(responseAfter, {
              ok: { value: responseBefore.ok },
              redirected: { value: responseBefore.redirected },
              type: { value: responseBefore.type },
              url: { value: responseBefore.url }
            });
            return responseAfter;
          }).catch(
            () => responseBefore
          );
        });
      }
    });
    modifyXhrResponseFn(urlPattern, (xhr, before) => {
      if (before instanceof XMLDocument) {
        return pruneFromDoc(before);
      }
      if (typeof before === "string") {
        return pruneFromText(before);
      }
      return before;
    });
  }
  function modifyXhrResponseFn(propsToMatch = "", modifierFn = "") {
    if (typeof propsToMatch !== "string") {
      return;
    }
    const safe = safeSelf();
    if (modifyXhrResponseFn.xhrInstances === void 0) {
      modifyXhrResponseFn.xhrInstances = /* @__PURE__ */ new WeakMap();
    }
    const propNeedles = parsePropertiesToMatchFn(propsToMatch, "url");
    const NativeXMLHttpRequest = self.XMLHttpRequest;
    const TrappedXMLHttpRequest = class XMLHttpRequest extends NativeXMLHttpRequest {
      open(method, url, ...args) {
        const haystack = { method, url };
        if (propsToMatch === "") {
          safe.uboLog(`modifyXhrResponseFn() / Called: ${safe.JSON_stringify(haystack, null, 2)}`);
        } else if (matchObjectPropertiesFn(propNeedles, haystack)) {
          modifyXhrResponseFn.xhrInstances.set(this, modifierFn);
        }
        return super.open(method, url, ...args);
      }
      get response() {
        const modifierFn2 = modifyXhrResponseFn.xhrInstances.get(this);
        return modifierFn2 ? modifierFn2(this, super.response) : super.response;
      }
      get responseText() {
        const modifierFn2 = modifyXhrResponseFn.xhrInstances.get(this);
        return modifierFn2 ? modifierFn2(this, super.responseText) : super.responseText;
      }
      get responseXML() {
        const modifierFn2 = modifyXhrResponseFn.xhrInstances.get(this);
        return modifierFn2 ? modifierFn2(this, super.responseXML) : super.responseXML;
      }
    };
    proxyToStringFn(TrappedXMLHttpRequest.prototype.open, NativeXMLHttpRequest.prototype.open);
    proxyToStringFn(TrappedXMLHttpRequest, NativeXMLHttpRequest);
    self.XMLHttpRequest = TrappedXMLHttpRequest;
  }
  function proxyToStringFn(proxiedFn, nativeFn) {
    if (proxyToStringFn.proxies === void 0) {
      proxyToStringFn.proxies = /* @__PURE__ */ new WeakMap();
      proxyToStringFn.nativeToString = Function.prototype.toString;
      const proxiedToString = new Proxy(Function.prototype.toString, {
        apply(target, thisArg) {
          let proxied = thisArg;
          for (; ; ) {
            const fn = proxyToStringFn.proxies.get(proxied);
            if (fn === void 0) {
              break;
            }
            proxied = fn;
          }
          return proxyToStringFn.nativeToString.call(proxied);
        }
      });
      proxyToStringFn.proxies.set(proxiedToString, proxyToStringFn.nativeToString);
      Function.prototype.toString = proxiedToString;
    }
    proxyToStringFn.proxies.set(proxiedFn, nativeFn);
  }
  function jsonPruneXhrResponse(rawPrunePaths = "", rawNeedlePaths = "", ...varargs) {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix("json-prune-xhr-response", rawPrunePaths, rawNeedlePaths);
    const xhrInstances = /* @__PURE__ */ new WeakMap();
    const extraArgs = safe.parseVarargs(varargs);
    const propNeedles = parsePropertiesToMatchFn(extraArgs.propsToMatch, "url");
    const stackNeedle = safe.initPattern(extraArgs.stackToMatch || "", { canNegate: true });
    self.XMLHttpRequest = class extends self.XMLHttpRequest {
      open(method, url, ...args) {
        const xhrDetails = { method, url };
        let outcome = "match";
        if (propNeedles.size !== 0) {
          if (matchObjectPropertiesFn(propNeedles, xhrDetails) === void 0) {
            outcome = "nomatch";
          }
        }
        if (outcome === "match") {
          if (safe.logLevel > 1) {
            safe.uboLog(logPrefix, `Matched optional "propsToMatch", "${extraArgs.propsToMatch}"`);
          }
          xhrInstances.set(this, xhrDetails);
        }
        return super.open(method, url, ...args);
      }
      get response() {
        const innerResponse = super.response;
        const xhrDetails = xhrInstances.get(this);
        if (xhrDetails === void 0) {
          return innerResponse;
        }
        const responseLength = typeof innerResponse === "string" ? innerResponse.length : void 0;
        if (xhrDetails.lastResponseLength !== responseLength) {
          xhrDetails.response = void 0;
          xhrDetails.lastResponseLength = responseLength;
        }
        if (xhrDetails.response !== void 0) {
          return xhrDetails.response;
        }
        let objBefore;
        if (typeof innerResponse === "object") {
          objBefore = innerResponse;
        } else if (typeof innerResponse === "string") {
          try {
            objBefore = safe.JSON_parse(innerResponse);
          } catch {
          }
        }
        if (typeof objBefore !== "object") {
          return xhrDetails.response = innerResponse;
        }
        const objAfter = objectPruneFn(
          objBefore,
          rawPrunePaths,
          rawNeedlePaths,
          stackNeedle,
          extraArgs
        );
        let outerResponse;
        if (typeof objAfter === "object") {
          outerResponse = typeof innerResponse === "string" ? safe.JSON_stringify(objAfter) : objAfter;
          safe.uboLog(logPrefix, "Pruned");
        } else {
          outerResponse = innerResponse;
        }
        return xhrDetails.response = outerResponse;
      }
      get responseText() {
        const response = this.response;
        return typeof response !== "string" ? super.responseText : response;
      }
    };
  }
  function tvabNetwork(rules) {
    const toRe = (p) => new RegExp(p);
    const media = rules.filter((r) => r.kind === "media").map((r) => ({ re: toRe(r.re) }));
    const removeparam = rules.filter((r) => r.kind === "removeparam").map((r) => ({ re: toRe(r.re), param: r.param }));
    const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
    if (media.length) {
      const proto = HTMLMediaElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "src");
      const swap = (u) => typeof u === "string" && media.some((m) => m.re.test(u)) ? SILENT : u;
      if (desc && desc.set) {
        Object.defineProperty(proto, "src", {
          configurable: true,
          enumerable: desc.enumerable,
          get() {
            return desc.get.call(this);
          },
          set(v) {
            desc.set.call(this, swap(v));
          }
        });
      }
      const sa = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(n, v) {
        if (this instanceof HTMLMediaElement && String(n).toLowerCase() === "src") v = swap(v);
        return sa.call(this, n, v);
      };
    }
    if (removeparam.length) {
      const strip = (u) => {
        try {
          if (typeof u !== "string" || !removeparam.some((r) => r.re.test(u))) return u;
          const url = new URL(u, location.href);
          for (const r of removeparam) if (r.re.test(u)) url.searchParams.delete(r.param);
          return url.href;
        } catch (e) {
          return u;
        }
      };
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(m, u) {
        const a = Array.from(arguments);
        a[1] = strip(u);
        return open.apply(this, a);
      };
    }
  }
  function tvabCosmetic(selectors) {
    if (!selectors.length) return;
    const css = selectors.join(",\n") + " { display: none !important; }";
    const put = () => {
      if (document.getElementById("tvab-style")) return;
      const st = document.createElement("style");
      st.id = "tvab-style";
      st.textContent = css;
      (document.head || document.documentElement).appendChild(st);
    };
    put();
    new MutationObserver(put).observe(document.documentElement, { childList: true, subtree: true });
  }
  try {
    setConstant(...["Object.prototype._parseVAST", "noopFunc"]);
  } catch (e) {
  }
  try {
    setConstant(...["Object.prototype.createAdBlocker", "noopFunc"]);
  } catch (e) {
  }
  try {
    setConstant(...["Object.prototype.isAdPeriod", "falseFunc"]);
  } catch (e) {
  }
  try {
    jsonPruneFetchResponse(...["breaks custom_breaks_data pause_ads video_metadata.end_credits_time", "pause_ads", "propsToMatch", "/playlist"]);
  } catch (e) {
  }
  try {
    jsonPruneFetchResponse(...["breaks custom_breaks_data pause_ads video_metadata.end_credits_time", "breaks", "propsToMatch", "/playlist"]);
  } catch (e) {
  }
  try {
    jsonPruneFetchResponse(...["breaks custom_breaks_data pause_ads", "", "propsToMatch", "/playlist"]);
  } catch (e) {
  }
  try {
    jsonPrune(...["breaks custom_breaks_data pause_ads"]);
  } catch (e) {
  }
  try {
    jsonPrune(...["breaks custom_breaks_data pause_ads video_metadata.end_credits_time", "pause_ads"]);
  } catch (e) {
  }
  try {
    jsonPrune(...["breaks custom_breaks_data pause_ads video_metadata.end_credits_time", "breaks"]);
  } catch (e) {
  }
  try {
    xmlPrune(...['xpath(//*[name()="MPD"]/@mediaPresentationDuration | //*[name()="Period"][.//*[name()="BaseURL" and contains(text(),"/ads-")]] | //*[name()="Period"][starts-with(@id,"ad")] | //*[name()="Period"][starts-with(@id,"Ad")] | //*[name()="Period"]/@start)', 'MPD Period[id^="Ad"i]', ".mpd"]);
  } catch (e) {
  }
  try {
    jsonPruneXhrResponse(...["breaks custom_breaks_data pause_ads video_metadata.end_credits_time", "breaks", "propsToMatch", "/playlist"]);
  } catch (e) {
  }
  try {
    jsonPruneXhrResponse(...["breaks custom_breaks_data pause_ads", "", "propsToMatch", "/playlist"]);
  } catch (e) {
  }
  try {
    tvabNetwork([{ "kind": "media", "re": "^https?://assetshuluimcom-a\\.akamaihd\\.net/.*\\.mp3", "source": "uAssets/filters/filters-2025.txt:310 (redirect=noopmp3-0.1s)" }, { "kind": "media", "re": "^https?://assetshuluimcom-a\\.akamaihd\\.net/prerolls/", "source": "uAssets/filters/filters.txt:6710" }]);
  } catch (e) {
  }
  try {
    tvabCosmetic(["#banner-ad-container", ".ad-choices"]);
  } catch (e) {
  }
})();
try {
  (function tvabReport() {
    if (window.__tvabReport || typeof tizen === "undefined") {
      return;
    }
    window.__tvabReport = true;
    var svc = /hulu\.com$/.test(location.hostname) ? "hulu" : /max\.com$/.test(location.hostname) ? "max" : "web";
    function send(step, msg) {
      try {
        new Image().src = "http://192.168.0.19:8199/r/" + svc + "/page-" + step + "?m=" + encodeURIComponent(String(msg).slice(0, 300));
      } catch (e) {
      }
    }
    send("load", location.origin + location.pathname);
    window.addEventListener("error", function(e) {
      send("error", (e.message || "") + " @" + (e.filename || "").split("?")[0] + ":" + e.lineno);
    });
    window.addEventListener("unhandledrejection", function(e) {
      send("reject", e.reason && (e.reason.message || e.reason));
    });
  })();
} catch (e) {
}
try {
  (function tvabNav() {
    if (window.__tvabNav) {
      return;
    }
    window.__tvabNav = true;
    var SEL = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=tab], [role=menuitem], [tabindex]:not([tabindex="-1"]), [onclick]';
    var current = null;
    function addStyle() {
      if (document.getElementById("tvab-nav-style")) {
        return;
      }
      var st = document.createElement("style");
      st.id = "tvab-nav-style";
      st.textContent = ".tvab-focus { outline: 6px solid #ffcc00 !important; outline-offset: 3px !important; box-shadow: 0 0 0 9px rgba(0,0,0,.6) !important; border-radius: 6px; }";
      var host = document.head || document.documentElement;
      if (!host) {
        return;
      }
      host.appendChild(st);
    }
    function visible(el) {
      var r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) {
        return false;
      }
      var cs = getComputedStyle(el);
      return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0" && !el.disabled;
    }
    function candidates() {
      return Array.prototype.filter.call(document.querySelectorAll(SEL), visible);
    }
    function center(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
    }
    function setCurrent(el) {
      if (current) {
        current.classList.remove("tvab-focus");
      }
      current = el;
      if (!el) {
        return;
      }
      addStyle();
      el.classList.add("tvab-focus");
      try {
        el.focus({ preventScroll: true });
      } catch (e) {
      }
      el.scrollIntoView({ block: "center", inline: "nearest" });
    }
    function first() {
      var c = candidates();
      var inView = c.filter(function(el) {
        var r = el.getBoundingClientRect();
        return r.top >= 0 && r.top < innerHeight;
      });
      return inView[0] || c[0] || null;
    }
    function move(dir) {
      var c = candidates();
      if (!current || c.indexOf(current) < 0) {
        setCurrent(first());
        return;
      }
      var a = center(current), best = null, bestScore = Infinity;
      c.forEach(function(el) {
        if (el === current || current.contains(el) || el.contains(current)) {
          return;
        }
        var b = center(el), dx = b.x - a.x, dy = b.y - a.y;
        var primary, cross;
        if (dir === "left") {
          if (b.r.right > a.r.left + 2) {
            return;
          }
          primary = -dx;
          cross = Math.abs(dy);
        } else if (dir === "right") {
          if (b.r.left < a.r.right - 2) {
            return;
          }
          primary = dx;
          cross = Math.abs(dy);
        } else if (dir === "up") {
          if (b.r.bottom > a.r.top + 2) {
            return;
          }
          primary = -dy;
          cross = Math.abs(dx);
        } else {
          if (b.r.top < a.r.bottom - 2) {
            return;
          }
          primary = dy;
          cross = Math.abs(dx);
        }
        var score = primary + cross * 2.5;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      });
      if (best) {
        setCurrent(best);
      } else if (dir === "down") {
        window.scrollBy(0, innerHeight * 0.6);
      } else if (dir === "up") {
        window.scrollBy(0, -innerHeight * 0.6);
      }
    }
    function isText(el) {
      return el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" && !/^(button|submit|checkbox|radio|reset|image)$/i.test(el.type));
    }
    var KEYS = { 37: "left", 38: "up", 39: "right", 40: "down" };
    document.addEventListener("keydown", function(e) {
      var ui = document.getElementById("tvab-root");
      if (ui && ui.style.display !== "none") {
        return;
      }
      if (window.__tvabHuluUI && /^\/watch\//.test(location.pathname)) {
        return;
      }
      var active = document.activeElement;
      if (isText(active) && (e.keyCode === 37 || e.keyCode === 39)) {
        return;
      }
      if (KEYS[e.keyCode]) {
        if (active && active.tagName === "VIDEO") {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        move(KEYS[e.keyCode]);
        return;
      }
      if (e.keyCode === 13 && current) {
        if (isText(current)) {
          current.focus();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        current.click();
        return;
      }
      if (e.keyCode === 10009) {
        e.preventDefault();
        if (isText(active)) {
          active.blur();
          return;
        }
        history.length > 1 ? history.back() : tizen.application.getCurrentApplication().exit();
      }
    }, true);
    function boot() {
      try {
        addStyle();
        if (!current) {
          setCurrent(first());
        }
      } catch (e) {
      }
      try {
        new MutationObserver(function() {
          try {
            if (!current || !document.contains(current)) {
              setCurrent(first());
            }
          } catch (e) {
          }
        }).observe(document.documentElement, { childList: true, subtree: true });
      } catch (e) {
      }
    }
    if (document.readyState === "loading" || !document.documentElement || !document.body) {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
    window.__tvabFocus = function(selector) {
      var t0 = Date.now();
      (function tryIt() {
        var el = document.querySelector(selector);
        if (el && visible(el)) {
          setCurrent(el);
          return;
        }
        if (Date.now() - t0 < 2e4) {
          setTimeout(tryIt, 300);
        }
      })();
    };
  })();
} catch (e) {
}
try {
  (function tvabHuluUI() {
    if (window.__tvabHuluUI || !/(^|\.)hulu\.com$/.test(location.hostname)) {
      return;
    }
    window.__tvabHuluUI = true;
    var API = "https://discover.hulu.com/content/v5";
    var onWatch = function() {
      return /^\/watch\//.test(location.pathname);
    };
    var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 10009, PLAYPAUSE: 10252, PLAY: 415, PAUSE: 19, FF: 417, RW: 412, STOP: 413 };
    function api(path) {
      var url = path.indexOf("http") === 0 ? path.split("?")[0] : API + path;
      return fetch(url + "?schema=1&limit=999", { credentials: "include" }).then(function(r) {
        if (r.status === 401 || r.status === 403) {
          throw new Error("signin");
        }
        return r.json();
      });
    }
    function hsz(u) {
      return u ? u + (u.indexOf("?") < 0 ? "?" : "&") + "size=600x338&format=webp" : "";
    }
    function img(item, kind) {
      try {
        var a = item.visuals.artwork[kind || "horizontal_tile"] || item.visuals.artwork.horizontal;
        return hsz(a.image.path);
      } catch (e) {
        return "";
      }
    }
    function title(item) {
      try {
        return item.visuals.headline || item.name || "";
      } catch (e) {
        return item.name || "";
      }
    }
    function eabToId(eab) {
      var m = /^EAB::([0-9a-f-]{36})::/.exec(String(eab || ""));
      return m ? m[1] : null;
    }
    var css = [
      "#tvab-root{position:fixed;inset:0;z-index:2147483646;background:#0b0c0f;color:#fff;font-family:Arial,Helvetica,sans-serif;overflow:hidden}",
      "#tvab-root .hdr{height:90px;display:flex;align-items:center;padding:0 60px;font-size:40px;font-weight:bold;color:#1ce783}",
      "#tvab-root .hdr small{color:#aaa;font-size:24px;margin-left:24px;font-weight:normal}",
      "#tvab-root .rows{position:absolute;top:90px;left:0;right:0;bottom:0;transition:transform .2s}",
      "#tvab-root .row{height:330px;padding-left:60px}",
      "#tvab-root .row h2{font-size:30px;margin:10px 0 12px;color:#ddd;font-weight:bold}",
      "#tvab-root .strip{display:flex;transition:transform .2s;white-space:nowrap}",
      "#tvab-root .tile{flex:0 0 384px;height:216px;margin-right:24px;border-radius:10px;background:#222 center/cover no-repeat;position:relative;box-sizing:border-box;border:5px solid transparent}",
      "#tvab-root .tile.f{border-color:#ffcc00;transform:scale(1.06)}",
      "#tvab-root .tile span{position:absolute;left:0;right:0;bottom:-44px;font-size:24px;color:#eee;overflow:hidden;text-overflow:ellipsis}",
      "#tvab-root .msg{position:absolute;top:40%;width:100%;text-align:center;font-size:36px;color:#ccc}",
      "#tvab-root .btn{display:inline-block;margin-top:30px;padding:18px 40px;border-radius:12px;background:#1ce783;color:#000;font-weight:bold;border:5px solid #ffcc00}"
    ].join("\n");
    function addCss() {
      if (document.getElementById("tvab-ui-css")) {
        return;
      }
      var s = document.createElement("style");
      s.id = "tvab-ui-css";
      s.textContent = css;
      var host = document.head || document.documentElement;
      if (!host) {
        return;
      }
      host.appendChild(s);
    }
    var stack = [];
    var root = null;
    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) {
        e.className = cls;
      }
      if (text != null) {
        e.textContent = text;
      }
      return e;
    }
    function anyArt(art) {
      if (!art) {
        return "";
      }
      var pref = ["video.horizontal.hero", "program.tile", "horizontal_tile", "horizontal"];
      for (var i = 0; i < pref.length; i++) {
        if (art[pref[i]] && art[pref[i]].path) {
          return art[pref[i]].path;
        }
        if (art[pref[i]] && art[pref[i]].image && art[pref[i]].image.path) {
          return art[pref[i]].image.path;
        }
      }
      for (var k in art) {
        var v = art[k];
        if (v && (v.path || v.image && v.image.path)) {
          return v.path || v.image.path;
        }
      }
      return "";
    }
    function toTile(item) {
      if (item._type === "episode" || item._type === "movie") {
        return { label: item.name || "", image: hsz(anyArt(item.artwork) || anyArt(item.series_artwork)), play: item.id, browse: null };
      }
      var a = item.actions || {};
      var playId = a.playback ? eabToId(a.playback.eab) : null;
      var browse = a.browse && a.browse.href && /\/hubs\/(series|movie)\//.test(a.browse.href) ? a.browse.href : null;
      return { label: title(item), image: img(item), play: playId, browse };
    }
    function homeScreen() {
      return api("/view_hubs/home").then(function(j) {
        var rows = (j.components || []).filter(function(c) {
          return c._type === "collection" && c.items && c.items.length;
        }).map(function(c) {
          return { name: c.name, items: c.items.map(toTile).filter(function(t) {
            return t.play || t.browse;
          }) };
        }).filter(function(r) {
          return r.items.length;
        });
        var cw = rows.findIndex(function(r) {
          return /continue watching/i.test(r.name);
        });
        if (cw > 0) {
          rows.unshift(rows.splice(cw, 1)[0]);
        }
        return { title: "Home", rows, r: 0, c: 0 };
      });
    }
    function seriesScreen(href, name) {
      return api(href).then(function(s) {
        var rows = [];
        var eps = (s.components || []).find(function(c) {
          return /episodes/i.test(c.name || "");
        });
        var seasonsP = eps ? api(eps.href) : Promise.resolve(null);
        return seasonsP.then(function(sj) {
          var seasons = sj ? sj.items || [] : [];
          var loads = seasons.map(function(season) {
            var items = season.items && season.items.length ? Promise.resolve(season) : api(season.href);
            return items.then(function(full) {
              rows.push({ name: season.name, items: (full.items || []).map(function(ep) {
                var t = toTile(ep);
                var n = ep.number || ep.entity_metadata && ep.entity_metadata.episode_number;
                t.label = (n ? n + ". " : "") + (ep.name || t.label);
                return t;
              }).filter(function(t) {
                return t.play;
              }) });
            }).catch(function() {
            });
          });
          return Promise.all(loads).then(function() {
            rows.sort(function(a, b) {
              return (parseInt(a.name.replace(/\D/g, ""), 10) || 0) - (parseInt(b.name.replace(/\D/g, ""), 10) || 0);
            });
            (s.components || []).forEach(function(c) {
              if (!/episodes/i.test(c.name || "") && c.items && c.items.length && c.items[0]._type !== "collection") {
                rows.push({ name: c.name, items: c.items.map(toTile).filter(function(t) {
                  return t.play || t.browse;
                }) });
              }
            });
            return { title: name || s.name || "Show", rows: rows.filter(function(r) {
              return r.items.length;
            }), r: 0, c: 0 };
          });
        });
      });
    }
    function render() {
      var scr = stack[stack.length - 1];
      if (!root) {
        root = el("div");
        root.id = "tvab-root";
        (document.body || document.documentElement).appendChild(root);
      }
      root.textContent = "";
      var hdr = el("div", "hdr", "hulu");
      hdr.appendChild(el("small", null, scr.title + "  \xB7  No Ads"));
      root.appendChild(hdr);
      var rowsEl = el("div", "rows");
      root.appendChild(rowsEl);
      scr.rows.forEach(function(row, ri) {
        var rEl = el("div", "row");
        if (ri < scr.r - 2 || ri > scr.r + 4) {
          rowsEl.appendChild(rEl);
          return;
        }
        rEl.appendChild(el("h2", null, row.name));
        var strip = el("div", "strip");
        row.items.forEach(function(t, ci) {
          var tile = el("div", "tile" + (ri === scr.r && ci === scr.c ? " f" : ""));
          var cc = ri === scr.r ? scr.c : row.c || 0;
          if (t.image && ri >= scr.r - 1 && ri <= scr.r + 2 && ci >= cc - 2 && ci <= cc + 6) {
            tile.style.backgroundImage = 'url("' + t.image + '")';
          }
          tile.appendChild(el("span", null, t.label));
          strip.appendChild(tile);
        });
        strip.style.transform = "translateX(" + -Math.max(0, (ri === scr.r ? scr.c : row.c || 0) - 1) * 408 + "px)";
        rEl.appendChild(strip);
        rowsEl.appendChild(rEl);
      });
      rowsEl.style.transform = "translateY(" + -Math.max(0, scr.r) * 330 + "px)";
    }
    function message(text, buttonText) {
      if (!root) {
        root = el("div");
        root.id = "tvab-root";
        (document.body || document.documentElement).appendChild(root);
      }
      root.textContent = "";
      var m = el("div", "msg", text);
      if (buttonText) {
        m.appendChild(el("br"));
        m.appendChild(el("div", "btn", buttonText));
      }
      root.appendChild(m);
    }
    function push(p) {
      message("Loading\u2026");
      return p.then(function(scr) {
        stack.push(scr);
        render();
      }).catch(function(e) {
        if (String(e && e.message) === "signin") {
          signinPrompt();
        } else {
          message("Could not load Hulu. Press OK to retry.");
          retry = function() {
            start();
          };
        }
      });
    }
    var retry = null, signin = false;
    function signinPrompt() {
      signin = true;
      message("Sign in to Hulu once. Press OK, then type your email and password with the TV keyboard.", "Sign in");
    }
    function hideUI() {
      if (root) {
        root.style.display = "none";
      }
    }
    function showUI() {
      if (root) {
        root.style.display = "";
      }
    }
    function onKey(e) {
      var k = e.keyCode;
      if (onWatch()) {
        return playerKey(e);
      }
      if (!root || root.style.display === "none") {
        return;
      }
      if (signin) {
        if (k === KEY.OK) {
          e.preventDefault();
          signin = false;
          hideUI();
          location.href = "https://auth.hulu.com/web/login";
        }
        return;
      }
      if (retry && k === KEY.OK) {
        e.preventDefault();
        var f = retry;
        retry = null;
        f();
        return;
      }
      var scr = stack[stack.length - 1];
      if (!scr) {
        return;
      }
      var row = scr.rows[scr.r];
      var handled = true;
      if (k === KEY.RIGHT) {
        scr.c = Math.min(row.items.length - 1, scr.c + 1);
      } else if (k === KEY.LEFT) {
        scr.c = Math.max(0, scr.c - 1);
      } else if (k === KEY.DOWN) {
        row.c = scr.c;
        scr.r = Math.min(scr.rows.length - 1, scr.r + 1);
        scr.c = Math.min(scr.rows[scr.r].c || 0, scr.rows[scr.r].items.length - 1);
      } else if (k === KEY.UP) {
        row.c = scr.c;
        scr.r = Math.max(0, scr.r - 1);
        scr.c = Math.min(scr.rows[scr.r].c || 0, scr.rows[scr.r].items.length - 1);
      } else if (k === KEY.OK) {
        var t = row.items[scr.c];
        if (t.browse && stack.length === 1 && !/^\d+\./.test(t.label)) {
          push(seriesScreen(t.browse, t.label));
          return stop(e);
        }
        if (t.play) {
          sessionStorage.setItem("tvab-stack", JSON.stringify(stack));
          location.href = "/watch/" + t.play;
          return stop(e);
        }
        if (t.browse) {
          push(seriesScreen(t.browse, t.label));
          return stop(e);
        }
      } else if (k === KEY.BACK) {
        if (stack.length > 1) {
          stack.pop();
          render();
        } else {
          try {
            tizen.application.getCurrentApplication().exit();
          } catch (x) {
          }
        }
      } else {
        handled = false;
      }
      if (handled) {
        stop(e);
        render();
      }
    }
    function stop(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    function video() {
      return document.querySelector("video");
    }
    function playerKey(e) {
      var v = video(), k = e.keyCode;
      if (k === KEY.BACK) {
        stop(e);
        location.href = "/hub/home";
        return;
      }
      if (!v) {
        return;
      }
      if (k === KEY.OK || k === KEY.PLAYPAUSE) {
        stop(e);
        if (v.paused) {
          v.play();
        } else {
          v.pause();
        }
      } else if (k === KEY.PLAY) {
        stop(e);
        v.play();
      } else if (k === KEY.PAUSE || k === KEY.STOP) {
        stop(e);
        v.pause();
      } else if (k === KEY.RIGHT || k === KEY.FF) {
        stop(e);
        v.currentTime = Math.min(v.duration || 1e9, v.currentTime + 10);
      } else if (k === KEY.LEFT || k === KEY.RW) {
        stop(e);
        v.currentTime = Math.max(0, v.currentTime - 10);
      }
    }
    document.addEventListener("keydown", onKey, true);
    function start() {
      addCss();
      if (onWatch()) {
        return;
      }
      if (/auth\.hulu\.com|\/login|\/account/.test(location.href)) {
        return;
      }
      if (/^\/welcome/.test(location.pathname)) {
        signinPrompt();
        return;
      }
      var saved = null;
      try {
        saved = JSON.parse(sessionStorage.getItem("tvab-stack") || "null");
        sessionStorage.removeItem("tvab-stack");
      } catch (x) {
      }
      if (saved && saved.length) {
        stack = saved;
        render();
        return;
      }
      stack = [];
      push(homeScreen());
    }
    if (document.readyState === "loading" || !document.body) {
      document.addEventListener("DOMContentLoaded", function() {
        try {
          start();
        } catch (e) {
        }
      });
    } else {
      try {
        start();
      } catch (e) {
      }
    }
  })();
} catch (e) {
}
try {
  window.__tvabFocus && window.__tvabFocus("input[type=password], input[type=email], input[name*=email i], input[autocomplete=username], input[autocomplete=email]");
} catch (e) {
}
