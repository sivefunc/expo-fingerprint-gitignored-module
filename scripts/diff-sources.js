// Prints the sources whose hash differs between two `fingerprint:generate --debug` outputs.
const [a, b] = process.argv.slice(2).map((f) => require(require('path').resolve(f)));
const key = (s) => `${s.type}:${s.filePath ?? s.id ?? s.name}`;
const map = (fp) => new Map(fp.sources.map((s) => [key(s), s]));
const ma = map(a), mb = map(b);
console.log(`hash: ${a.hash} -> ${b.hash}`);
for (const k of new Set([...ma.keys(), ...mb.keys()])) {
  const sa = ma.get(k), sb = mb.get(k);
  if ((sa?.hash ?? null) === (sb?.hash ?? null)) continue;
  console.log(`changed source ${k} (${(sa ?? sb).reasons.join(',')}): ${sa?.hash ?? 'absent'} -> ${sb?.hash ?? 'absent'}`);
  const files = (s) => { const out = new Map(); const walk = (d) => { if (!d) return; if (d.children) d.children.forEach(walk); else if (d.path) out.set(d.path, d.hash); }; walk(s?.debugInfo); return out; };
  const fa = files(sa), fb = files(sb);
  for (const p of new Set([...fa.keys(), ...fb.keys()])) if (fa.get(p) !== fb.get(p)) console.log(`  file ${p}: ${fa.get(p) ?? 'absent'} -> ${fb.get(p) ?? 'absent'}`);
}
