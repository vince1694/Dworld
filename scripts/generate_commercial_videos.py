import os
import sys
import math
import wave
import subprocess
import struct

# Safe conditional imports with auto-installer
try:
    import numpy as np  # type: ignore
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "numpy"])
    import numpy as np  # type: ignore

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter  # type: ignore
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image, ImageDraw, ImageFont, ImageFilter  # type: ignore

try:
    import imageio_ffmpeg  # type: ignore
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "imageio-ffmpeg"])
    import imageio_ffmpeg  # type: ignore
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

OUTPUT_DIR = os.path.abspath('client/public/videos')
CACHE_DIR  = os.path.abspath('client/public/videos/assets_cache')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CACHE_DIR,  exist_ok=True)

# ── Resolution ────────────────────────────────────────────────────────────────
WIDTH, HEIGHT, FPS = 1280, 720, 24

# ── Fonts ─────────────────────────────────────────────────────────────────────
def _font(path, size):
    try:    return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

SEGOE_PATHS = [
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/verdanab.ttf",
]
SEGOE_LIGHT = [
    "C:/Windows/Fonts/segoeuil.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/verdana.ttf",
]
def pick_font(size, light=False):
    paths = SEGOE_LIGHT if light else SEGOE_PATHS
    for p in paths:
        if os.path.exists(p):
            return _font(p, size)
    return ImageFont.load_default()

# ── D.WORLD Design System Colours ─────────────────────────────────────────────
C = {
    'bg':          (248, 250, 252),   # --bg-main
    'bg_card':     (255, 255, 255),   # --bg-card
    'primary':     (79,  70,  229),   # --primary  #4f46e5
    'primary_dk':  (67,  56,  202),   # --primary-hover #4338ca
    'secondary':   (124, 58,  237),   # --secondary #7c3aed
    'accent':      (245, 158,  11),   # --accent amber
    'success':     (16,  185, 129),   # --success green
    'text':        (15,  23,  42),    # --text-main
    'text_m':      (71,  85, 105),    # --text-muted
    'text_s':      (148, 163, 184),   # --text-subtle
    'border':      (226, 232, 240),   # --border-light
    'border_dk':   (203, 213, 225),   # --border-strong
    'nav':         (255, 255, 255),   # nav bg
    'dark_bg':     (9,   13,  22),    # modal / dark overlay
    'dark_card':   (15,  23,  42),    # dark card
    'dark_border': (30,  41,  59),    # dark border
    'indigo_dim':  (79,  70, 229, 25),# indigo glow tint
    'white':       (255, 255, 255),
    'black':       (0,   0,   0),
}

# ── Logo ───────────────────────────────────────────────────────────────────────
LOGO_PATH = os.path.abspath('client/public/logo-sm.png')
if not os.path.exists(LOGO_PATH):
    LOGO_PATH = os.path.abspath('client/src/assets/logo-sm.png')

def load_logo(target_h=28):
    if os.path.exists(LOGO_PATH):
        img = Image.open(LOGO_PATH).convert('RGBA')
        ratio = target_h / img.height
        return img.resize((int(img.width * ratio), target_h), Image.Resampling.LANCZOS)
    return None

# ── Drawing helpers ────────────────────────────────────────────────────────────
def pill(draw, x, y, w, h, color, radius=8):
    draw.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=color)

def card(img_layer, draw, x, y, w, h, bg=None, border=None, shadow=True, radius=14):
    if shadow:
        sh = Image.new('RGBA', (w+16, h+16), (0,0,0,0))
        sh_d = ImageDraw.Draw(sh)
        sh_d.rounded_rectangle([4,4,w+12,h+12], radius=radius+2, fill=(15,23,42,30))
        sh = sh.filter(ImageFilter.GaussianBlur(6))
        img_layer.paste(sh, (x-8, y-8), sh)
    bg_c   = bg     or C['bg_card']
    brd_c  = border or C['border']
    draw.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=bg_c, outline=brd_c, width=1)

