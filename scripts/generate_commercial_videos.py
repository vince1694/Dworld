import os
import sys
import math
import wave
import urllib.request
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
OUTPUT_DIR = os.path.abspath('client/public/videos')
CACHE_DIR = os.path.abspath('client/public/videos/assets_cache')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

# Resolution & Framerate
WIDTH = 1280
HEIGHT = 720
FPS = 24

# Typography fonts
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
if not os.path.exists(FONT_BOLD):
    FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"

def get_font(size):
    try:
        return ImageFont.truetype(FONT_BOLD, size)
    except:
        return ImageFont.load_default()

FONT_BADGE = get_font(20)
FONT_TITLE = get_font(42)
FONT_SUBTITLE = get_font(23)
FONT_CTA = get_font(26)
FONT_LOGO = get_font(52)

def download_image(url, filename):
    dest = os.path.join(CACHE_DIR, filename)
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        return dest
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, timeout=15) as resp, open(dest, 'wb') as f:
        f.write(resp.read())
    return dest

def create_gradient_overlay():
    """Create a dark cinematic vignette and lower-third gradient for crisp text readability."""
    grad = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(grad)
    
    # Top subtle header vignette
    for y in range(0, 100):
        alpha = int(140 * (1.0 - y / 100.0))
        draw.line([(0, y), (WIDTH, y)], fill=(5, 8, 15, alpha))
        
    # Bottom text backdrop gradient (starts smoothly around y=360 to 720)
    for y in range(320, HEIGHT):
        factor = (y - 320) / (HEIGHT - 320)
        # Smooth quadratic curve for cinematic falloff
        alpha = int(245 * (factor ** 1.35))
        draw.line([(0, y), (WIDTH, y)], fill=(8, 11, 20, alpha))
        
    return grad

GRADIENT_OVERLAY = create_gradient_overlay()

