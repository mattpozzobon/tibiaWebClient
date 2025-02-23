export default class RGBA {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number) {
    /*
     * Class RGBA
     * Container for colors
     */
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  copy(): RGBA {
    /*
     * Function RGBA.copy
     * Returns a copy (new memory) of the current RGBA instance
     */
    return new RGBA(this.r, this.g, this.b, this.a);
  }

  toString(): string {
    /*
     * Function RGBA.toString
     * Returns HTML/CSS string representation of the color
     */
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 0xff})`;
  }

  interpolate(color: RGBA, fraction: number): RGBA {
    /*
     * Function RGBA.interpolate
     * Interpolates self to the requested color by a fraction
     */
    return new RGBA(
      Math.round(this.r + fraction * (color.r - this.r)),
      Math.round(this.g + fraction * (color.g - this.g)),
      Math.round(this.b + fraction * (color.b - this.b)),
      Math.round(this.a + fraction * (color.a - this.a))
    );
  }
}
