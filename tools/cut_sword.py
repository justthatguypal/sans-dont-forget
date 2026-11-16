"""Cut the sword sheet into per-frame PNGs.

Frames in a group share one canvas size, and each frame's art keeps the place it
had on the sheet, so drawing frame N+1 at the same anchor continues frame N's
motion instead of snapping the sword back to the middle.
"""
from PIL import Image
import os

SRC = r'C:\Users\deboe\Downloads\de1f1eac-a860-4e19-a8a7-f4d32cb1b2fc.png'
OUT = 'assets/sprites'

# name: (y0, y1, [(x0, x1), ...], centre)
# centre=True: each frame is cropped and re-centred in a shared canvas, which is
# what a held sword needs. centre=False: frames keep their sheet position, which
# is what a swing needs (the arc has to travel across the canvas).
GROUPS = {
    'sword_idle':  (33, 212, [(43, 133), (158, 247), (274, 361), (391, 479), (504, 594), (619, 708)], True),
    'sword_equip': (13, 227, [(933, 1018), (1064, 1163), (1180, 1298), (1339, 1468)], True),
    'sword_slash': (278, 450, [(29, 101), (132, 202), (232, 338), (358, 473), (475, 604), (595, 745), (720, 880)], False),
    'sword_heavy': (273, 464, [(917, 1026), (1037, 1209), (1175, 1355), (1355, 1522)], False),
}

sheet = Image.open(SRC).convert('RGBA')
made = []
for name, (y0, y1, xs, centre) in GROUPS.items():
    x0 = min(a for a, _ in xs)
    x1 = max(b for _, b in xs)
    if centre:
        # shared canvas: the largest frame in the group
        w = max(b - a for a, b in xs)
        h = y1 - y0
        # trim transparent rows so a hovering sword is not padded
        band = sheet.crop((x0, y0, x1, y1))
        rows = [y for y in range(band.height) if band.crop((0, y, band.width, y + 1)).getbbox()]
        top, bottom = (min(rows), max(rows) + 1) if rows else (0, band.height)
        py0, py1 = y0 + top, y0 + bottom
        h = py1 - py0
    else:
        w, h = x1 - x0, y1 - y0
        py0, py1 = y0, y1
    for i, (fx0, fx1) in enumerate(xs):
        piece = sheet.crop((fx0, py0, fx1, py1))
        cell = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        if centre:
            cell.alpha_composite(piece, ((w - piece.width) // 2, (h - piece.height) // 2))
        else:
            cell.alpha_composite(piece, (fx0 - x0, 0))
        path = os.path.join(OUT, '%s_%d.png' % (name, i))
        cell.save(path)
        made.append((path, w, h))
    print(name, len(xs), 'frames', w, 'x', h)

# contact sheet of everything, one row per group, to eyeball the cuts
rows = {}
for path, w, h in made:
    key = os.path.basename(path).rsplit('_', 1)[0]
    rows.setdefault(key, []).append((path, w, h))
scale = 0.5
sheet_w = max(int(sum(w for _, w, _ in fr) * scale) + 20 for fr in rows.values())
sheet_h = int(sum(h for _, _, h in next(iter(rows.values())) for _ in [0]) * scale * len(rows)) + 20 * len(rows)
preview = Image.new('RGBA', (max(sheet_w, 600), sheet_h), (18, 18, 22, 255))
y = 4
for key, frames in rows.items():
    x = 4
    for path, w, h in frames:
        im = Image.open(path)
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        preview.alpha_composite(im, (x, y))
        x += im.width + 6
    y += int(frames[0][2] * scale) + 16
preview.save('tools/sword_frames.png')
print('preview', preview.size)
