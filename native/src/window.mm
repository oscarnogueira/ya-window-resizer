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

// Returns [{ frame:{x,y,w,h}, visibleFrame:{x,y,w,h} }] in TOP-LEFT origin.
Napi::Value GetScreens(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  NSArray<NSScreen*>* screens = [NSScreen screens];

  // Quartz/AX top-left space is anchored to the PRIMARY display's top-left.
  CGFloat primaryHeight = screens.count > 0 ? screens[0].frame.size.height : 0;

  auto toTopLeft = [&](NSRect r) {
    Napi::Object o = Napi::Object::New(env);
    o.Set("x", Napi::Number::New(env, r.origin.x));
    o.Set("y", Napi::Number::New(env, primaryHeight - (r.origin.y + r.size.height)));
    o.Set("w", Napi::Number::New(env, r.size.width));
    o.Set("h", Napi::Number::New(env, r.size.height));
    return o;
  };

  Napi::Array arr = Napi::Array::New(env, screens.count);
  for (NSUInteger i = 0; i < screens.count; i++) {
    NSScreen* s = screens[i];
    Napi::Object o = Napi::Object::New(env);
    o.Set("frame", toTopLeft(s.frame));
    o.Set("visibleFrame", toTopLeft(s.visibleFrame));
    arr.Set(i, o);
  }
  return arr;
}

// setWindowFrame(pid, x, y, w, h) -> bool. Applies to the focused window of pid.
Napi::Boolean SetWindowFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!AXTrusted() || info.Length() < 5) return Napi::Boolean::New(env, false);

  pid_t pid = (pid_t)info[0].As<Napi::Number>().Int32Value();
  CGPoint pos = CGPointMake(info[1].As<Napi::Number>().DoubleValue(),
                            info[2].As<Napi::Number>().DoubleValue());
  CGSize size = CGSizeMake(info[3].As<Napi::Number>().DoubleValue(),
                           info[4].As<Napi::Number>().DoubleValue());

  AXUIElementRef appEl = AXUIElementCreateApplication(pid);
  if (appEl == NULL) return Napi::Boolean::New(env, false);

  AXUIElementRef window = NULL;
  if (AXUIElementCopyAttributeValue(appEl, kAXFocusedWindowAttribute,
                                    (CFTypeRef*)&window) != kAXErrorSuccess || window == NULL) {
    CFRelease(appEl);
    return Napi::Boolean::New(env, false);
  }

  AXValueRef sizeVal = AXValueCreate((AXValueType)kAXValueCGSizeType, &size);
  AXValueRef posVal = AXValueCreate((AXValueType)kAXValueCGPointType, &pos);
  if (sizeVal) AXUIElementSetAttributeValue(window, kAXSizeAttribute, sizeVal);
  if (posVal) AXUIElementSetAttributeValue(window, kAXPositionAttribute, posVal);
  if (sizeVal) AXUIElementSetAttributeValue(window, kAXSizeAttribute, sizeVal);
  if (sizeVal) CFRelease(sizeVal);
  if (posVal) CFRelease(posVal);
  CFRelease(window);
  CFRelease(appEl);
  return Napi::Boolean::New(env, true);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isTrusted", Napi::Function::New(env, IsTrusted));
  exports.Set("getFrontmostWindow", Napi::Function::New(env, GetFrontmostWindow));
  exports.Set("getScreens", Napi::Function::New(env, GetScreens));
  exports.Set("setWindowFrame", Napi::Function::New(env, SetWindowFrame));
  return exports;
}

NODE_API_MODULE(window, Init)
