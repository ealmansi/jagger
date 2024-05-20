import { Component } from "../index.js";
import { Module } from "../index.js";
export class ComponentImpl extends Component {
    c1() {
        return this._Module_p1();
    }
    c2() {
        return this._Module_p2();
    }
    n() {
        return this._Module_p3();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
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