def render_frame(bg_img, progress, slide_idx, total_slides, badge_text, badge_color, title, subtitle, is_cta=False, cta_btn_text=''):
    """Renders a single video frame with Ken Burns zoom, smooth badge, and typography."""
    # Ken Burns effect: subtle zoom from 1.0 to 1.05
    scale = 1.0 + (0.05 * progress)
    w_crop = int(WIDTH / scale)
    h_crop = int(HEIGHT / scale)
    x1 = (WIDTH - w_crop) // 2
    y1 = (HEIGHT - h_crop) // 2
    
    frame = bg_img.crop((x1, y1, x1 + w_crop, y1 + h_crop)).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    frame.paste(GRADIENT_OVERLAY, (0, 0), GRADIENT_OVERLAY)
    draw = ImageDraw.Draw(frame)

    # Top Navigation / Progress Indicator
    bar_width = 80
    gap = 12
    total_w = (total_slides * bar_width) + ((total_slides - 1) * gap)
    start_x = (WIDTH - total_w) // 2
    top_y = 30
    
    for i in range(total_slides):
        bx = start_x + (i * (bar_width + gap))
        if i < slide_idx:
            draw.rounded_rectangle([bx, top_y, bx + bar_width, top_y + 4], radius=2, fill=(239, 68, 68, 240))
        elif i == slide_idx:
            # Active segment filling up
            draw.rounded_rectangle([bx, top_y, bx + bar_width, top_y + 4], radius=2, fill=(70, 75, 90, 180))
            fill_w = int(bar_width * progress)
            if fill_w > 0:
                draw.rounded_rectangle([bx, top_y, bx + fill_w, top_y + 4], radius=2, fill=(239, 68, 68, 255))
        else:
            draw.rounded_rectangle([bx, top_y, bx + bar_width, top_y + 4], radius=2, fill=(60, 65, 80, 140))

    # Top Brand Tag
    draw.text((50, 24), "D.WORLD", font=FONT_BADGE, fill=(255, 255, 255, 220))
    draw.text((WIDTH - 150, 24), "CAMPUS HUB", font=FONT_BADGE, fill=(239, 68, 68, 220))

    if not is_cta:
        # Badge Pill
        badge_padding_x = 16
        badge_padding_y = 6
        bbox = draw.textbbox((0, 0), badge_text, font=FONT_BADGE)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        badge_x = 60
        badge_y = HEIGHT - 220
        draw.rounded_rectangle(
            [badge_x, badge_y, badge_x + tw + (badge_padding_x * 2), badge_y + th + (badge_padding_y * 2)],
            radius=12,
            fill=badge_color
        )
        draw.text((badge_x + badge_padding_x, badge_y + badge_padding_y - 2), badge_text, font=FONT_BADGE, fill=(255, 255, 255))

        # Title with shadow
        title_y = badge_y + th + (badge_padding_y * 2) + 12
        # Drop shadow
        draw.text((62, title_y + 2), title, font=FONT_TITLE, fill=(0, 0, 0, 200))
        draw.text((60, title_y), title, font=FONT_TITLE, fill=(255, 255, 255, 255))

        # Subtitle with shadow
        sub_y = title_y + 54
        draw.text((61, sub_y + 1), subtitle, font=FONT_SUBTITLE, fill=(0, 0, 0, 180))
        draw.text((60, sub_y), subtitle, font=FONT_SUBTITLE, fill=(209, 213, 219, 255))
    else:
        # Cinematic Outro CTA Slide
        center_y = 230
        logo_text = "D.WORLD"
        l_bbox = draw.textbbox((0, 0), logo_text, font=FONT_LOGO)
        lw = l_bbox[2] - l_bbox[0]
        draw.text(((WIDTH - lw) // 2 + 3, center_y + 3), logo_text, font=FONT_LOGO, fill=(0, 0, 0, 220))
        draw.text(((WIDTH - lw) // 2, center_y), logo_text, font=FONT_LOGO, fill=(239, 68, 68, 255))

        # Title
        t_bbox = draw.textbbox((0, 0), title, font=FONT_TITLE)
        tw = t_bbox[2] - t_bbox[0]
        draw.text(((WIDTH - tw) // 2 + 2, center_y + 82), title, font=FONT_TITLE, fill=(0, 0, 0, 200))
        draw.text(((WIDTH - tw) // 2, center_y + 80), title, font=FONT_TITLE, fill=(255, 255, 255, 255))

        # Subtitle
        s_bbox = draw.textbbox((0, 0), subtitle, font=FONT_SUBTITLE)
        sw = s_bbox[2] - s_bbox[0]
        draw.text(((WIDTH - sw) // 2 + 1, center_y + 141), subtitle, font=FONT_SUBTITLE, fill=(0, 0, 0, 180))
        draw.text(((WIDTH - sw) // 2, center_y + 140), subtitle, font=FONT_SUBTITLE, fill=(209, 213, 219, 255))

        # Call-To-Action Button Pill
        btn_w = 420
        btn_h = 60
        btn_x = (WIDTH - btn_w) // 2
        btn_y = center_y + 200
        
        # Glow border
        draw.rounded_rectangle([btn_x - 3, btn_y - 3, btn_x + btn_w + 3, btn_y + btn_h + 3], radius=18, fill=(239, 68, 68, 90))
        draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=16, fill=(220, 38, 38, 255))
        
        c_bbox = draw.textbbox((0, 0), cta_btn_text, font=FONT_CTA)
        cw = c_bbox[2] - c_bbox[0]
        ch = c_bbox[3] - c_bbox[1]
        draw.text((btn_x + (btn_w - cw) // 2, btn_y + (btn_h - ch) // 2 - 4), cta_btn_text, font=FONT_CTA, fill=(255, 255, 255))

    return np.array(frame)

def generate_soundtrack(duration_sec, filename):
    """Generates an upbeat, modern ambient acoustic/electronic synth chord track."""
    sr = 44100
    total_samples = int(sr * duration_sec)
    t = np.linspace(0, duration_sec, total_samples, endpoint=False)
    
    # Chord progression: Am -> F -> C -> G
    # Notes in Hz: A3 (220), C4 (261.63), E4 (329.63), F3 (174.61), G3 (196.0)
    chords = [
        [220.0, 261.63, 329.63, 440.0],  # Am
        [174.61, 220.0, 261.63, 349.23], # F
        [130.81, 196.0, 261.63, 329.63], # C
        [196.0, 246.94, 293.66, 392.0]   # G
    ]
    chord_len = duration_sec / 4.0
    
    audio = np.zeros(total_samples, dtype=np.float32)
    
    for i in range(total_samples):
        sec = t[i]
        c_idx = int(sec / chord_len) % len(chords)
        current_chord = chords[c_idx]
        
        # Soft synth pad
        val = 0.0
        for freq in current_chord:
            val += 0.08 * math.sin(2.0 * math.pi * freq * sec)
            val += 0.03 * math.sin(4.0 * math.pi * freq * sec) # harmonic overtone
            
        # Subtle rhythmic kick/pulse every 0.75 seconds
        pulse_phase = (sec % 0.75) / 0.75
        pulse = math.exp(-pulse_phase * 12.0) * 0.25 * math.sin(2.0 * math.pi * 55.0 * pulse_phase)
        
        # Hi-hat tick every 0.375s
        tick_phase = (sec % 0.375) / 0.375
        noise = (np.random.rand() * 2.0 - 1.0) * math.exp(-tick_phase * 25.0) * 0.04
        
        audio[i] = val + pulse + noise
        
    # Fade in / Fade out
    fade_len = int(sr * 0.8)
    for i in range(fade_len):
        factor = i / float(fade_len)
        audio[i] *= factor
        audio[total_samples - 1 - i] *= factor
        
    audio = np.clip(audio, -0.95, 0.95)
    audio_int16 = (audio * 32767).astype(np.int16)
    
    dest = os.path.join(CACHE_DIR, filename)
    with wave.open(dest, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(audio_int16.tobytes())
    return dest

def render_commercial_video(config):
    video_name = config['filename']
    print(f"\n==========================================")
    print(f"🎬 RENDERING COMMERCIAL: {video_name}")
    print(f"Title: {config['title']}")
    print(f"==========================================")
    
    slides = config['slides']
    total_slides = len(slides)
    slide_duration = 3.6  # seconds per slide
    total_duration = total_slides * slide_duration
    
    # 1. Prepare Slide Background Images
    prepared_slides = []
    for s_idx, slide in enumerate(slides):
        img_path = download_image(slide['img_url'], f"raw_img_{video_name}_{s_idx}.jpg")
        raw = Image.open(img_path).convert('RGB')
        
        # Aspect fill to 1280x720
        src_w, src_h = raw.size
        aspect_target = WIDTH / HEIGHT
        aspect_src = src_w / src_h
        
        if aspect_src > aspect_target:
            # Source is wider, crop horizontal sides
            new_w = int(src_h * aspect_target)
            offset = (src_w - new_w) // 2
            raw_cropped = raw.crop((offset, 0, offset + new_w, src_h))
        else:
            # Source is taller, crop vertical top/bottom
            new_h = int(src_w / aspect_target)
            offset = (src_h - new_h) // 2
            raw_cropped = raw.crop((0, offset, src_w, offset + new_h))
            
        bg_scaled = raw_cropped.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        prepared_slides.append({
            'bg': bg_scaled,
            'badge': slide.get('badge', 'D.WORLD'),
            'badge_color': slide.get('badge_color', (239, 68, 68)),
            'title': slide['title'],
            'subtitle': slide['subtitle'],
            'is_cta': slide.get('is_cta', False),
            'cta_btn': slide.get('cta_btn', 'Explore D.WORLD')
        })
        
    # 2. Synthesize Audio
    audio_path = generate_soundtrack(total_duration, f"soundtrack_{video_name}.wav")
    
    # 3. Stream frames to ffmpeg stdin pipe
    final_mp4_path = os.path.join(OUTPUT_DIR, video_name)
    
    cmd = [
        FFMPEG_EXE,
        '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f"{WIDTH}x{HEIGHT}",
        '-pix_fmt', 'rgb24',
        '-r', str(FPS),
        '-i', '-',
        '-i', audio_path,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        final_mp4_path
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    
    frames_per_slide = int(FPS * slide_duration)
    for s_idx, slide in enumerate(prepared_slides):
        for f_idx in range(frames_per_slide):
            progress = f_idx / float(frames_per_slide)
            frame_arr = render_frame(
                bg_img=slide['bg'],
                progress=progress,
                slide_idx=s_idx,
                total_slides=total_slides,
                badge_text=slide['badge'],
                badge_color=slide['badge_color'],
                title=slide['title'],
                subtitle=slide['subtitle'],
                is_cta=slide['is_cta'],
                cta_btn_text=slide['cta_btn']
            )
            proc.stdin.write(frame_arr.tobytes())
            
    proc.stdin.close()
    stderr = proc.stderr.read().decode('utf-8', errors='ignore')
    proc.wait()
    
    if proc.returncode != 0:
        print(f"❌ Error rendering {video_name}: {stderr[-400:]}")
        sys.exit(1)
        
    file_size_mb = os.path.getsize(final_mp4_path) / (1024 * 1024)
    print(f"✅ SUCCESSFULLY GENERATED: {final_mp4_path} ({file_size_mb:.2f} MB)")
    return final_mp4_path

# =========================================================================
# VIDEO CAMPAIGNS CONFIGURATION
# (Real humans, high resolution, zero cartoon/AI look)
# =========================================================================
CAMPAIGNS = [
    {
        'filename': 'dworld-campus-anthem.mp4',
        'title': 'D.WORLD — Campus Services Reimagined',
        'slides': [
            {
                'img_url': 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1280&q=80',
                'badge': 'CAMPUS DISCOVERY',
                'badge_color': (239, 68, 68),
                'title': 'Tired of Searching for Campus Talent?',
                'subtitle': 'Barbers, Braiders, Lash Techs & Creatives — right inside your campus.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1280&q=80',
                'badge': 'VERIFIED SPECIALISTS',
                'badge_color': (37, 99, 235),
                'title': 'Certified Student Craftsmen',
                'subtitle': 'Browse high-res lookbooks, verified student ratings & authentic reviews.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1280&q=80',
                'badge': 'CAMPUS CONVENIENCE',
                'badge_color': (16, 185, 129),
                'title': 'Hostel Delivery or Private Studio',
                'subtitle': 'Get styled in your hall of residence or visit nearby student studios.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1280&q=80',
                'is_cta': True,
                'title': 'Level Up Your Campus Lifestyle',
                'subtitle': 'Join thousands of students booking verified campus talent every day.',
                'cta_btn': 'Explore Specialists • dworld.ink'
            }
        ]
    },
    {
        'filename': 'dworld-how-to-find-experts.mp4',
        'title': 'How to Find & Vet Campus Specialists in 60s',
        'slides': [
            {
                'img_url': 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1280&q=80',
                'badge': 'STEP 1: EXPLORE',
                'badge_color': (239, 68, 68),
                'title': 'Filter by University & Category',
                'subtitle': 'Find available barbers, braiders, lash artists & tutors at your campus.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1280&q=80',
                'badge': 'STEP 2: LOOKBOOK & REVIEWS',
                'badge_color': (139, 92, 246),
                'title': 'Inspect Genuine Lookbooks',
                'subtitle': 'View unedited client photos & reviews from fellow verified students.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1280&q=80',
                'badge': 'STEP 3: DIRECT CHAT',
                'badge_color': (16, 185, 129),
                'title': 'Message Before You Book',
                'subtitle': 'Discuss hairstyles, confirm availability, and get instant answers.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1280&q=80',
                'is_cta': True,
                'title': 'No More WhatsApp Drama',
                'subtitle': 'Find your next favorite specialist in under 60 seconds.',
                'cta_btn': 'Browse Experts • dworld.ink/services'
            }
        ]
    },
    {
        'filename': 'dworld-booking-and-escrow.mp4',
        'title': 'The Booking Process & 100% Escrow Protection',
        'slides': [
            {
                'img_url': 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1280&q=80',
                'badge': 'STEP 1: INSTANT RESERVATION',
                'badge_color': (37, 99, 235),
                'title': 'Select Service & Pick Time Slot',
                'subtitle': 'Real-time calendar scheduling. No more awkward back-and-forth.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1280&q=80',
                'badge': 'STEP 2: 100% SAFE ESCROW',
                'badge_color': (16, 185, 129),
                'title': 'Your Money is 100% Protected',
                'subtitle': 'Funds are held in secure escrow. The specialist is NOT paid upfront.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1280&q=80',
                'badge': 'STEP 3: SATISFACTION RELEASE',
                'badge_color': (239, 68, 68),
                'title': 'Funds Released Upon Satisfaction',
                'subtitle': 'Payment only unlocks after completion. Automatic refund if canceled!'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1280&q=80',
                'is_cta': True,
                'title': 'Guaranteed Buyer Protection',
                'subtitle': 'Campus appointments backed by 100% transparent Escrow.',
                'cta_btn': 'Try Safe Booking • dworld.ink'
            }
        ]
    },
    {
        'filename': 'dworld-monetize-your-skills.mp4',
        'title': 'Monetize Your Skills — Earn On Campus With Zero Rent',
        'slides': [
            {
                'img_url': 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1280&q=80',
                'badge': 'CAMPUS CREATORS',
                'badge_color': (139, 92, 246),
                'title': 'Turn Your Talent Into Income',
                'subtitle': 'Barbers, braiders, lash artists, photographers & campus tutors.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1280&q=80',
                'badge': 'ZERO SALON RENT',
                'badge_color': (239, 68, 68),
                'title': 'Work From Your Hostel Room',
                'subtitle': 'Set your own prices, choose your own hours & grow your client list.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1280&q=80',
                'badge': 'INSTANT WALLET PAYOUTS',
                'badge_color': (16, 185, 129),
                'title': 'Guaranteed Upfront Client Payments',
                'subtitle': 'No chasing debts. Payouts arrive in your wallet and bank instantly.'
            },
            {
                'img_url': 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1280&q=80',
                'is_cta': True,
                'title': 'Become a Verified Specialist',
                'subtitle': 'Create your specialist profile in 2 minutes and start earning.',
                'cta_btn': 'Register Now • dworld.ink/register'
            }
        ]
    }
]

if __name__ == '__main__':
    for c in CAMPAIGNS:
        render_commercial_video(c)
    print("\n🎉 ALL 4 COMMERCIAL VIDEOS RENDERED TO client/public/videos/ SUCCESSFULLY!\n")
