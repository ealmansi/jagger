import { Component } from "../index.js";
import { Module } from "../index.js";
export class ComponentImpl extends Component {
    u1() {
        return this._Module_u1();
    }
    u2() {
        return this._Module_u2();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
    }
    private _Module_u1() {
        return this._Module.u1(this._Module_synthetic_0());
    }
    private _Module_synthetic_0() {
        return new Set([this._Module_b1(), this._Module_b2(), this._Module_b3()]);
    }
    private _Module_b1() {
        return this._Module.b1();
    }
    private _Module_b2() {
        return this._Module.b2();
    }
    private _Module_b3() {
        return this._Module.b3();
    }
    private _Module_u2() {
        return this._Module.u2(this._Module_a());
    }
    private _Module_a() {
        return this._Module.a(this._Module_d1(), this._Module_d2(), this._Module_d3());
    }
    private _Module_d1() {
        return this._Module.d1();
    }
    private _Module_d2() {
        return this._Module.d2();
    }
    private _Module_d3() {
        return this._Module.d3();
    }
}