def text_centered(draw, cx, y, txt, font, fill):
    bb = draw.textbbox((0,0), txt, font=font)
    tw = bb[2]-bb[0]
    draw.text((cx - tw//2, y), txt, font=font, fill=fill)

def text_right(draw, rx, y, txt, font, fill):
    bb = draw.textbbox((0,0), txt, font=font)
    tw = bb[2]-bb[0]
    draw.text((rx - tw, y), txt, font=font, fill=fill)

def star_row(draw, x, y, n=5, filled=4, size=13, gap=3, color=(245,158,11)):
    """Draw a row of star shapes using polygons."""
    for i in range(n):
        c2 = color if i < filled else C['border_dk']
        cx_s = x + i*(size+gap) + size//2
        cy_s = y + size//2
        r_s  = size//2
        # draw.regular_polygon expects ((cx,cy), r) in newer Pillow
        try:
            draw.regular_polygon(((cx_s, cy_s), r_s), n_sides=5, rotation=36, fill=c2)
        except TypeError:
            # Fallback: older Pillow uses (cx, cy, r) flat tuple
            draw.regular_polygon((cx_s, cy_s, r_s), n_sides=5, rotation=36, fill=c2)

def avatar_circle(img, x, y, r, initials, bg=None):
    """Draw a coloured circle avatar with initials."""
    bg_c = bg or C['primary']
    mask = Image.new('L', (r*2, r*2), 0)
    ImageDraw.Draw(mask).ellipse([0,0,r*2,r*2], fill=255)
    circ = Image.new('RGBA', (r*2, r*2), bg_c+(255,))
    d = ImageDraw.Draw(circ)
    f = pick_font(r-4)
    bb = d.textbbox((0,0), initials, font=f)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    d.text((r - tw//2, r - th//2 - 2), initials, font=f, fill=(255,255,255))
    img.paste(circ, (x, y), mask)

def status_badge(draw, x, y, label, color):
    """Small coloured status pill."""
    f = pick_font(12)
    bb = draw.textbbox((0,0), label, font=f)
    tw = bb[2]-bb[0]
    draw.rounded_rectangle([x,y, x+tw+16, y+20], radius=10, fill=color+(35,))
    draw.rounded_rectangle([x,y, x+tw+16, y+20], radius=10, outline=color+(160,), width=1)
    draw.text((x+8, y+2), label, font=f, fill=color+(255,))

# ── NAVBAR (shared) ────────────────────────────────────────────────────────────
def draw_navbar(img, draw, active_page='Services', logged_in=True):
    """Full-width frosted navbar matching the real site."""
    NAV_H = 58
    # frosted white strip
    nav = Image.new('RGBA', (WIDTH, NAV_H), (255,255,255,215))
    img.paste(nav, (0,0), nav)
    # bottom border
    draw.line([(0, NAV_H), (WIDTH, NAV_H)], fill=C['border'], width=1)

    # Logo
    logo = load_logo(26)
    lx = 32
    if logo:
        img.paste(logo, (lx, (NAV_H-26)//2), logo)
        lx += logo.width + 8
    f_logo = pick_font(18)
    draw.text((lx, (NAV_H-20)//2+1), "D.WORLD", font=f_logo, fill=C['primary'])

    # Nav links
    links = ['Home', 'Services', 'Dashboard']
    f_link = pick_font(14, light=True)
    lx2 = WIDTH//2 - 140
    for lnk in links:
        active = lnk == active_page
        col = C['primary'] if active else C['text_m']
        draw.text((lx2, 20), lnk, font=f_link, fill=col)
        if active:
            bb = draw.textbbox((0,0), lnk, font=f_link)
            tw = bb[2]-bb[0]
            draw.line([(lx2, 52), (lx2+tw, 52)], fill=C['primary'], width=2)
        lx2 += 95

    # CTA / avatar
    f_btn = pick_font(13)
    if logged_in:
        avatar_circle(img, WIDTH-70, 14, 15, 'DK', C['primary'])
        draw.text((WIDTH-50, 20), '▾', font=f_btn, fill=C['text_m'])
    else:
        bx = WIDTH - 160
        draw.rounded_rectangle([bx, 14, bx+70, 42], radius=10, fill=C['primary'])
        draw.text((bx+9, 18), 'Sign In', font=f_btn, fill=(255,255,255))
        bx2 = bx+78
        draw.rounded_rectangle([bx2, 14, bx2+74, 42], radius=10, fill=C['bg_card'], outline=C['border'], width=1)
        draw.text((bx2+8, 18), 'Register', font=f_btn, fill=C['text'])

# ── LIGHT SCENE BG ─────────────────────────────────────────────────────────────
def make_light_bg():
    """Create the app's light #f8fafc background with subtle grid pattern."""
    bg = Image.new('RGB', (WIDTH, HEIGHT), C['bg'])
    d  = ImageDraw.Draw(bg)
    # Very subtle dot grid
    for gy in range(0, HEIGHT, 32):
        for gx in range(0, WIDTH, 32):
            d.ellipse([gx,gy,gx+1,gy+1], fill=(226,232,240))
    return bg

# ── DARK SCENE BG ──────────────────────────────────────────────────────────────
def make_dark_bg():
    """Dark modal/cinematic background used for CTA slides."""
    bg = Image.new('RGB', (WIDTH, HEIGHT), C['dark_bg'])
    d  = ImageDraw.Draw(bg)
    # Soft radial glow in centre
    for r2 in range(300, 0, -4):
        a = int(14 * (1 - r2/300) ** 2)
        cx, cy = WIDTH//2, HEIGHT//2
        d.ellipse([cx-r2, cy-r2*0.6, cx+r2, cy+r2*0.6],
                  fill=(79,70,229,a) if r2 > 0 else (0,0,0,0))
    return bg

LIGHT_BG = make_light_bg()
DARK_BG  = make_dark_bg()

# ══════════════════════════════════════════════════════════════════════════════
#  SCENE RENDERERS — each returns a PIL Image (RGB)
# ══════════════════════════════════════════════════════════════════════════════

# ── Scene: Services Discovery page ────────────────────────────────────────────
def scene_services_page(progress=0.5):
    img = LIGHT_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)
    draw_navbar(img, d, 'Services', logged_in=False)

    # Hero search section
    d.rectangle([0, 58, WIDTH, 160], fill=(255,255,255))
    d.line([(0,160),(WIDTH,160)], fill=C['border'], width=1)
    f_h1 = pick_font(28)
    f_sub = pick_font(14, light=True)
    d.text((WIDTH//2 - 220, 72), "Find Campus Specialists", font=f_h1, fill=C['text'])
    d.text((WIDTH//2 - 185, 110), "Barbers · Braiders · Lash Techs · Nail Artists on your campus", font=f_sub, fill=C['text_m'])

    # Search bar
    sx, sy, sw, sh2 = 220, 128, 680, 38
    d.rounded_rectangle([sx,sy, sx+sw, sy+sh2], radius=10, fill=(255,255,255), outline=C['border_dk'], width=1)
    f_srch = pick_font(14, light=True)
    d.text((sx+14, sy+10), '🔍  Search for barber, braider, lash tech…', font=f_srch, fill=C['text_s'])
    bx2 = sx+sw+10
    d.rounded_rectangle([bx2, sy, bx2+66, sy+sh2], radius=10, fill=C['primary'])
    d.text((bx2+8, sy+10), 'Search', font=pick_font(13), fill=(255,255,255))

    # Filter pills
    px = 180
    for cat in ['All Services', 'Barbers', 'Lash Techs', 'Nail Techs', 'Braiders', 'Body Care']:
        f_cat = pick_font(12)
        bb = d.textbbox((0,0), cat, font=f_cat)
        tw = bb[2]-bb[0]
        active = cat == 'All Services'
        bg_pill = C['primary'] if active else (255,255,255)
        brd_pill = C['primary'] if active else C['border']
        txt_pill = (255,255,255) if active else C['text_m']
        d.rounded_rectangle([px,172, px+tw+22, 196], radius=12, fill=bg_pill, outline=brd_pill, width=1)
        d.text((px+11, 175), cat, font=f_cat, fill=txt_pill)
        px += tw + 36

    # Service / Expert cards row
    cw, ch2 = 240, 220
    experts = [
        ('Daniel K.', 'Barber', '₦3,000/session', 4.9, 42, C['primary']),
        ('Danielle A.', 'Lash Techs', '₦4,000/set', 4.8, 31, C['secondary']),
        ('Ifeanyi M.', 'Nail Techs', '₦2,500/set', 4.7, 55, (16,185,129)),
        ('Amara S.', 'Hair Braider', '₦5,000/style', 5.0, 18, C['accent']),
    ]
    gx_start = 48
    for i, (name, spec, price, rating, reviews, avc) in enumerate(experts):
        cx = gx_start + i*(cw+24)
        cy = 220
        # animate first card sliding in
        if i == 0:
            slide = max(0, min(1, progress * 3))
            cx = int(gx_start - 60*(1-slide))
        elif i == 1:
            slide = max(0, min(1, (progress-0.1)*2.5))
            cy_off = int(30*(1-slide))
            cy += cy_off
        card(img, d, cx, cy, cw, ch2)
        # avatar
        avatar_circle(img, cx+16, cy+16, 24, name[:2].upper(), avc)
        # name + verified
        d.text((cx+52, cy+18), name, font=pick_font(14), fill=C['text'])
        d.text((cx+52, cy+37), spec, font=pick_font(11, light=True), fill=C['text_m'])
        # verified badge
        d.rounded_rectangle([cx+16, cy+60, cx+110, cy+78], radius=8,
                             fill=(16,185,129,20), outline=(16,185,129,80), width=1)
        d.text((cx+22, cy+62), '✓ Verified Expert', font=pick_font(10), fill=(16,185,129))
        # rating stars
        star_row(d, cx+16, cy+90, filled=int(rating))
        d.text((cx+90, cy+88), f'{rating} ({reviews} reviews)', font=pick_font(10, light=True), fill=C['text_m'])
        # location
        d.text((cx+16, cy+114), f'📍 Campus Area', font=pick_font(11, light=True), fill=C['text_m'])
        # price
        d.text((cx+16, cy+136), price, font=pick_font(16), fill=C['primary'])
        # CTA buttons
        bw = (cw-32)//2 - 4
        d.rounded_rectangle([cx+16, cy+168, cx+16+bw, cy+198], radius=10, fill=C['primary'])
        d.text((cx+22, cy+174), 'Book Now', font=pick_font(12), fill=(255,255,255))
        d.rounded_rectangle([cx+20+bw, cy+168, cx+16+cw-16, cy+198], radius=10,
                             fill=(255,255,255), outline=C['border_dk'], width=1)
        d.text((cx+24+bw, cy+174), 'Chat', font=pick_font(12), fill=C['text_m'])

    img = img.convert('RGB')
    return img

# ── Scene: Expert Profile Page ─────────────────────────────────────────────────
def scene_expert_profile(progress=0.5):
    img = LIGHT_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)
    draw_navbar(img, d, 'Services', logged_in=True)

    # Profile header card
    card(img, d, 48, 76, WIDTH-96, 190)

    # Large avatar
    avatar_circle(img, 68, 96, 48, 'DA', C['secondary'])

    # Expert details
    f_name = pick_font(22)
    f_body = pick_font(14, light=True)
    d.text((180, 96), 'Danielle Adaeze', font=f_name, fill=C['text'])
    d.text((180, 126), 'Lash Technician  ·  Campus Area, Enugu', font=f_body, fill=C['text_m'])

    # Verified + Rating
    d.rounded_rectangle([180, 152, 310, 172], radius=10,
                         fill=(16,185,129,20), outline=(16,185,129,100), width=1)
    d.text((188, 154), '✓ Verified Campus Expert', font=pick_font(11), fill=(16,185,129))
    star_row(d, 320, 154, filled=5)
    d.text((400, 152), '5.0 (31 reviews)', font=pick_font(11, light=True), fill=C['text_m'])

    # Stats row
    stats = [('42', 'Completed'), ('100%', 'Satisfaction'), ('< 1hr', 'Response'), ('₦4,000', 'Per Session')]
    sx2 = 180
    for val, lbl in stats:
        d.text((sx2, 180), val, font=pick_font(16), fill=C['primary'])
        d.text((sx2, 200), lbl, font=pick_font(10, light=True), fill=C['text_m'])
        sx2 += 120

    # Service card
    card(img, d, 48, 278, 340, 120, radius=12)
    d.text((68, 294), 'Lash Extension & Lift', font=pick_font(16), fill=C['text'])
    d.text((68, 318), 'Full set, volume lash, hybrid styles', font=pick_font(12, light=True), fill=C['text_m'])
    d.text((68, 342), '₦4,000', font=pick_font(20), fill=C['primary'])
    d.text((200, 350), '/ per session', font=pick_font(11, light=True), fill=C['text_m'])
    d.rounded_rectangle([250, 338, 376, 364], radius=10, fill=C['primary'])
    d.text((265, 344), '+ Book Session', font=pick_font(12), fill=(255,255,255))

    # Lookbook thumbnails
    d.text((420, 284), 'Lookbook', font=pick_font(14), fill=C['text'])
    for li in range(4):
        lx3 = 420 + li*78
        ly = 308
        slide = max(0, min(1, progress * 2 - li * 0.3))
        alpha = int(255 * slide)
        thumb = Image.new('RGBA', (68, 72), C['secondary']+(alpha,))
        ImageDraw.Draw(thumb).rounded_rectangle([0,0,68,72], radius=8, fill=C['secondary']+(alpha,))
        d.text((lx3+4, ly+28), '📷', font=pick_font(26), fill=(*C['white'], alpha))
        img.paste(thumb, (lx3, ly), thumb)

    # Reviews section
    card(img, d, 48, 414, WIDTH-96, 240, radius=12)
    d.text((68, 428), 'Student Reviews', font=pick_font(14), fill=C['text'])
    reviews = [
        ('Chidinma O.', 4.9, 'She was amazing! My lashes lasted 3 weeks, very professional.'),
        ('Blessing N.', 5.0, 'Best lash tech on campus. Friendly and very detailed work!'),
    ]
    ry = 456
    for rname, rrating, rtext in reviews:
        avatar_circle(img, 68, ry, 18, rname[:2].upper(), C['primary'])
        d.text((110, ry+2), rname, font=pick_font(12), fill=C['text'])
        star_row(d, 110, ry+20, filled=int(rrating), size=10, gap=2)
        d.text((68, ry+40), rtext[:65]+'…', font=pick_font(11, light=True), fill=C['text_m'])
        ry += 100

    img = img.convert('RGB')
    return img

# ── Scene: Booking Wizard ──────────────────────────────────────────────────────
def scene_booking_wizard(progress=0.5, step=1):
    img = LIGHT_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)
    draw_navbar(img, d, 'Services', logged_in=True)

    # Modal overlay
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (9,13,22,180))
    img.paste(overlay, (0,0), overlay)

    # Modal card
    mw, mh = 700, 530
    mx, my = (WIDTH-mw)//2, 85
    modal = Image.new('RGBA', (mw+20, mh+20), (0,0,0,0))
    ImageDraw.Draw(modal).rounded_rectangle([8,8,mw+12,mh+12], radius=20,
                                             fill=(9,13,22,255), outline=(30,41,59,255), width=1)
    modal = modal.filter(ImageFilter.GaussianBlur(4))
    img.paste(modal, (mx-10, my-10), modal)
    d.rounded_rectangle([mx, my, mx+mw, my+mh], radius=20,
                         fill=C['dark_bg']+(255,), outline=C['dark_border']+(255,), width=1)

    # Step indicators
    steps = ['Service', 'Date & Time', 'Payment', 'Confirm']
    sw3 = mw // len(steps)
    for i, s in enumerate(steps):
        done = i < step
        active = i == step
        col = C['primary'] if (done or active) else C['dark_border']
        cx3 = mx + i*sw3 + sw3//2
        d.ellipse([cx3-14, my+22, cx3+14, my+50], fill=col+(255,), outline=col+(255,))
        f_step = pick_font(11)
        if done:
            d.text((cx3-5, my+30), '✓', font=pick_font(14), fill=(255,255,255))
        else:
            lbl = str(i+1)
            bb = d.textbbox((0,0), lbl, font=f_step)
            d.text((cx3-(bb[2]-bb[0])//2, my+32), lbl, font=f_step, fill=(255,255,255))
        tc = (255,255,255) if active else C['text_s']
        text_centered(d, cx3, my+56, s, pick_font(11, light=True), tc)
        if i < len(steps)-1:
            d.line([(cx3+14, my+36),(cx3+sw3-14, my+36)], fill=col+(150,), width=1)

    if step == 0:
        # Service selection
        d.text((mx+30, my+90), 'Choose Your Service', font=pick_font(18), fill=(255,255,255))
        svcs = [
            ('Lash Extension & Lift', '₦4,000', 'Single Session', True),
            ('Volume Set', '₦5,500', 'Premium Package', False),
        ]
        for si, (sn, sp2, sl, sel) in enumerate(svcs):
            sy3 = my + 130 + si*100
            bc2 = (79,70,229,30) if sel else (30,41,59,255)
            d.rounded_rectangle([mx+30, sy3, mx+mw-30, sy3+80], radius=14,
                                 fill=bc2, outline=(79,70,229,180) if sel else (30,41,59,255), width=2)
            d.text((mx+56, sy3+16), sn, font=pick_font(16), fill=(255,255,255))
            d.text((mx+56, sy3+42), sl, font=pick_font(12, light=True), fill=C['text_s'])
            text_right(d, mx+mw-50, sy3+24, sp2, pick_font(18), (79,70,229,255))
            if sel:
                d.ellipse([mx+mw-80, sy3+28, mx+mw-60, sy3+48], fill=C['primary']+(255,))
                d.text((mx+mw-74, sy3+30), '✓', font=pick_font(12), fill=(255,255,255))

    elif step == 1:
        # Date & Time
        d.text((mx+30, my+90), 'Pick a Date & Time Slot', font=pick_font(18), fill=(255,255,255))
        # Mini calendar
        days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
        dates = list(range(18,25))
        cal_x = mx+30
        for di, (day, date) in enumerate(zip(days, dates)):
            dx2 = cal_x + di*82
            selected = di == 3
            d.rounded_rectangle([dx2, my+128, dx2+68, my+184], radius=12,
                                 fill=C['primary']+(255,) if selected else (30,41,59,255),
                                 outline=C['primary']+(200,) if selected else (30,41,59,255), width=1)
            text_centered(d, dx2+34, my+136, day, pick_font(11, light=True),
                          (255,255,255) if selected else C['text_s'])
            text_centered(d, dx2+34, my+156, str(date), pick_font(16),
                          (255,255,255) if selected else C['text_m'])

        d.text((mx+30, my+206), 'Available Time Slots', font=pick_font(13), fill=C['text_s'])
        slots = ['9:00 AM','11:00 AM','2:00 PM','4:00 PM','5:30 PM']
        for ti, sl2 in enumerate(slots):
            tx2 = mx + 30 + ti*126
            sel2 = ti == 1
            d.rounded_rectangle([tx2, my+228, tx2+108, my+258], radius=10,
                                 fill=C['primary']+(255,) if sel2 else (30,41,59,255),
                                 outline=C['primary']+(200,) if sel2 else (50,65,80,255))
            text_centered(d, tx2+54, my+234, sl2, pick_font(13),
                          (255,255,255) if sel2 else C['text_m'])

    elif step == 2:
        # Payment + Escrow
        d.text((mx+30, my+90), 'Secure Escrow Payment', font=pick_font(18), fill=(255,255,255))
        # Escrow info box
        d.rounded_rectangle([mx+30, my+130, mx+mw-30, my+230], radius=14,
                             fill=(16,185,129,20), outline=(16,185,129,80), width=1)
        d.text((mx+54, my+148), '🔒  100% Escrow Protection', font=pick_font(14), fill=(16,185,129))
        d.text((mx+54, my+174), 'Your payment is held securely until the service is', font=pick_font(11, light=True), fill=C['text_s'])
        d.text((mx+54, my+194), 'completed to your satisfaction. Auto-refund if cancelled.', font=pick_font(11, light=True), fill=C['text_s'])
        # Order summary
        d.text((mx+30, my+244), 'Order Summary', font=pick_font(14), fill=(255,255,255))
        items = [('Lash Extension & Lift', '₦4,000'), ('Platform Protection', 'Free'), ('Total', '₦4,000')]
        iy = my+272
        for it, ip2 in items:
            bold = it == 'Total'
            d.text((mx+30, iy), it, font=pick_font(14 if bold else 12, light=not bold), fill=(255,255,255) if bold else C['text_s'])
            text_right(d, mx+mw-30, iy, ip2, pick_font(14 if bold else 12), (79,70,229,255) if bold else C['text_s'])
            if bold:
                d.line([(mx+30, iy-6),(mx+mw-30, iy-6)], fill=C['dark_border'], width=1)
            iy += 30
        # Paystack button
        btn_x = mx+(mw-320)//2
        d.rounded_rectangle([btn_x, my+386, btn_x+320, my+430], radius=14, fill=C['success']+(255,))
        d.text((btn_x+70, my+397), '💳  Pay Securely with Paystack', font=pick_font(14), fill=(255,255,255))

    # CTA bar at bottom of modal
    d.line([(mx+1, my+mh-68),(mx+mw-1, my+mh-68)], fill=C['dark_border'], width=1)
    if step < 3:
        nx_x = mx + mw - 150
        d.rounded_rectangle([nx_x, my+mh-54, nx_x+128, my+mh-18], radius=10, fill=C['primary'])
        d.text((nx_x+28, my+mh-46), 'Continue →', font=pick_font(13), fill=(255,255,255))
    bk_x = mx+16
    d.rounded_rectangle([bk_x, my+mh-54, bk_x+90, my+mh-18], radius=10,
                         fill=(30,41,59,255), outline=C['dark_border'], width=1)
    d.text((bk_x+18, my+mh-46), '← Back', font=pick_font(13), fill=C['text_s'])

    img = img.convert('RGB')
    return img

# ── Scene: Expert Dashboard ────────────────────────────────────────────────────
def scene_expert_dashboard(progress=0.5):
    img = LIGHT_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)
    draw_navbar(img, d, 'Dashboard', logged_in=True)

    # Sidebar
    sb_w = 220
    d.rectangle([0, 58, sb_w, HEIGHT], fill=(255,255,255))
    d.line([(sb_w, 58),(sb_w, HEIGHT)], fill=C['border'], width=1)
    avatar_circle(img, 20, 72, 28, 'DA', C['secondary'])
    d.text((78, 78), 'Danielle A.', font=pick_font(14), fill=C['text'])
    d.text((78, 98), 'Lash Technician', font=pick_font(11, light=True), fill=C['text_m'])
    d.rounded_rectangle([20, 108, 118, 124], radius=8,
                         fill=(16,185,129,20), outline=(16,185,129,80))
    d.text((26, 109), '✓ Verified Expert', font=pick_font(9), fill=(16,185,129))

    nav_items = [
        ('📊', 'Overview', True),
        ('📅', 'Appointments', False),
        ('💼', 'My Service', False),
        ('📸', 'Lookbook', False),
        ('💰', 'Wallet', False),
        ('💬', 'Messages', False),
        ('⚙️', 'Settings', False),
    ]
    ny = 142
    for icon, label, active in nav_items:
        bc3 = C['primary'] if active else None
        fg3 = (255,255,255) if active else C['text_m']
        if active:
            d.rounded_rectangle([12, ny-4, sb_w-12, ny+28], radius=10, fill=C['primary'])
        d.text((22, ny), icon+' '+label, font=pick_font(13, light=not active), fill=fg3)
        ny += 42

    # Main content area
    cx4 = sb_w + 24
    cw2 = WIDTH - sb_w - 48

    # Welcome bar
    d.text((cx4, 76), 'Good Morning, Danielle 👋', font=pick_font(20), fill=C['text'])
    d.text((cx4, 108), 'Here\'s your business overview for today', font=pick_font(13, light=True), fill=C['text_m'])

    # Stat cards row
    stats2 = [
        ('₦42,000', 'Total Earned', C['primary'], '↑ 12% this week'),
        ('8', 'Pending Jobs', C['accent'], '3 need approval'),
        ('31', 'Total Bookings', C['success'], 'All time'),
        ('4.9★', 'Rating', C['secondary'], 'From 31 reviews'),
    ]
    stw = (cw2 - 48) // 4
    for si2, (val, lbl2, col2, sub2) in enumerate(stats2):
        sx3 = cx4 + si2*(stw+16)
        slide3 = max(0.0, min(1.0, progress*4 - si2*0.5))
        alpha2 = int(255 * slide3)
        sc = Image.new('RGBA', (stw, 102), (0,0,0,0))
        sc_d = ImageDraw.Draw(sc)
        sc_d.rounded_rectangle([0,0,stw,102], radius=12, fill=(255,255,255,alpha2), outline=(*C['border'],alpha2))
        # top colored bar
        sc_d.rounded_rectangle([0,0,stw,5], radius=3, fill=(*col2, alpha2))
        sc_d.text((16, 18), val, font=pick_font(22), fill=(*col2, alpha2))
        sc_d.text((16, 48), lbl2, font=pick_font(12), fill=(*C['text'], alpha2))
        sc_d.text((16, 68), sub2, font=pick_font(10, light=True), fill=(*C['text_s'], alpha2))
        img.paste(sc, (sx3, 140), sc)

    # Upcoming appointments table
    d.text((cx4, 258), 'Upcoming Appointments', font=pick_font(14), fill=C['text'])
    card(img, d, cx4, 282, cw2, 230, radius=12)
    # Table header
    d.line([(cx4, 316),(cx4+cw2, 316)], fill=C['border'], width=1)
    headers2 = ['Client', 'Service', 'Date & Time', 'Amount', 'Status']
    hx2 = cx4+16
    for h2 in headers2:
        d.text((hx2, 294), h2, font=pick_font(11), fill=C['text_m'])
        hx2 += cw2//5
    rows2 = [
        ('Chidinma O.', 'Lash Extension', 'Nov 22 · 11:00 AM', '₦4,000', 'Pending', C['accent']),
        ('Blessing N.', 'Volume Set', 'Nov 23 · 2:00 PM', '₦5,500', 'Approved', C['success']),
        ('Amaka P.', 'Lash Lift', 'Nov 24 · 9:00 AM', '₦3,500', 'Pending', C['accent']),
    ]
    ry2 = 326
    for cname, csvc, cdate, cprice, cstatus, ccol in rows2:
        vals2 = [cname, csvc, cdate, cprice]
        rx2 = cx4+16
        for v2 in vals2:
            d.text((rx2, ry2), v2, font=pick_font(11, light=True), fill=C['text'])
            rx2 += cw2//5
        status_badge(d, rx2, ry2-2, cstatus, ccol)
        ry2 += 50
        d.line([(cx4, ry2-10),(cx4+cw2, ry2-10)], fill=C['border'], width=1)

    img = img.convert('RGB')
    return img

# ── Scene: Wallet / Payout ─────────────────────────────────────────────────────
def scene_wallet(progress=0.5):
    img = LIGHT_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)
    draw_navbar(img, d, 'Dashboard', logged_in=True)

    # Wallet hero card
    ww, wh2 = 740, 200
    wx, wy = (WIDTH-ww)//2, 80
    # Gradient bg
    grad_w = Image.new('RGBA', (ww, wh2), (0,0,0,0))
    gd = ImageDraw.Draw(grad_w)
    for gy2 in range(wh2):
        t = gy2/wh2
        r2 = int(79 + t*(124-79))
        g2 = int(70 + t*(58-70))
        b2 = int(229 + t*(237-229))
        gd.line([(0,gy2),(ww,gy2)], fill=(r2,g2,b2,255))
    gd.rounded_rectangle([0,0,ww,wh2], radius=20, fill=(0,0,0,0), outline=(255,255,255,30), width=1)
    img.paste(grad_w, (wx, wy), grad_w)
    d.rounded_rectangle([wx, wy, wx+ww, wy+wh2], radius=20, outline=(255,255,255,30), width=1)

    # Wallet text
    d.text((wx+36, wy+32), 'Expert Wallet Balance', font=pick_font(13, light=True), fill=(255,255,255,200))
    d.text((wx+36, wy+58), '₦42,000.00', font=pick_font(38), fill=(255,255,255))
    d.text((wx+36, wy+108), '+ ₦5,500 from latest booking  ·  Available for withdrawal', font=pick_font(12, light=True), fill=(255,255,255,175))

    # Action buttons
    for bi2, (blbl, bcol2) in enumerate([('Withdraw to Bank', C['success']), ('View History', (255,255,255,30))]):
        bx3 = wx+36 + bi2*196
        d.rounded_rectangle([bx3, wy+142, bx3+176, wy+174], radius=12,
                             fill=bcol2 if bi2==0 else (255,255,255,30),
                             outline=(255,255,255,60) if bi2==1 else None)
        d.text((bx3+16, wy+150), blbl, font=pick_font(13), fill=(255,255,255))

    # Recent transactions
    d.text((wx, wy+220), 'Recent Transactions', font=pick_font(14), fill=C['text'])
    card(img, d, wx, wy+248, ww, 350, radius=12)
    txns = [
        ('+₦4,000', 'Escrow Released – Chidinma O. · Lash Extension', 'Nov 20, 2026', C['success']),
        ('+₦5,500', 'Escrow Released – Blessing N. · Volume Set', 'Nov 19, 2026', C['success']),
        ('+₦3,000', 'Escrow Released – Amaka P. · Lash Lift', 'Nov 18, 2026', C['success']),
        ('-₦8,000', 'Bank Withdrawal · GTB ****4521', 'Nov 17, 2026', (239,68,68)),
        ('+₦4,000', 'Escrow Released – Chisom T. · Lash Extension', 'Nov 15, 2026', C['success']),
    ]
    ty2 = wy+268
    for tv2, td2, tdt2, tc2 in txns:
        d.text((wx+20, ty2), tv2, font=pick_font(14), fill=tc2)
        d.text((wx+120, ty2), td2, font=pick_font(11, light=True), fill=C['text'])
        text_right(d, wx+ww-20, ty2, tdt2, pick_font(11, light=True), C['text_s'])
        d.line([(wx+16, ty2+28),(wx+ww-16, ty2+28)], fill=C['border'], width=1)
        ty2 += 48

    img = img.convert('RGB')
    return img

# ── Scene: Home / Hero ─────────────────────────────────────────────────────────
def scene_home(progress=0.5):
    img = LIGHT_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)
    draw_navbar(img, d, 'Home', logged_in=False)

    # Hero section
    d.text((WIDTH//2 - 310, 100), 'Your Campus.', font=pick_font(52), fill=C['text'])
    # "Your Talent." in primary
    d.text((WIDTH//2 - 310, 162), 'Your Talent.', font=pick_font(52), fill=C['primary'])
    d.text((WIDTH//2 - 310, 228), 'Your D.WORLD.', font=pick_font(52), fill=C['secondary'])

    f_desc = pick_font(16, light=True)
    d.text((WIDTH//2 - 310, 302), 'The verified campus marketplace for student services —', font=f_desc, fill=C['text_m'])
    d.text((WIDTH//2 - 310, 326), 'barbers, braiders, lash artists, and more. Booked safely.', font=f_desc, fill=C['text_m'])

    # CTA Buttons
    cta_slide = max(0.0, min(1.0, progress * 2.5))
    btn_alpha = int(255 * cta_slide)
    for bi3, (blbl3, bfg) in enumerate([('Find a Specialist', C['primary']), ('Join as Expert', C['secondary'])]):
        bx4 = WIDTH//2 - 310 + bi3*220
        btn_c = Image.new('RGBA', (200, 50), (0,0,0,0))
        bc4 = ImageDraw.Draw(btn_c)
        bc4.rounded_rectangle([0,0,200,50], radius=12, fill=(*blbl3[:0], *bfg, btn_alpha) if False else (*bfg, btn_alpha))
        bc4.text((24, 14), blbl3, font=pick_font(15), fill=(255,255,255,btn_alpha))
        img.paste(btn_c, (bx4, 368), btn_c)

    # Feature chips
    chips = ['✓ Escrow Protection', '✓ Verified Experts', '✓ Instant Booking', '✓ Wallet Payouts']
    cpx2 = WIDTH//2 - 310
    for ch in chips:
        f_ch = pick_font(12)
        bb2 = d.textbbox((0,0), ch, font=f_ch)
        tw2 = bb2[2]-bb2[0]
        d.rounded_rectangle([cpx2, 436, cpx2+tw2+20, 458], radius=20,
                             fill=(79,70,229,20), outline=(79,70,229,80), width=1)
        d.text((cpx2+10, 438), ch, font=f_ch, fill=C['primary'])
        cpx2 += tw2 + 36

    # Right side: floating UI preview card
    card(img, d, WIDTH-440, 80, 380, 440, shadow=True, radius=20)
    # Mini service cards inside
    mcards = [
        ('Daniel K.', 'Barber', '₦3,000', C['primary']),
        ('Danielle A.', 'Lash Techs', '₦4,000', C['secondary']),
        ('Ifeanyi M.', 'Nail Techs', '₦2,500', C['success']),
    ]
    mc_y = 110
    for mcname, mcspec2, mcprice2, mcc in mcards:
        y_off2 = int(20 * (1-min(1.0, progress*2))) if mc_y == 110 else 0
        my2 = mc_y + y_off2
        d.rounded_rectangle([WIDTH-424, my2, WIDTH-76, my2+92], radius=12,
                             fill=C['bg'], outline=C['border'], width=1)
        avatar_circle(img, WIDTH-408, my2+16, 22, mcname[:2].upper(), mcc)
        d.text((WIDTH-360, my2+16), mcname, font=pick_font(13), fill=C['text'])
        d.text((WIDTH-360, my2+36), mcspec2, font=pick_font(11, light=True), fill=C['text_m'])
        d.text((WIDTH-360, my2+56), mcprice2, font=pick_font(14), fill=C['primary'])
        d.rounded_rectangle([WIDTH-170, my2+50, WIDTH-80, my2+76], radius=8, fill=mcc)
        d.text((WIDTH-162, my2+56), 'Book Now', font=pick_font(11), fill=(255,255,255))
        mc_y += 108

    img = img.convert('RGB')
    return img

# ── Scene: AI Matcher ──────────────────────────────────────────────────────────
def scene_ai_matcher(progress=0.5):
    img = LIGHT_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)
    draw_navbar(img, d, 'Services', logged_in=True)

    # Header
    d.text((WIDTH//2-280, 80), 'AI Campus Expert Matcher', font=pick_font(26), fill=C['text'])
    d.text((WIDTH//2-280, 118), 'Describe what you need in plain English — our AI finds your perfect match.', font=pick_font(13, light=True), fill=C['text_m'])

    # Input box
    d.rounded_rectangle([120, 152, WIDTH-120, 200], radius=14,
                         fill=(255,255,255), outline=C['primary']+(200,), width=2)
    d.text((142, 165), '✨ "I need a good barber for a fresh fade before my exam…"', font=pick_font(13, light=True), fill=C['text_s'])
    d.rounded_rectangle([WIDTH-220, 158, WIDTH-128, 194], radius=10, fill=C['primary'])
    d.text((WIDTH-212, 164), '🔍 Find Match', font=pick_font(12), fill=(255,255,255))

    # Match result cards
    d.text((120, 222), 'Best Matches for You', font=pick_font(14), fill=C['text'])
    matches = [
        ('Daniel K.', 'Barber · Campus Area', '94% Match', '₦3,000', 4.9, 42, C['primary']),
        ('Ifeanyi M.', 'Barber · Hostel Block B', '88% Match', '₦2,500', 4.7, 55, C['secondary']),
    ]
    for mi, (mn, ms, mm, mp2, mr2, mrc, mcc2) in enumerate(matches):
        mx2 = 120 + mi * 460
        slide4 = max(0.0, min(1.0, progress*3 - mi*0.5))
        alpha3 = int(255 * slide4)
        mc2 = Image.new('RGBA', (430, 180), (0,0,0,0))
        mc2_d = ImageDraw.Draw(mc2)
        mc2_d.rounded_rectangle([0,0,430,180], radius=16,
                                  fill=(255,255,255,alpha3), outline=(*C['border'], alpha3), width=1)
        # Match % badge
        mc2_d.rounded_rectangle([330,16,416,38], radius=10, fill=(*mcc2, alpha3))
        mc2_d.text((340, 19), mm, font=pick_font(11), fill=(255,255,255,alpha3))
        mc2_d.text((16, 16), mn, font=pick_font(16), fill=(*C['text'], alpha3))
        mc2_d.text((16, 44), ms, font=pick_font(12, light=True), fill=(*C['text_m'], alpha3))
        star_row(mc2_d, 16, 72, filled=int(mr2), size=12, gap=2)
        mc2_d.text((94, 70), f'{mr2} · {mrc} reviews', font=pick_font(10, light=True), fill=(*C['text_s'], alpha3))
        mc2_d.text((16, 100), '📍 Campus Area, within 5 min walk', font=pick_font(11, light=True), fill=(*C['text_m'], alpha3))
        mc2_d.text((16, 126), mp2, font=pick_font(18), fill=(*mcc2, alpha3))
        mc2_d.text((100, 134), '/ session', font=pick_font(11, light=True), fill=(*C['text_s'], alpha3))
        mc2_d.rounded_rectangle([16, 150, 200, 170], radius=10, fill=(*mcc2, alpha3))
        mc2_d.text((40, 154), 'Book This Expert', font=pick_font(11), fill=(255,255,255,alpha3))
        mc2_d.rounded_rectangle([210, 150, 320, 170], radius=10, fill=(*C['bg'], alpha3), outline=(*C['border'], alpha3))
        mc2_d.text((224, 154), 'View Profile', font=pick_font(11, light=True), fill=(*C['text_m'], alpha3))
        img.paste(mc2, (mx2, 250), mc2)

    img = img.convert('RGB')
    return img

# ── Scene: CTA Outro (dark, branded) ──────────────────────────────────────────
def scene_cta(progress=0.5, cta_text='', sub_text='', btn_label=''):
    img = DARK_BG.copy().convert('RGBA')
    d   = ImageDraw.Draw(img)

    # Animated indigo glow that grows with progress
    r3 = int(180 + 80*progress)
    for ri in range(r3, 0, -6):
        alpha4 = int(18 * (1 - ri/r3) ** 1.5 * min(1.0, progress*2))
        d.ellipse([WIDTH//2-ri, HEIGHT//2-ri, WIDTH//2+ri, HEIGHT//2+ri],
                  fill=(79,70,229,alpha4))

    # Logo
    logo = load_logo(48)
    alpha5 = int(255 * min(1.0, progress*2))
    if logo:
        logo_a = logo.copy()
        logo_a.putalpha(Image.new('L', logo.size, alpha5))
        img.paste(logo_a, (WIDTH//2 - logo.width//2, HEIGHT//2 - 150), logo_a)
    else:
        f_logo2 = pick_font(60)
        d.text((WIDTH//2 - 90, HEIGHT//2 - 158), 'D.WORLD', font=f_logo2,
               fill=(*C['primary'], alpha5))

    # D.WORLD wordmark
    f_word = pick_font(48)
    bb3 = d.textbbox((0,0), 'D.WORLD', font=f_word)
    tw3 = bb3[2]-bb3[0]
    d.text((WIDTH//2 - tw3//2, HEIGHT//2 - 92), 'D.WORLD',
           font=f_word, fill=(*C['primary'], alpha5))

    # CTA headline
    slide5 = max(0.0, min(1.0, (progress-0.3)*2))
    alpha6 = int(255 * slide5)
    f_cta2 = pick_font(32)
    bb4 = d.textbbox((0,0), cta_text, font=f_cta2)
    tw4 = bb4[2]-bb4[0]
    d.text((WIDTH//2 - tw4//2, HEIGHT//2 - 24), cta_text, font=f_cta2, fill=(255,255,255,alpha6))

    # Sub
    f_sub2 = pick_font(16, light=True)
    bb5 = d.textbbox((0,0), sub_text, font=f_sub2)
    tw5 = bb5[2]-bb5[0]
    d.text((WIDTH//2 - tw5//2, HEIGHT//2 + 24), sub_text, font=f_sub2, fill=(*C['text_s'], alpha6))

    # Button
    slide6 = max(0.0, min(1.0, (progress-0.5)*2.5))
    alpha7 = int(255 * slide6)
    bw2 = 420
    bx5 = WIDTH//2 - bw2//2
    by2 = HEIGHT//2 + 80
    # glow
    for gi in range(16, 0, -2):
        d.rounded_rectangle([bx5-gi, by2-gi//2, bx5+bw2+gi, by2+56+gi//2], radius=18+gi//2,
                             fill=(79,70,229, int(12*(1-gi/16)*slide6)))
    d.rounded_rectangle([bx5, by2, bx5+bw2, by2+56], radius=14, fill=(*C['primary'], alpha7))
    f_btn2 = pick_font(20)
    bb6 = d.textbbox((0,0), btn_label, font=f_btn2)
    tw6 = bb6[2]-bb6[0]
    d.text((WIDTH//2 - tw6//2, by2+14), btn_label, font=f_btn2, fill=(255,255,255,alpha7))

    # dworld.ink URL
    slide7 = max(0.0, min(1.0, (progress-0.7)*5))
    alpha8 = int(200 * slide7)
    text_centered(d, WIDTH//2, HEIGHT//2 + 160, 'dworld.ink', pick_font(14, light=True),
                  (*C['text_s'], alpha8))

    img = img.convert('RGB')
    return img

# ══════════════════════════════════════════════════════════════════════════════
#  VIDEO TIMELINE BUILDER
# ══════════════════════════════════════════════════════════════════════════════
def lerp(a, b, t):
    return a + (b-a)*t

def ease_in_out(t):
    return t*t*(3-2*t)

def cross_dissolve(img_a, img_b, t):
    """Smooth cross-fade between two RGB images."""
    a = np.array(img_a, dtype=np.float32)
    b = np.array(img_b, dtype=np.float32)
    return Image.fromarray(np.clip(a*(1-t) + b*t, 0, 255).astype(np.uint8))

def add_progress_bar(img, slide_idx, total_slides, seg_progress):
    """Draw the top story-style progress bar."""
    d  = ImageDraw.Draw(img)
    bw3 = 100
    gap2 = 10
    tot3 = total_slides * bw3 + (total_slides-1) * gap2
    sx4 = (WIDTH - tot3) // 2
    ty3 = 10
    for i in range(total_slides):
        bx6 = sx4 + i*(bw3+gap2)
        # track
        d.rounded_rectangle([bx6, ty3, bx6+bw3, ty3+3], radius=2, fill=(255,255,255,60))
        # fill
        if i < slide_idx:
            d.rounded_rectangle([bx6, ty3, bx6+bw3, ty3+3], radius=2, fill=(*C['primary'],220))
        elif i == slide_idx:
            fw2 = int(bw3 * seg_progress)
            if fw2 > 0:
                d.rounded_rectangle([bx6, ty3, bx6+fw2, ty3+3], radius=2, fill=(*C['primary'],255))
    return img

def add_top_bar(img, left_txt='D.WORLD', right_txt='dworld.ink'):
    d  = ImageDraw.Draw(img)
    d.text((18, 20), left_txt, font=pick_font(14), fill=(255,255,255,210))
    text_right(d, WIDTH-18, 20, right_txt, pick_font(14, light=True), (*C['primary'],210))
    return img

# ── Audio synth ────────────────────────────────────────────────────────────────
def generate_soundtrack(duration_sec, filename):
    sr = 44100
    total_samples = int(sr * duration_sec)
    t = np.linspace(0, duration_sec, total_samples, endpoint=False)

    chords = [
        [220.0, 261.63, 329.63, 440.0],
        [174.61, 220.0, 261.63, 349.23],
        [130.81, 196.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 392.0]
    ]
    chord_len = duration_sec / 4.0
    audio = np.zeros(total_samples, dtype=np.float32)

    for i in range(total_samples):
        sec = t[i]
        c_idx = int(sec / chord_len) % len(chords)
        chord = chords[c_idx]
        val = sum(0.07*math.sin(2*math.pi*f*sec) + 0.025*math.sin(4*math.pi*f*sec) for f in chord)
        pulse_phase = (sec % 0.75) / 0.75
        pulse = math.exp(-pulse_phase*12)*0.22*math.sin(2*math.pi*55*pulse_phase)
        tick_phase = (sec % 0.375) / 0.375
        noise = (np.random.rand()*2-1)*math.exp(-tick_phase*25)*0.035
        audio[i] = val + pulse + noise

    fade = int(sr * 0.9)
    for i in range(fade):
        f2 = i / float(fade)
        audio[i] *= f2
        audio[total_samples-1-i] *= f2

    audio = np.clip(audio, -0.95, 0.95)
    audio_i16 = (audio*32767).astype(np.int16)
    dest = os.path.join(CACHE_DIR, filename)
    with wave.open(dest, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(audio_i16.tobytes())
    return dest

# ── Core renderer ──────────────────────────────────────────────────────────────
def render_video(filename, slides_def):
    """
    slides_def: list of dicts with keys:
      scene_fn  – callable(progress) -> PIL Image (RGB)
      duration  – seconds
      top_left  – string shown top-left
      top_right – string
    """
    print(f"\n{'='*58}")
    print(f"🎬 RENDERING: {filename}")
    print(f"{'='*58}")

    total_duration = sum(s['duration'] for s in slides_def)
    total_slides   = len(slides_def)
    audio_path     = generate_soundtrack(total_duration, f'aud_{filename}.wav')
    out_path       = os.path.join(OUTPUT_DIR, filename)

    cmd = [
        FFMPEG_EXE, '-y',
        '-f', 'rawvideo', '-vcodec', 'rawvideo',
        '-s', f'{WIDTH}x{HEIGHT}', '-pix_fmt', 'rgb24', '-r', str(FPS),
        '-i', '-',
        '-i', audio_path,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '20',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        out_path
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    DISSOLVE_FRAMES = int(FPS * 0.35)   # 0.35 s cross-dissolve between slides
    prev_img = None

    for s_idx, slide in enumerate(slides_def):
        fps_count = int(FPS * slide['duration'])
        scene_fn  = slide['scene_fn']
        tl        = slide.get('top_left',  'D.WORLD')
        tr        = slide.get('top_right', 'dworld.ink')
        label     = slide.get('label', '')
        total_sl  = total_slides

        # Pre-render keyframes to avoid regenerating per-frame (5 keyframes enough for Ken Burns)
        keyframes = [scene_fn(k/(4)) for k in range(5)]

        for f_idx in range(fps_count):
            progress = f_idx / fps_count
            ease_p   = ease_in_out(progress)

            # Interpolate between nearby keyframes
            kf_t  = ease_p * 4
            kf_i  = min(3, int(kf_t))
            kf_f  = kf_t - kf_i
            frame_img = cross_dissolve(keyframes[kf_i], keyframes[kf_i+1], kf_f) if kf_f > 0.01 else keyframes[kf_i].copy()

            # Cross-dissolve with previous slide at start
            if prev_img is not None and f_idx < DISSOLVE_FRAMES:
                t_dis = f_idx / DISSOLVE_FRAMES
                frame_img = cross_dissolve(prev_img, frame_img, ease_in_out(t_dis))

            # Progress bar + top bar
            frame_img = add_progress_bar(frame_img, s_idx, total_sl, progress)
            frame_img = add_top_bar(frame_img, tl, tr)

            # Optional section label pill
            if label:
                d2 = ImageDraw.Draw(frame_img)
                alpha_lbl = min(255, int(255 * min(1.0, progress*4)))
                f_lbl = pick_font(12)
                bb_lbl = d2.textbbox((0,0), label, font=f_lbl)
                tw_lbl = bb_lbl[2]-bb_lbl[0]
                d2.rounded_rectangle([WIDTH//2-tw_lbl//2-14, 36, WIDTH//2+tw_lbl//2+14, 56],
                                      radius=10, fill=(*C['primary'], alpha_lbl))
                d2.text((WIDTH//2-tw_lbl//2, 38), label, font=f_lbl, fill=(255,255,255,alpha_lbl))

            proc.stdin.write(np.array(frame_img, dtype=np.uint8).tobytes())

        prev_img = keyframes[4]

    proc.stdin.close()
    stderr = proc.stderr.read().decode('utf-8', errors='ignore')
    proc.wait()
    if proc.returncode != 0:
        print(f"❌ ERROR: {stderr[-500:]}")
        sys.exit(1)
    mb = os.path.getsize(out_path)/1024/1024
    print(f"✅ Done: {out_path}  ({mb:.1f} MB)")

# ══════════════════════════════════════════════════════════════════════════════
#  CAMPAIGN DEFINITIONS  — 4 Videos
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':

    # ─── VIDEO 1: Campus Anthem / Overview ─────────────────────────────────────
    render_video('dworld-campus-anthem.mp4', [
        {
            'scene_fn':  scene_home,
            'duration':  4.5,
            'label':     'D.WORLD Campus Marketplace',
            'top_right': 'dworld.ink',
        },
        {
            'scene_fn':  scene_services_page,
            'duration':  4.5,
            'label':     'Browse Verified Campus Experts',
            'top_right': 'dworld.ink/services',
        },
        {
            'scene_fn':  scene_expert_profile,
            'duration':  4.5,
            'label':     'Inspect Lookbooks & Reviews',
            'top_right': 'Expert Profile',
        },
        {
            'scene_fn':  lambda p: scene_cta(p,
                           cta_text='Campus Services. Reimagined.',
                           sub_text='Join thousands of students booking verified campus talent.',
                           btn_label='Explore Specialists  →  dworld.ink'),
            'duration':  5.0,
            'label':     '',
            'top_right': '',
        },
    ])

    # ─── VIDEO 2: How to Find Experts ──────────────────────────────────────────
    render_video('dworld-how-to-find-experts.mp4', [
        {
            'scene_fn':  scene_services_page,
            'duration':  4.0,
            'label':     'STEP 1 · Browse & Filter by Category',
            'top_right': 'dworld.ink/services',
        },
        {
            'scene_fn':  scene_ai_matcher,
            'duration':  4.5,
            'label':     'STEP 2 · AI Match in Seconds',
            'top_right': 'AI Expert Matcher',
        },
        {
            'scene_fn':  scene_expert_profile,
            'duration':  4.0,
            'label':     'STEP 3 · Inspect Profile & Lookbook',
            'top_right': 'Expert Profile',
        },
        {
            'scene_fn':  lambda p: scene_cta(p,
                           cta_text='No More WhatsApp Drama',
                           sub_text='Find your perfect campus specialist in under 60 seconds.',
                           btn_label='Browse Experts  →  dworld.ink/services'),
            'duration':  4.5,
            'label':     '',
            'top_right': '',
        },
    ])

    # ─── VIDEO 3: Booking & Escrow ──────────────────────────────────────────────
    render_video('dworld-booking-and-escrow.mp4', [
        {
            'scene_fn':  lambda p: scene_booking_wizard(p, step=0),
            'duration':  4.5,
            'label':     'STEP 1 · Select Service & Confirm',
            'top_right': 'Booking Wizard',
        },
        {
            'scene_fn':  lambda p: scene_booking_wizard(p, step=1),
            'duration':  4.5,
            'label':     'STEP 2 · Pick Date & Time Slot',
            'top_right': 'Calendar Picker',
        },
        {
            'scene_fn':  lambda p: scene_booking_wizard(p, step=2),
            'duration':  4.5,
            'label':     'STEP 3 · 100% Escrow Payment',
            'top_right': 'Secure Payment',
        },
        {
            'scene_fn':  lambda p: scene_cta(p,
                           cta_text='100% Escrow Protected Bookings',
                           sub_text='Your money is held safely. Released only when you are satisfied.',
                           btn_label='Book Safely  →  dworld.ink'),
            'duration':  5.0,
            'label':     '',
            'top_right': '',
        },
    ])

    # ─── VIDEO 4: Expert Monetize ───────────────────────────────────────────────
    render_video('dworld-monetize-your-skills.mp4', [
        {
            'scene_fn':  scene_expert_dashboard,
            'duration':  4.5,
            'label':     'Your Expert Business Dashboard',
            'top_right': 'Expert Dashboard',
        },
        {
            'scene_fn':  scene_wallet,
            'duration':  4.5,
            'label':     'Wallet & Instant Payouts',
            'top_right': 'Expert Wallet',
        },
        {
            'scene_fn':  scene_services_page,
            'duration':  4.0,
            'label':     'Set Your Prices. Own Your Schedule.',
            'top_right': 'Your Services',
        },
        {
            'scene_fn':  lambda p: scene_cta(p,
                           cta_text='Become a Verified Campus Specialist',
                           sub_text='Create your profile in 2 minutes and start earning today.',
                           btn_label='Register Now  →  dworld.ink/register'),
            'duration':  5.0,
            'label':     '',
            'top_right': '',
        },
    ])

    print('\n🎉 ALL 4 VIDEOS RENDERED WITH REAL D.WORLD UI MOCKUPS!\n')
