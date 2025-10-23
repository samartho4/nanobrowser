# Shannon Logo Design

## Concept
The Shannon logo is inspired by Maxwell's demon, a thought experiment in thermodynamics and information theory. The design features:

- **Central Gate**: A purple vertical gate representing the demon's sorting mechanism
- **Particles**: Red particles on the left (unsorted/hot) and blue particles on the right (sorted/cold)
- **Demon Figure**: A friendly, stylized demon character at the bottom with a smile
- **Information Flow**: Purple arrows showing the flow of information through the gate
- **Binary Symbols**: Subtle "01", "10", "11", "00" in corners representing information/entropy
- **Color Scheme**: Deep blues (#1a1a2e background), purples (#8b5cf6, #a78bfa), with red and blue accents

## Files
- `shannon-logo.svg` - Source SVG file (128x128)

## PNG Generation Required
To generate the PNG files from the SVG:

### Option 1: Using Inkscape (command line)
```bash
# Install inkscape if not available
brew install inkscape  # macOS
# or
apt-get install inkscape  # Linux

# Generate 128x128 PNG
inkscape shannon-logo.svg --export-filename=icon-128.png --export-width=128 --export-height=128

# Generate 32x32 PNG
inkscape shannon-logo.svg --export-filename=icon-32.png --export-width=32 --export-height=32
```

### Option 2: Using rsvg-convert
```bash
# Install librsvg
brew install librsvg  # macOS

# Generate PNGs
rsvg-convert -w 128 -h 128 shannon-logo.svg > icon-128.png
rsvg-convert -w 32 -h 32 shannon-logo.svg > icon-32.png
```

### Option 3: Using ImageMagick
```bash
# Install ImageMagick
brew install imagemagick  # macOS

# Generate PNGs
convert -background none -size 128x128 shannon-logo.svg icon-128.png
convert -background none -size 32x32 shannon-logo.svg icon-32.png
```

### Option 4: Online Tools
- Upload `shannon-logo.svg` to https://cloudconvert.com/svg-to-png
- Set dimensions to 128x128 and 32x32
- Download and save as `icon-128.png` and `icon-32.png`

### Option 5: Design Tools
- Open `shannon-logo.svg` in Figma, Sketch, or Adobe Illustrator
- Export as PNG at 128x128 and 32x32 dimensions

## Next Steps
1. Choose one of the methods above to generate PNG files
2. Replace the existing `icon-128.png` and `icon-32.png` files
3. Test the icons in the Chrome extension
4. Adjust colors or design elements if needed
