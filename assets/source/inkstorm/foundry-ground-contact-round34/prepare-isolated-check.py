from pathlib import Path
import shutil
ROOT=Path('/Users/amir/Projects/PodRacing'); OUT=Path(__file__).resolve().parent; ISO=OUT/'isolated-check'
ISO.mkdir(exist_ok=True)
for folder in ['src','tests']:
 for p in (ROOT/folder).rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(ROOT); dest=ISO/rel; override=OUT/'candidate'/rel
  dest.parent.mkdir(parents=True,exist_ok=True)
  if dest.is_symlink() or dest.exists():dest.unlink()
  if override.exists():shutil.copyfile(override,dest)
  else:dest.symlink_to(p)
for p in (OUT/'candidate').rglob('*'):
 if p.is_file():
  dest=ISO/p.relative_to(OUT/'candidate');dest.parent.mkdir(parents=True,exist_ok=True)
  if dest.is_symlink() or dest.exists():dest.unlink()
  shutil.copyfile(p,dest)
for name in ['package.json','tsconfig.json','vitest.config.ts','vite.config.ts']:
 dest=ISO/name
 if dest.is_symlink() or dest.exists():dest.unlink()
 shutil.copyfile(ROOT/name,dest)
for name in ['node_modules','scripts','assets']:
 dest=ISO/name
 if not dest.exists():dest.symlink_to(ROOT/name,target_is_directory=True)
print(ISO)
