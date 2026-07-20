#include <napi.h>
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>

static bool AXTrusted() {
  return AXIsProcessTrusted();
}

Napi::Boolean IsTrusted(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), AXTrusted());
}

// Returns { x, y, w, h, pid } for the focused window of the frontmost app,
// or null if unavailable. Coordinates are top-left origin (AX native).
Napi::Value GetFrontmostWindow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!AXTrusted()) return env.Null();

  NSRunningApplication* app = [[NSWorkspace sharedWorkspace] frontmostApplication];
  if (app == nil) return env.Null();
  pid_t pid = app.processIdentifier;

  AXUIElementRef appEl = AXUIElementCreateApplication(pid);
  if (appEl == NULL) return env.Null();

  AXUIElementRef window = NULL;
  AXError err = AXUIElementCopyAttributeValue(
      appEl, kAXFocusedWindowAttribute, (CFTypeRef*)&window);
  if (err != kAXErrorSuccess || window == NULL) {
    CFRelease(appEl);
    return env.Null();
  }

  CFTypeRef posVal = NULL;
  CFTypeRef sizeVal = NULL;
  AXUIElementCopyAttributeValue(window, kAXPositionAttribute, &posVal);
  AXUIElementCopyAttributeValue(window, kAXSizeAttribute, &sizeVal);

  CGPoint pos = CGPointZero;
  CGSize size = CGSizeZero;
  if (posVal) { AXValueGetValue((AXValueRef)posVal, (AXValueType)kAXValueCGPointType, &pos); CFRelease(posVal); }
  if (sizeVal) { AXValueGetValue((AXValueRef)sizeVal, (AXValueType)kAXValueCGSizeType, &size); CFRelease(sizeVal); }

  CFRelease(window);
  CFRelease(appEl);

  Napi::Object out = Napi::Object::New(env);
  out.Set("x", Napi::Number::New(env, pos.x));
  out.Set("y", Napi::Number::New(env, pos.y));
  out.Set("w", Napi::Number::New(env, size.width));
  out.Set("h", Napi::Number::New(env, size.height));
  out.Set("pid", Napi::Number::New(env, pid));
  return out;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isTrusted", Napi::Function::New(env, IsTrusted));
  exports.Set("getFrontmostWindow", Napi::Function::New(env, GetFrontmostWindow));
  return exports;
}

NODE_API_MODULE(window, Init)
