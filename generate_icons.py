from PIL import Image, ImageDraw
import os

source_path = r"f:\Dan\Documents\Repos\GhostRelay\GhostRelayLogo.png"
output_dir = r"f:\Dan\Documents\Repos\GhostRelay\chrome-extension\icons"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def create_high_quality_icon(target_size):
    filename = f"icon{target_size}.png"
    output_path = os.path.join(output_dir, filename)
    
    # 1. Supersample factor (e.g. 4x or 8x for small icons)
    scale = 8 if target_size < 64 else 4
    canvas_size = target_size * scale
    
    try:
        with Image.open(source_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 2. Create high-res canvas with transparent background
            bg = Image.new("RGBA", (canvas_size, canvas_size), (0,0,0,0))
            draw = ImageDraw.Draw(bg)
            
            # 3. Draw white circle (high-res) - slightly smaller than full canvas to avoid edge cut-off
            margin = int(canvas_size * 0.02) # 2% margin
            draw.ellipse((margin, margin, canvas_size-1-margin, canvas_size-1-margin), fill="white")
            
            # 4. Resize logo (high-res) - fit within e.g. 85% of the circle
            # This is key: make the logo as large as possible without touching edges
            icon_max_dim = int(canvas_size * 0.85)
            
            # Resize source to this high-res size first
            img_high_res = img.resize((icon_max_dim, icon_max_dim), Image.Resampling.LANCZOS)
            
            # 5. Center and paste
            offset = (canvas_size - icon_max_dim) // 2
            bg.paste(img_high_res, (offset, offset), img_high_res)
            
            # 6. Downsample to target size with high quality filter
            final_icon = bg.resize((target_size, target_size), Image.Resampling.LANCZOS)
            
            final_icon.save(output_path)
            print(f"Saved {output_path}")
            
    except Exception as e:
        print(f"Error processing {target_size}: {e}")

def create_transparent_fab_icon():
    # Large transparent version for FAB - just clean resize
    size = 128 
    filename = "fab_icon.png"
    output_path = os.path.join(output_dir, filename)
    try:
        with Image.open(source_path) as img:
            img = img.resize((size, size), Image.Resampling.LANCZOS)
            img.save(output_path)
            print(f"Saved {output_path}")
    except Exception as e:
        print(f"Error processing FAB icon: {e}")

# Generate standard icons
for size in [16, 48, 128]:
    create_high_quality_icon(size)

# Generate transparent FAB icon
create_transparent_fab_icon()
