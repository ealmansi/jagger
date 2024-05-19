import { Component } from "../index.js";
import { Module } from "../index.js";
export class ComponentImpl extends Component {
    t2() {
        return this._Module_p4();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
    }
    private _Module_p4() {
        return this._Module.p4(this._Module_synthetic_0());
    }
    private _Module_synthetic_0() {
        return new Set([this._Module_p1(), this._Module_p2(), this._Module_p3()]);
    }
    private _Module_p1() {
        return this._Module.p1();
    }
    private _Module_p2() {
        return this._Module.p2();
    }
    private _Module_p3() {
        return this._Module.p3();
    }
}
