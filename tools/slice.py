import os, json
import numpy as np
from PIL import Image

SRC = r"C:/Users/deboe/Downloads/PC _ Computer - Undertale - Enemies & Bosses - Sans.png"
OUT = "assets/sprites"
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
a = np.array(im)
BG1 = np.array([138, 90, 157]); BG2 = np.array([195, 134, 255])

# name, y, frame_h, frame_w, count, x_start, stride
ROWS = [
    ("handdown", 198, 73, 64, 5, 5, 69),
    ("handup",   294, 73, 64, 6, 5, 69),
    ("strike",   390, 55, 97, 6, 5, 102),
    ("face",     468, 28, 30, 11, 5, 35),
    ("faceboss", 519, 32, 32, 15, 5, 37),
    ("blaster",  861, 57, 43, 6, 5, 48),
    ("torso",     23, 35, 72, 8, 5, 77),
]
manifest = {}

def cut(x0, y0, x1, y1):
    crop = a[y0:y1, x0:x1].copy()
    rgb = crop[:, :, :3].astype(int)
    bgmask = (np.abs(rgb - BG1).sum(axis=2) <= 30) | (np.abs(rgb - BG2).sum(axis=2) <= 30)
    crop[bgmask, 0:3] = 255
    crop[:, :, 3] = np.where(bgmask, 0, 255)
    return crop

for name, y, h, w, count, xs, stride in ROWS:
    for i in range(count):
        x0 = xs + i * stride
        Image.fromarray(cut(x0, y, x0 + w, y + h)).save(f"{OUT}/{name}_{i}.png")

SINGLES = {
    "legs": (5, 81, 49, 104), "legs_bent": (54, 81, 106, 98), "body": (5, 127, 59, 175),
    "face_wide_0": (5, 556, 39, 588), "face_wide_1": (44, 556, 78, 588),
    "wrapped_body_0": (5, 648, 88, 696), "wrapped_body_1": (93, 648, 176, 696),
    "wrapped_face_0": (5, 719, 35, 747), "wrapped_face_1": (40, 719, 70, 747),
    "shock": (5, 770, 31, 799), "blaster_unused": (5, 941, 48, 998),
}
for k, r in SINGLES.items():
    Image.fromarray(cut(*r)).save(f"{OUT}/{k}.png")
for i in range(4):
    x0 = 5 + i * 21
    Image.fromarray(cut(x0, 822, x0 + 16, 838)).save(f"{OUT}/spark_{i}.png")

# --- head-hole detection so faces can be pasted exactly onto bodies ---
from scipy import ndimage
head = {}
for name, y, h, w, count, xs, stride in ROWS:
    if name not in ("handdown", "handup", "strike"):
        continue
    for i in range(count):
        x0 = xs + i * stride
        img = Image.open(f"{OUT}/{name}_{i}.png")
        arr = np.array(img)
        alpha = arr[:, :, 3] > 0
        white = (arr[:, :, 0] > 200) & alpha
        holes, nh = ndimage.label(~white)
        best = None
        for lab in range(1, nh + 1):
            ys, xs_ = np.where(holes == lab)
            if len(ys) < 40:
                continue
            if ys.min() <= 1 or ys.max() >= h - 2 or xs_.min() <= 1 or xs_.max() >= w - 2:
                continue  # touches frame edge -> not enclosed
            if ys.mean() > h * 0.55:
                continue  # must be in the head half
            bw = xs_.max() - xs_.min(); bh = ys.max() - ys.min()
            if bw < 8 or bh < 8 or bw > 34 or bh > 34:
                continue
            score = bw * bh
            if best is None or score > best[0]:
                best = (score, int(xs_.min()), int(ys.min()), int(bw), int(bh))
        if best:
            head[f"{name}_{i}"] = best[1:]
print(json.dumps(head, indent=0))

with open(f"{OUT}/heads.json", "w") as f:
    json.dump(head, f)
