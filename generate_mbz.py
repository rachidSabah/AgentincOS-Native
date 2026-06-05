import os
import hashlib
import tarfile
import time
import xml.etree.ElementTree as ET
import shutil

def get_file_hash(filepath):
    sha1 = hashlib.sha1()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            sha1.update(chunk)
    return sha1.hexdigest()

def write_xml(root, path):
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ", level=0)
    with open(path, "wb") as f:
        f.write(b'<?xml version="1.0" encoding="UTF-8"?>\n')
        tree.write(f, encoding="UTF-8", xml_declaration=False)

def create_moodle_backup_xml(backup_dir, sections, activities):
    root = ET.Element("moodle_backup")
    info = ET.SubElement(root, "information")
    ET.SubElement(info, "name").text = "GMT_INFOHAS_FINAL.mbz"
    ET.SubElement(info, "moodle_version").text = "2022112800"
    ET.SubElement(info, "moodle_release").text = "4.1"
    ET.SubElement(info, "backup_version").text = "2022112800"
    ET.SubElement(info, "backup_release").text = "4.1"
    ET.SubElement(info, "backup_date").text = str(int(time.time()))
    ET.SubElement(info, "moodle_backup_xml_file").text = "moodle_backup.xml"
    ET.SubElement(info, "type").text = "course"
    ET.SubElement(info, "format").text = "moodle2"
    ET.SubElement(info, "interactive").text = "1"
    ET.SubElement(info, "mode").text = "10"
    ET.SubElement(info, "execution").text = "1"
    ET.SubElement(info, "executiontime").text = "0"
    
    ET.SubElement(info, "original_course_id").text = "1"
    ET.SubElement(info, "original_course_fullname").text = "Group Medical Training (GMT)"
    ET.SubElement(info, "original_course_shortname").text = "GMT"
    ET.SubElement(info, "original_course_contextid").text = "10"
    ET.SubElement(info, "original_system_contextid").text = "1"

    details = ET.SubElement(info, "details")
    detail = ET.SubElement(details, "detail", backup_id="gmt_final_001")
    ET.SubElement(detail, "type").text = "course"
    ET.SubElement(detail, "format").text = "moodle2"
    ET.SubElement(detail, "interactive").text = "1"
    ET.SubElement(detail, "mode").text = "10"
    ET.SubElement(detail, "execution").text = "1"
    ET.SubElement(detail, "executiontime").text = "0"

    contents = ET.SubElement(info, "contents")
    course = ET.SubElement(contents, "course")
    ET.SubElement(course, "courseid").text = "1"
    ET.SubElement(course, "contextid").text = "10"
    ET.SubElement(course, "title").text = "Group Medical Training (GMT)"
    ET.SubElement(course, "directory").text = "course"
    
    sections_el = ET.SubElement(contents, "sections")
    for sec in sections:
        section = ET.SubElement(sections_el, "section")
        ET.SubElement(section, "sectionid").text = str(sec['id'])
        ET.SubElement(section, "title").text = sec['title']
        ET.SubElement(section, "directory").text = f"sections/section_{sec['id']}"
        
    activities_el = ET.SubElement(contents, "activities")
    for act in activities:
        activity = ET.SubElement(activities_el, "activity")
        ET.SubElement(activity, "moduleid").text = str(act['id'])
        ET.SubElement(activity, "sectionid").text = str(act['sectionid'])
        ET.SubElement(activity, "contextid").text = str(act['contextid'])
        ET.SubElement(activity, "modulename").text = act['type']
        ET.SubElement(activity, "title").text = act['title']
        ET.SubElement(activity, "directory").text = f"activities/{act['type']}_{act['id']}"

    settings = ET.SubElement(info, "settings")
    for s_name, s_val in [("filename", "GMT_INFOHAS_FINAL.mbz"), ("users", "0"), ("activities", "1")]:
        s = ET.SubElement(settings, "setting")
        ET.SubElement(s, "level").text = "root"
        ET.SubElement(s, "name").text = s_name
        ET.SubElement(s, "value").text = s_val

    write_xml(root, os.path.join(backup_dir, "moodle_backup.xml"))

