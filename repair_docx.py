import shutil
import sys
import zipfile
from pathlib import Path


def repair(src: Path, dst: Path) -> None:
    """Normalize relationship targets that use Windows separators."""
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.endswith(".rels"):
                data = data.replace(b"\\", b"/")
            zout.writestr(item, data)


if __name__ == "__main__":
    source = Path(sys.argv[1])
    target = Path(sys.argv[2])
    repair(source, target)
