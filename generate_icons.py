from PIL import Image, ImageDraw
import os

source_path = r"f:\Dan\Documents\Repos\GhostRelay\GhostRelayLogo.png"
output_dir = r"f:\Dan\Documents\Repos\GhostRelay\chrome-extension\icons"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def create_high_quality_icon(target_size):
    filename = f"icon{target_size}.png"
    output_path = os.path.join(output_dir, filename)

    try:
        with Image.open(source_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')

            # Crop to the circular logo area (center square)
            w, h = img.size
            side = min(w, h)
            left = (w - side) // 2
            top = (h - side) // 2
            img = img.crop((left, top, left + side, top + side))

            # High-quality resize to target
            final_icon = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            final_icon.save(output_path)
            print(f"Saved {output_path}")

    except Exception as e:
        print(f"Error processing {target_size}: {e}")

def create_transparent_fab_icon():
    ghost_path = r"f:\Dan\Documents\Repos\GhostRelay\GhostSimple.png"
    size = 128
    filename = "fab_icon.png"
    output_path = os.path.join(output_dir, filename)
    try:
        with Image.open(ghost_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            # Crop to content bounds (remove transparent padding)
            bbox = img.getbbox()
            if bbox:
                img = img.crop(bbox)
            # Pad to square with margin so ghost doesn't touch edges
            w, h = img.size
            side = max(w, h)
            margin = int(side * 0.2)
            canvas = side + margin * 2
            square = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
            square.paste(img, ((canvas - w) // 2, (canvas - h) // 2), img)
            img = square.resize((size, size), Image.Resampling.LANCZOS)
            img.save(output_path)
            print(f"Saved {output_path}")
    except Exception as e:
        print(f"Error processing FAB icon: {e}")

# Generate standard icons
for size in [16, 48, 128]:
    create_high_quality_icon(size)

# Generate transparent FAB icon
create_transparent_fab_icon()
