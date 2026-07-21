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
        "OTHER_CFLAGS": [ "-ObjC++", "-arch", "x86_64", "-arch", "arm64" ],
        "OTHER_LDFLAGS": [ "-arch", "x86_64", "-arch", "arm64" ],
        "MACOSX_DEPLOYMENT_TARGET": "11.0"
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
