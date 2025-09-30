# 🦁 BeastBrowser Build Instructions

## Quick Build Commands

### For Testing/Development:
```bash
npm run electron-dev
```

### For Building Distributable App:

#### Method 1: Using Batch Files (Easiest)
1. **Double-click `build-portable.bat`** - Creates a portable .exe file (no installation needed)
2. **Double-click `build.bat`** - Creates installer + portable versions

#### Method 2: Using NPM Commands
```bash
# Install dependencies
npm install

# Build for Windows (portable + installer)
npm run win

# Build only portable version
npm run build && npx electron-builder --win portable

# Build for other platforms
npm run mac    # macOS
npm run linux  # Linux
```

## Output Files

After building, check the `dist` folder:

- **BeastBrowser-2.0.0.exe** - Portable version (share this for testing)
- **BeastBrowser Setup 2.0.0.exe** - Installer version
- **Latest files** - For auto-updater (if implemented)

## For Testers

1. Download the **BeastBrowser-2.0.0.exe** (portable)
2. Run it directly - no installation needed
3. Test all features:
   - Profile creation and management
   - Proxy configuration
   - RPA script execution
   - Browser automation

## Notes

- The app includes your custom `free.png` logo
- All features should work in the built version
- The portable version is perfect for testing and sharing
- No dependencies needed on target machines

## Troubleshooting

If build fails:
1. Delete `node_modules` folder
2. Run `npm install` again
3. Try the build command again

---
Made with 🦁 by BeastBrowser Team