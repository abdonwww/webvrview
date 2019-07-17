export default class Util {
  static isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  static getExtension(url: string) {
    return url
      .split(".")
      .pop()
      .split("?")[0];
  }
}
