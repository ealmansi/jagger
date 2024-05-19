import { Jagger } from "@ealmansi/jagger";

export enum Color {
  Red,
  Green,
  Blue,
}

export class Module extends Jagger.Module {
  provideBoolean(): boolean {
    return true;
  }
  provideNumber(positive: boolean): number {
    return positive ? 42 : -42;
  }
  provideBigInt(num: number): bigint {
    return BigInt(num);
  }
  provideString(): string {
    return "someString";
  }
  provideSymbol(str: string): symbol {
    return Symbol(str);
  }
  provideArray(): number[] {
    return [1, 2, 3];
  }
  provideTuple(x: boolean, y: number, z: string): [boolean, number, string] {
    return [x, y, z];
  }
  provideEnum(): Color {
    return Color.Red;
  }
  provideUnknown(x: any): unknown {
    return x;
  }
  provideAny(): any {
    return {};
  }
  provideVoid(): void {}
  provideNull(): null {
    return null;
  }
  provideUndefined(): undefined {
    return undefined;
  }
  provideNever(): never {
    throw new Error();
  }
  provideObject(obj: { color: Color; x: number; y: number }): object {
    return obj;
  }
  provideObjectShape(color: Color): { color: Color; x: number; y: number } {
    return {
      color,
      x: 100,
      y: 200,
    };
  }
  provideRecord(): Record<string, number> {
    return {
      ["a"]: 1,
      ["b"]: 2,
    };
  }
  provideMap(): Map<string, number> {
    return new Map().set("a", 1);
  }
  // provideSet(): Set<string> {
  //   return new Set(["a", "b", "c"]);
  // }
}

export abstract class Component extends Jagger.Component {
  static module: Module;
  abstract getBoolean(): boolean;
  abstract getNumber(): number;
  abstract getBigInt(): bigint;
  abstract getString(): string;
  abstract getSymbol(): symbol;
  abstract getArray(): number[];
  abstract getTuple(): [boolean, number, string];
  abstract getEnum(): Color;
  abstract getUnknown(): unknown;
  abstract getAny(): any;
  abstract getVoid(): void;
  abstract getNull(): null;
  abstract getUndefined(): undefined;
  abstract getNever(): never;
  abstract getObject(): object;
  abstract getObjectShape(): { color: Color; x: number; y: number };
  abstract getRecord(): Record<string, number>;
  abstract getMap(): Map<string, number>;
  // abstract getSet(): Set<string>;
}
