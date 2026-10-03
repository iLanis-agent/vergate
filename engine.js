(function (root) {
  var VRE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  function parse(s) {
    if (typeof s !== 'string') return null;
    var m = VRE.exec(s.trim().replace(/^v/, ''));
    if (!m) return null;
    return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : [], build: m[5] || '' };
  }
  function str(v) { return v.major + '.' + v.minor + '.' + v.patch + (v.pre.length ? '-' + v.pre.join('.') : ''); }
  function cmpId(a, b) {
    var na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return +a < +b ? -1 : +a > +b ? 1 : 0;
    if (na) return -1; if (nb) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  // SemVer 2.0.0 precedence; build metadata ignored
  function compare(a, b) {
    var k = ['major', 'minor', 'patch'];
    for (var i = 0; i < 3; i++) if (a[k[i]] !== b[k[i]]) return a[k[i]] < b[k[i]] ? -1 : 1;
    if (!a.pre.length && !b.pre.length) return 0;
    if (!a.pre.length) return 1; if (!b.pre.length) return -1;
    for (var j = 0; j < Math.max(a.pre.length, b.pre.length); j++) {
      if (a.pre[j] === undefined) return -1; if (b.pre[j] === undefined) return 1;
      var c = cmpId(a.pre[j], b.pre[j]); if (c) return c;
    }
    return 0;
  }
  var XR = '(0|[1-9]\\d*|[xX*])', PRE = '(?:-([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?', BLD = '(?:\\+[0-9a-zA-Z.-]+)?';
  var PART = new RegExp('^[=v]*' + XR + '(?:\\.' + XR + '(?:\\.' + XR + PRE + BLD + ')?)?$');
  function isX(x) { return x === undefined || x === 'x' || x === 'X' || x === '*'; }
  function V(M, m, p, pre) { return { major: M, minor: m, patch: p, pre: pre || [], build: '' }; }
  function partial(t) {
    var m = PART.exec(t);
    if (!m) return null;
    return { M: m[1], m: m[2], p: m[3], pre: m[4] ? m[4].split('.') : [] };
  }
  // comparator = [op, version]; desugar one token
  function caret(t) {
    var p = partial(t); if (!p) return null;
    if (isX(p.M)) return [];
    var M = +p.M;
    if (isX(p.m)) return [['>=', V(M, 0, 0)], ['<', V(M + 1, 0, 0, ['0'])]];
    var m = +p.m;
    if (isX(p.p)) return M === 0 ? [['>=', V(0, m, 0)], ['<', V(0, m + 1, 0, ['0'])]] : [['>=', V(M, m, 0)], ['<', V(M + 1, 0, 0, ['0'])]];
    var pa = +p.p, lo = V(M, m, pa, p.pre), hi;
    if (M > 0) hi = V(M + 1, 0, 0, ['0']); else if (m > 0) hi = V(0, m + 1, 0, ['0']); else hi = V(0, 0, pa + 1, ['0']);
    return [['>=', lo], ['<', hi]];
  }
  function tilde(t) {
    var p = partial(t); if (!p) return null;
    if (isX(p.M)) return [];
    var M = +p.M;
    if (isX(p.m)) return [['>=', V(M, 0, 0)], ['<', V(M + 1, 0, 0, ['0'])]];
    var m = +p.m;
    if (isX(p.p)) return [['>=', V(M, m, 0)], ['<', V(M, m + 1, 0, ['0'])]];
    return [['>=', V(M, m, +p.p, p.pre)], ['<', V(M, m + 1, 0, ['0'])]];
  }
  function plain(op, t) {
    var p = partial(t); if (!p) return null;
    if (isX(p.M)) return (op === '<' || op === '>') ? [['<', V(0, 0, 0, ['0'])]] : [];
    var M = +p.M;
    if (isX(p.m)) {
      if (op === '' || op === '=') return [['>=', V(M, 0, 0)], ['<', V(M + 1, 0, 0, ['0'])]];
      if (op === '>') return [['>=', V(M + 1, 0, 0)]]; if (op === '<=') return [['<', V(M + 1, 0, 0, ['0'])]];
      if (op === '>=') return [['>=', V(M, 0, 0)]]; return [['<', V(M, 0, 0, ['0'])]];
    }
    var m = +p.m;
    if (isX(p.p)) {
      if (op === '' || op === '=') return [['>=', V(M, m, 0)], ['<', V(M, m + 1, 0, ['0'])]];
      if (op === '>') return [['>=', V(M, m + 1, 0)]]; if (op === '<=') return [['<', V(M, m + 1, 0, ['0'])]];
      if (op === '>=') return [['>=', V(M, m, 0)]]; return [['<', V(M, m, 0, ['0'])]];
    }
    var v = V(M, m, +p.p, p.pre);
    return [[op === '' ? '=' : op, v]];
  }
  function hyphen(a, b) {
    var pa = partial(a), pb = partial(b); if (!pa || !pb) return null;
    var out = [];
    if (!isX(pa.M)) out.push(['>=', V(+pa.M, isX(pa.m) ? 0 : +pa.m, isX(pa.p) ? 0 : +pa.p, pa.pre)]);
    if (!isX(pb.M)) {
      if (isX(pb.m)) out.push(['<', V(+pb.M + 1, 0, 0, ['0'])]);
      else if (isX(pb.p)) out.push(['<', V(+pb.M, +pb.m + 1, 0, ['0'])]);
      else out.push(['<=', V(+pb.M, +pb.m, +pb.p, pb.pre)]);
    }
    return out;
  }
  // returns {sets:[[comparators]]} or {error}
  function parseRange(r) {
    if (typeof r !== 'string') return { error: 'Enter a range.' };
    var alts = r.split('||'), sets = [];
    for (var i = 0; i < alts.length; i++) {
      var s = alts[i].trim().replace(/\s+/g, ' ');
      s = s.replace(/([<>=~^]+)\s+/g, '$1');
      var set = [], hy = /^(\S+) - (\S+)$/.exec(s);
      if (hy) { var h = hyphen(hy[1], hy[2]); if (!h) return { error: 'Cannot read "' + s + '".' }; set = h; }
      else if (s !== '') {
        var toks = s.split(' ');
        for (var j = 0; j < toks.length; j++) {
          var t = toks[j], m = /^(\^|~>|~|>=|<=|>|<|=)?(.*)$/.exec(t), res;
          if (m[1] === '^') res = caret(m[2]); else if (m[1] === '~' || m[1] === '~>') res = tilde(m[2]); else res = plain(m[1] || '', m[2]);
          if (!res) return { error: 'Cannot read "' + t + '". Use forms like ^1.2.3, ~1.2, 1.x, >=1.0.0 <2.0.0 or 1.2 - 1.4.' };
          set = set.concat(res);
        }
      }
      sets.push(set);
    }
    return { sets: sets };
  }
  function test(c, v) {
    var k = compare(v, c[1]);
    switch (c[0]) { case '>=': return k >= 0; case '>': return k > 0; case '<=': return k <= 0; case '<': return k < 0; default: return k === 0; }
  }
  // npm rule: a prerelease version only matches a set if some comparator in that set has a prerelease on the same major.minor.patch
  function satisfies(vs, range, includePre) {
    var v = typeof vs === 'string' ? parse(vs) : vs; if (!v) return { error: 'Not a valid version: ' + vs };
    var pr = typeof range === 'string' ? parseRange(range) : range; if (pr.error) return pr;
    for (var i = 0; i < pr.sets.length; i++) {
      var set = pr.sets[i], ok = true;
      for (var j = 0; j < set.length; j++) if (!test(set[j], v)) { ok = false; break; }
      if (!ok) continue;
      if (v.pre.length && !includePre) {
        var allowed = false;
        for (var k = 0; k < set.length; k++) { var cv = set[k][1]; if (cv.pre.length && cv.major === v.major && cv.minor === v.minor && cv.patch === v.patch) allowed = true; }
        if (!allowed) continue;
      }
      return { ok: true };
    }
    return { ok: false };
  }
  function bump(v, kind) {
    if (kind === 'major') return V(v.major + 1, 0, 0); if (kind === 'minor') return V(v.major, v.minor + 1, 0); return V(v.major, v.minor, v.patch + 1);
  }
  function explain(range) {
    var pr = parseRange(range); if (pr.error) return pr;
    return pr.sets.map(function (s) { return s.length ? s.map(function (c) { return c[0] + str(c[1]); }).join(' ') : '*'; });
  }
  var api = { parse: parse, str: str, compare: compare, parseRange: parseRange, satisfies: satisfies, explain: explain, bump: bump };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VerGate = api;
})(typeof window !== 'undefined' ? window : this);
