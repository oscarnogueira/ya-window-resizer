{
  "targets": [
    {
      "target_name": "window",
      "sources": [ "native/src/window.mm" ],
      "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "OTHER_CFLAGS": [ "-ObjC++" ],
        "MACOSX_DEPLOYMENT_TARGET": "11.0",
        "ARCHS": [ "x86_64", "arm64" ],
        "ONLY_ACTIVE_ARCH": "NO"
      },
      "link_settings": {
        "libraries": [
          "-framework AppKit",
          "-framework ApplicationServices",
          "-framework CoreGraphics"
        ]
      }
    }
  ]
}
