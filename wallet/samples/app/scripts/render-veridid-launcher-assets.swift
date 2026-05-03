#!/usr/bin/env swift
/**
 Renders VeriDID launcher / app-icon bitmaps from `theme/veridid/assets/veridid-logo.svg` (NSImage on macOS).
 Run from repo root or `wallet/samples/app`:
   swift scripts/render-veridid-launcher-assets.swift
 */
import AppKit

let fm = FileManager.default
let scriptDir = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().path
let appRoot: String = {
    if fm.fileExists(atPath: scriptDir + "/../theme/veridid/assets/veridid-logo.svg") {
        return URL(fileURLWithPath: scriptDir).deletingLastPathComponent().path
    }
    return URL(fileURLWithPath: scriptDir).deletingLastPathComponent().deletingLastPathComponent().path
}()

let svgURL = URL(fileURLWithPath: appRoot + "/theme/veridid/assets/veridid-logo.svg")
guard let logo = NSImage(contentsOf: svgURL) else {
    fputs("Could not load SVG: \(svgURL.path)\n", stderr)
    exit(1)
}

func renderIcon(side: CGFloat, marginFraction: CGFloat) -> NSImage {
    let size = NSSize(width: side, height: side)
    let img = NSImage(size: size)
    img.lockFocus()
    NSColor(srgbRed: 248 / 255, green: 248 / 255, blue: 248 / 255, alpha: 1).setFill()
    NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()

    let inset = side * marginFraction
    let box = side - 2 * inset
    let lw = logo.size.width
    let lh = logo.size.height
    let scale = min(box / lw, box / lh)
    let w = lw * scale
    let h = lh * scale
    let x = (side - w) / 2
    let y = (side - h) / 2
    logo.draw(
        in: NSRect(x: x, y: y, width: w, height: h),
        from: NSRect(origin: .zero, size: logo.size),
        operation: .sourceOver,
        fraction: 1.0
    )
    img.unlockFocus()
    return img
}

func writePNG(_ image: NSImage, path: String) throws {
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "png", code: 1)
    }
    try data.write(to: URL(fileURLWithPath: path))
}

let iosOut = appRoot + "/ios/AriesBifold/Images.xcassets/AppIconVeriDID.appiconset/App-Icon-1024x1024@1x.png"
let iosIcon = renderIcon(side: 1024, marginFraction: 0.19)
try writePNG(iosIcon, path: iosOut)
print("Wrote \(iosOut)")

let mipmaps: [(String, CGFloat)] = [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192),
]
for (folder, px) in mipmaps {
    let out = appRoot + "/android/app/src/main/res/\(folder)/ic_launcher_veridid.png"
    let m = renderIcon(side: px, marginFraction: 0.19)
    try writePNG(m, path: out)
    print("Wrote \(out)")
}
