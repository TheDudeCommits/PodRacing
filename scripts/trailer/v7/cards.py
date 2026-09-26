"""Title and end cards for the Thrustline showreel (Orbitron, OFL)."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
root = 'output/trailer-v7'
os.makedirs(root, exist_ok=True)
FONT = 'public/fonts/liquid-chrome/Orbitron-Variable.ttf'
W, H = 1920, 1080

def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_axes([weight])
    except Exception: pass
    return f

def spaced(draw, xy, text, fnt, spacing, fill, anchor_center=True):
    widths = [draw.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x, y = xy
    if anchor_center: x -= total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=fnt, fill=fill, anchor='lm')
        x += w + spacing
    return total

def card(name, lines, background=None, glow=(255, 150, 60)):
    base = Image.new('RGB', (W, H), (6, 5, 8))
    if background:
        bg = Image.open(background).convert('RGB').resize((W, H)).filter(ImageFilter.GaussianBlur(18))
        base = Image.blend(bg, Image.new('RGB', (W, H), (6, 5, 8)), .78)
    text = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(text)
    for (y, t, size, weight, spacing, colour) in lines:
        spaced(d, (W / 2, y), t, font(size, weight), spacing, colour)
    halo = text.filter(ImageFilter.GaussianBlur(22))
    tint = Image.new('RGBA', (W, H), glow + (0,))
    tint.putalpha(halo.getchannel('A').point(lambda a: int(a * .9)))
    out = base.convert('RGBA')
    out.alpha_composite(tint)
    out.alpha_composite(text)
    out.convert('RGB').save(f'{root}/{name}.png')

amber, soft = (255, 214, 150, 255), (230, 214, 190, 235)
card('card-open', [
    (500, 'THRUSTLINE', 150, 900, 34, amber),
    (620, 'TETHER RACING AT THE EDGE OF THE WORLD', 30, 500, 10, soft),
])
card('card-end', [
    (430, 'THRUSTLINE', 150, 900, 34, amber),
    (560, 'EIGHT ORIGINAL RACERS  /  FOUR WORLDS  /  HOLD THE LINE', 30, 500, 8, soft),
    (900, 'IN-ENGINE FOOTAGE, WEBGL, REAL-TIME RENDERER', 20, 500, 5, (200, 190, 175, 200)),
    (940, 'MUSIC: “JUGGERNAUT” BY SCOTT BUCKLEY, CC BY 4.0', 20, 500, 5, (200, 190, 175, 200)),
], background='output/dev/shots/c3-0_047-chase.png')
print('cards written')
