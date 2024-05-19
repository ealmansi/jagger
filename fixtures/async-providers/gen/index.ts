import { Component } from "../index.js";
import { Module } from "../index.js";
export class ComponentImpl extends Component {
    t1() {
        return this._Module_p1();
    }
    t2() {
        return this._Module_p2();
    }
    t3() {
        return this._Module_p3();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
    }
    private async _Module_p1() {
        return this._Module.p1();
    }
    private async _Module_p2() {
        return this._Module.p2(await this._Module_p1());
    }
    private async _Module_p3() {
        return this._Module.p3(await this._Module_synthetic_0());
    }
    private async _Module_synthetic_0() {
        return new Set([await this._Module_p2()]);
    }
}
