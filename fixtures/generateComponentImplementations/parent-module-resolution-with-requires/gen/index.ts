import { Component } from "../index.js";
import { Module2 } from "../index.js";
import { Module1 } from "../index.js";
export class ComponentImpl extends Component {
    t2() {
        return this._Module2_p2();
    }
    private _Module2;
    private _Module1;
    constructor() {
        super();
        this._Module2 = new Module2();
        this._Module1 = new Module1();
    }
    private _Module2_p2() {
        return this._Module2.p2(this._Module2_synthetic_0());
    }
    private _Module2_synthetic_0() {
        return new Set([this._Module2_p1(), this._Module1_p1()]);
    }
    private _Module2_p1() {
        return this._Module2.p1();
    }
    private _Module1_p1() {
        return this._Module1.p1();
    }
}
