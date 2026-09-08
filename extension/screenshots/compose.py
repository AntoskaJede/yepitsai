"""Compose Chrome Web Store images from raw captures.
usage: python3 compose.py <in_dir> <out_dir>
Store screenshots: 1280x800. Layout mimics Chrome with the side panel open:
YouTube page (880x800) on the left, side panel (400x800) on the right.
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

IN, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
INK, CLAY, CREAM, BORDER = (26, 26, 26), (255, 79, 0), (250, 246, 240), (232, 224, 212)

def load(name):
    return Image.open(os.path.join(IN, name)).convert('RGB')

def side_by_side(page, panel, out):
    canvas = Image.new('RGB', (1280, 800), 'white')
    canvas.paste(page.resize((880, 800)) if page.size != (880, 800) else page, (0, 0))
    canvas.paste(panel.resize((400, 800)) if panel.size != (400, 800) else panel, (880, 0))
    d = ImageDraw.Draw(canvas)
    d.line([(880, 0), (880, 800)], fill=BORDER, width=2)
    canvas.save(os.path.join(OUT, out), optimize=True)
    print('wrote', out)

page = load('yt.png')
shots = [
    ('panel-result.png', '01-summary.png'),
    ('panel-result-scrolled.png', '02-takeaways.png'),
    ('panel-ready.png', '03-ready.png'),
    ('panel-loading.png', '04-loading.png'),
    ('panel-limit.png', '05-limit.png'),
]
for src, dst in shots:
    if os.path.exists(os.path.join(IN, src)):
        side_by_side(page, load(src), dst)

# Promo tile 440x280: logo mark + name + tagline, brand style.
def font(size, bold=True):
    for f in (['/System/Library/Fonts/Supplemental/Arial Black.ttf'] if bold else []) + ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        try: return ImageFont.truetype(f, size)
        except Exception: pass
    return ImageFont.load_default()

tile = Image.new('RGB', (440, 280), CREAM)
d = ImageDraw.Draw(tile)
# logo mark with offset ink shadow
d.rounded_rectangle([44, 66, 124, 146], radius=20, fill=INK)
d.rounded_rectangle([38, 60, 118, 140], radius=20, fill=CLAY, outline=INK, width=3)
f = font(50); w = d.textlength('Y', font=f); d.text((78 - w / 2, 70), 'Y', font=f, fill='white')
d.text((144, 64), 'YepIts.ai', font=font(38), fill=INK)
d.text((146, 112), 'Turn any video into', font=font(21, bold=False), fill=INK)
d.text((146, 138), 'a 2-minute read.', font=font(21, bold=False), fill=INK)
# pill
pill = 'Summaries and timestamps, right on YouTube'
pf = font(15, bold=False); pw = d.textlength(pill, font=pf)
x0 = int((440 - (pw + 40)) / 2)
d.rounded_rectangle([x0, 196, x0 + pw + 40, 238], radius=14, fill='white', outline=INK, width=3)
d.text((x0 + 20, 206), pill, font=pf, fill=INK)
tile.save(os.path.join(OUT, 'promo-440x280.png'), optimize=True)
print('wrote promo-440x280.png')