def main():
    backup_dir = "moodle_final_source"
    if os.path.exists(backup_dir): shutil.rmtree(backup_dir)
    os.makedirs(backup_dir)
    os.makedirs(os.path.join(backup_dir, "course"))
    os.makedirs(os.path.join(backup_dir, "sections"))
    os.makedirs(os.path.join(backup_dir, "activities"))
    os.makedirs(os.path.join(backup_dir, "files"))

    sections = [
        {'id': 1, 'title': 'Welcome', 'summary': 'Orientation.'},
        {'id': 2, 'title': 'GMT Modules', 'summary': 'Medical Training Content.'}
    ]
    activities = [
        {'id': 1, 'sectionid': 1, 'contextid': 100, 'type': 'label', 'title': 'Header'},
        {'id': 2, 'sectionid': 2, 'contextid': 101, 'type': 'page', 'title': 'BLS Procedures'}
    ]

    create_moodle_backup_xml(backup_dir, sections, activities)
    
    # Root Files
    for rf in ["roles", "groups", "outcomes", "questions", "scales", "competencies", "gradebook", "files"]:
        write_xml(ET.Element(rf), os.path.join(backup_dir, f"{rf}.xml"))

    # Course Folder
    cp = os.path.join(backup_dir, "course")
    cr = ET.Element("course", id="1", contextid="10")
    ET.SubElement(cr, "fullname").text = "Group Medical Training (GMT)"
    ET.SubElement(cr, "shortname").text = "GMT"
    ET.SubElement(cr, "format").text = "topics"
    write_xml(cr, os.path.join(cp, "course.xml"))
    for cf in ["enrolments", "roles", "legacyfiles", "completion"]:
        write_xml(ET.Element(cf), os.path.join(cp, f"{cf}.xml"))

    # Sections
    for sec in sections:
        sp = os.path.join(backup_dir, "sections", f"section_{sec['id']}")
        os.makedirs(sp, exist_ok=True)
        sr = ET.Element("section", id=str(sec['id']))
        ET.SubElement(sr, "number").text = str(sec['id'])
        ET.SubElement(sr, "name").text = sec['title']
        ET.SubElement(sr, "summary").text = sec['summary']
        write_xml(sr, os.path.join(sp, "section.xml"))

    # Activity 1: Label
    ap1 = os.path.join(backup_dir, "activities", "label_1")
    os.makedirs(ap1, exist_ok=True)
    write_xml(ET.Element("module", id="1", contextid="100"), os.path.join(ap1, "module.xml"))
    la = ET.Element("label", id="1")
    ET.SubElement(la, "intro").text = "<h1>INFOHAS GMT Course</h1>"
    write_xml(la, os.path.join(ap1, "label.xml"))
    write_xml(ET.Element("inforef"), os.path.join(ap1, "inforef.xml"))
    write_xml(ET.Element("grades"), os.path.join(ap1, "grades.xml"))

    # Activity 2: Page
    ap2 = os.path.join(backup_dir, "activities", "page_2")
    os.makedirs(ap2, exist_ok=True)
    write_xml(ET.Element("module", id="2", contextid="101"), os.path.join(ap2, "module.xml"))
    pa = ET.Element("page", id="2")
    ET.SubElement(pa, "name").text = "BLS Procedures"
    ET.SubElement(pa, "content").text = "Detailed CPR and AED steps..." * 200
    write_xml(pa, os.path.join(ap2, "page.xml"))
    write_xml(ET.Element("inforef"), os.path.join(ap2, "inforef.xml"))
    write_xml(ET.Element("grades"), os.path.join(ap2, "grades.xml"))

    # Final Package
    out = "GMT_INFOHAS_FINAL_CONTEXT.mbz"
    with tarfile.open(out, "w:gz") as tar:
        for item in os.listdir(backup_dir):
            tar.add(os.path.join(backup_dir, item), arcname=item)
    print(f"Final course with context IDs: {out}")

if __name__ == "__main__":
    main()
