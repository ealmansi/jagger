import { Component } from "../index.js";
import { Module } from "../index.js";
export class ComponentImpl extends Component {
    a() {
        return this._Module_pa();
    }
    b() {
        return this._Module_pb();
    }
    c() {
        return this._Module_pc();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
    }
    private _Module_pa() {
        return this._Module.pa();
    }
    private _Module_pb() {
        return this._Module.pb(this._Module_pa(), this._Module_pa());
    }
    private _Module_pc() {
        return this._Module.pc(this._Module_synthetic_0(), this._Module_synthetic_1());
    }
    private _Module_synthetic_0() {
        return undefined;
    }
    private _Module_synthetic_1() {
        return null;
    }
}
