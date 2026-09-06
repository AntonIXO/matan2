"""Build the Typst source and extract page locations from its layout."""
import hashlib, json, pathlib, re, shutil, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[2]
WEB = ROOT / 'web'
public = WEB / 'public'
generated = WEB / 'src/generated'
public.mkdir(exist_ok=True)
generated.mkdir(parents=True, exist_ok=True)
source = (ROOT / 'main.typ').read_text()
extra = '''
#context [#metadata(query(heading.where(level: 3)).filter(h => h.has("label")).map(h => (
  id: str(h.label), page: h.location().page(),
  number: counter(heading).at(h.location()).map(str).join("."),
))) <web-index>]
'''
subprocess.run(['typst', 'compile', '--root', str(ROOT), str(ROOT/'main.typ'), str(ROOT/'main.pdf')], check=True)
shutil.copy2(ROOT/'main.pdf', public/'notes.pdf')
result = subprocess.run(['typst', 'query', '--root', str(ROOT), '-', '<web-index>', '--field', 'value', '--one'], input=source+extra, text=True, capture_output=True, cwd=ROOT, check=True)
items = json.loads(result.stdout)
titles = {}
chunks = []
for path in sorted((ROOT/'chapters').glob('*.typ')):
    content = path.read_text(); chunks.append(content)
    for title, label in re.findall(r'^=== (.*?) <([a-z0-9-]+)>', content, re.M): titles[label]=title.replace('$', '').strip()
mandatory = set(re.findall(r'<([a-z0-9-]+)>', (ROOT/'lib.typ').read_text().split('#let obyaz = (',1)[1].split('\n)',1)[0]))
index = {}
for item in items:
    key = item['id'].strip('<>')
    if key in titles: index[key] = {**item, 'id':key, 'title':titles[key], 'mandatory':key in mandatory}
digest = hashlib.sha256((source+(ROOT/'lib.typ').read_text()+(ROOT/'web-scenes.json').read_text()+''.join(chunks)).encode()).hexdigest()
(generated/'notes.json').write_text(json.dumps({'revision':digest, 'tickets':index},ensure_ascii=False,indent=2)+'\n')
blender = public/'blender'; blender.mkdir(exist_ok=True)
for path in (ROOT/'visuals/block3').iterdir():
    if path.suffix in {'.blend','.png'} or path.name in {'README.md','LIVE.md','build_live.py','build_scenes.py','live_controls.py','live_validation.json'}:
        shutil.copy2(path,blender/path.name)
print(f'Synced {len(index)} tickets, PDF and Blender sources; revision {digest[:12]}')
