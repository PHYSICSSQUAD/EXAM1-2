"""Rebuild the standalone single file exam from the deployed folder.
Usage: python3 source/build.py   (run from the final-exam folder or anywhere)"""
import base64, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
a = root / 'assets'
h = (root / 'index.html').read_text()
css = (a / 'exam.css').read_text()
cfg = (a / 'config.js').read_text()
b64 = base64.b64encode((a / 'img' / 'logo.png').read_bytes()).decode()
cfg = re.sub(r'logo:\s*"[^"]*"', 'logo: "data:image/png;base64,%s"' % b64, cfg)
h = h.replace('<link rel="stylesheet" href="assets/exam.css">', '<style>\n%s\n</style>' % css)
h = h.replace('<script src="assets/config.js"></script>', '<script>\n%s\n</script>' % cfg)
h = h.replace('<script src="assets/data.js"></script>', '<script>\n%s\n</script>' % (a / 'data.js').read_text())
h = h.replace('<script src="assets/exam.js"></script>', '<script>\n%s\n</script>' % (a / 'exam.js').read_text())
out = root / 'Comprehensive-Final-Exam-standalone.html'
out.write_text(h)
print(out, out.stat().st_size // 1024, 'KB')
