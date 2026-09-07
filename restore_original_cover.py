import copy
import sys
import zipfile
from pathlib import Path

from lxml import etree

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def has_section_break(element):
    return element.tag == W + "p" and element.find(".//" + W + "sectPr") is not None


def restore_cover(original: Path, formatted: Path, output: Path) -> None:
    with zipfile.ZipFile(original) as original_zip, zipfile.ZipFile(formatted) as formatted_zip:
        source_xml = etree.fromstring(original_zip.read("word/document.xml"))
        target_xml = etree.fromstring(formatted_zip.read("word/document.xml"))
        source_body = source_xml.find(W + "body")
        target_body = target_xml.find(W + "body")
        source_children = list(source_body)
        target_children = list(target_body)
        end_index = next(i for i, child in enumerate(source_children) if has_section_break(child))
        for i in range(end_index + 1):
            target_body.replace(target_children[i], copy.deepcopy(source_children[i]))
        new_document = etree.tostring(target_xml, xml_declaration=True, encoding="UTF-8", standalone=True)

        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as output_zip:
            for item in formatted_zip.infolist():
                data = formatted_zip.read(item.filename)
                if item.filename == "word/document.xml":
                    data = new_document
                output_zip.writestr(item, data)


if __name__ == "__main__":
    restore_cover(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
