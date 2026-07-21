#include <napi.h>
#include <string>
#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>
#import <CoreGraphics/CoreGraphics.h>

static bool AXTrusted() {
  return AXIsProcessTrusted();
}

Napi::Boolean IsTrusted(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), AXTrusted());
}

// Frontmost on-screen normal window's owner pid (and name), via CGWindowList.
// This is a live query to the window server — no AppKit run loop needed — and
// does not require Screen Recording permission (only window *titles* do).
// The name is copied into a std::string WHILE the array (which owns it) is
// still alive; storing the NSString* and using it after CFRelease would be a
// use-after-free under manual reference counting.
static pid_t FrontmostCGPid(std::string& outName) {
  pid_t result = 0;
  CFArrayRef list = CGWindowListCopyWindowInfo(
      kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
  if (list) {
    CFIndex count = CFArrayGetCount(list);
    for (CFIndex i = 0; i < count; i++) {
      NSDictionary* w = (__bridge NSDictionary*)CFArrayGetValueAtIndex(list, i);
      NSNumber* layer = w[(id)kCGWindowLayer];
      if (layer != nil && layer.intValue != 0) continue; // normal app windows only
      NSNumber* pidNum = w[(id)kCGWindowOwnerPID];
      if (pidNum == nil) continue;
      result = (pid_t)pidNum.intValue;
      NSString* nm = w[(id)kCGWindowOwnerName];
      if (nm != nil && nm.UTF8String != NULL) outName = std::string(nm.UTF8String);
      break;
    }
    CFRelease(list);
  }
  return result;
}

// Localized app name for a pid, copied into a std::string (safe past pool drain).
static std::string AppNameForPid(pid_t pid) {
  NSRunningApplication* app = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
  if (app != nil && app.localizedName != nil && app.localizedName.UTF8String != NULL) {
    return std::string(app.localizedName.UTF8String);
  }
  return std::string();
}

// Returns { ok, x, y, w, h, pid, app } for the focused window of the app the
// user is currently interacting with. `ok=false` means no usable window was
// found. Coordinates are top-left origin (AX native).
//
// The target app is resolved from CGWindowList (the frontmost on-screen window's
// owner) — a live window-server query. We deliberately do NOT use
// NSWorkspace.frontmostApplication: it is updated via AppKit activation
// notifications that require a run loop the Node plugin never pumps, so it
// reports a STALE app (verified: it named the previously-active app while a
// different one was focused). NSWorkspace is kept only as a last-resort fallback
// if CGWindowList yields nothing.
Napi::Value GetFrontmostWindow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Object out = Napi::Object::New(env);
  out.Set("ok", Napi::Boolean::New(env, false));
  if (!AXTrusted()) return out;

  // Gather Cocoa/CF values inside an autorelease pool; copy anything we keep
  // into plain C++ types so nothing dangles once the pool drains.
  std::string appName;
  pid_t pid = 0;
  @autoreleasepool {
    pid = FrontmostCGPid(appName);
    if (pid == 0) {
      NSRunningApplication* ws = [[NSWorkspace sharedWorkspace] frontmostApplication];
      if (ws != nil) {
        pid = ws.processIdentifier;
        if (ws.localizedName != nil && ws.localizedName.UTF8String != NULL) {
          appName = std::string(ws.localizedName.UTF8String);
        }
      }
    }
  }
  if (pid == 0) return out;

  AXUIElementRef appEl = AXUIElementCreateApplication(pid);
  if (appEl == NULL) return out;

  AXUIElementRef window = NULL;
  AXError winErr = AXUIElementCopyAttributeValue(appEl, kAXFocusedWindowAttribute, (CFTypeRef*)&window);
  if (winErr != kAXErrorSuccess || window == NULL) {
    CFRelease(appEl);
    return out;
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

  if (appName.empty()) {
    @autoreleasepool { appName = AppNameForPid(pid); }
  }

  out.Set("ok", Napi::Boolean::New(env, true));
  out.Set("x", Napi::Number::New(env, pos.x));
  out.Set("y", Napi::Number::New(env, pos.y));
  out.Set("w", Napi::Number::New(env, size.width));
  out.Set("h", Napi::Number::New(env, size.height));
  out.Set("pid", Napi::Number::New(env, pid));
  out.Set("app", Napi::String::New(env, appName));
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
