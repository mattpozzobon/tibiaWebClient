// src/renderer/light-renderer.ts
import { Container, Filter, GlProgram, Sprite, Texture } from 'pixi.js';
import Interface from '../ui/interface';

const MAX_LIGHTS = 64;

const VERT = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const FRAG = `
precision mediump float;

in vec2 vTextureCoord;

uniform vec2  uLocalSize;
uniform float uAmbient;
uniform int   uLightCount;
uniform float uSoftness;
uniform vec3  uLights[${MAX_LIGHTS}];

void main(void)
{
    vec2 frag = vTextureCoord * uLocalSize;
    float light = 0.0;

    for (int i = 0; i < ${MAX_LIGHTS}; ++i)
    {
        if (i >= uLightCount) break;
        vec3 L = uLights[i];
        float d = distance(frag, L.xy);
        float inner = max(L.z - uSoftness, 0.0);
        float t = 1.0 - smoothstep(inner, L.z, d);
        light = max(light, t);
    }

    float alpha = clamp(uAmbient * (1.0 - light), 0.0, 1.0);
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}
`;

export default class LightRenderer {
  public readonly layer: Container;

  private overlay: Sprite;
  private filter: Filter;
  private lights = new Float32Array(MAX_LIGHTS * 3);
  private count = 0;

  constructor() {
    this.layer = new Container();
    this.overlay = new Sprite(Texture.WHITE);
    this.layer.addChild(this.overlay);

    this.filter = new Filter({
      glProgram: new GlProgram({ vertex: VERT, fragment: FRAG }),
      resources: {
        uniforms: {
          uLocalSize:  { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uAmbient:    { value: 0.8,                      type: 'f32' },
          uSoftness:   { value: 24.0,                     type: 'f32' },
          uLightCount: { value: 0,                        type: 'i32' },
          uLights:     { value: this.lights,              type: 'vec3<f32>', size: MAX_LIGHTS },
        },
      },
    });

    this.overlay.filters = [this.filter];
  }

  public begin(width: number, height: number, ambientAlpha = 0.8) {
    this.overlay.position.set(0, 0);
    this.overlay.width = width;
    this.overlay.height = height;

    this.count = 0;

    const u = this.filter.resources.uniforms.uniforms;
    (u.uLocalSize as Float32Array)[0] = width;
    (u.uLocalSize as Float32Array)[1] = height;
    u.uAmbient = ambientAlpha;
    u.uLightCount = 0;
  }

  public addLightBubble(tileX: number, tileY: number, sizeTiles: number, _colorByte: number) {
    if (this.count >= MAX_LIGHTS) return;

    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const r  = Math.max(1, sizeTiles * Interface.TILE_SIZE);

    const i = this.count * 3;
    this.lights[i + 0] = cx;
    this.lights[i + 1] = cy;
    this.lights[i + 2] = r;
    this.count++;
  }

  public end() {
    this.filter.resources.uniforms.uniforms.uLightCount = this.count;
  }

  public setSoftness(px: number) {
    this.filter.resources.uniforms.uniforms.uSoftness = Math.max(0, px);
  }
}
