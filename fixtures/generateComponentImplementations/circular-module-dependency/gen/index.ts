import { Component } from "../index.js";
import { Module1 } from "../index.js";
import { Module2 } from "../index.js";
export class ComponentImpl extends Component {
    t1() {
        return this._Module1_p1();
    }
    t2() {
        return this._Module1_p2();
    }
    t3() {
        return this._Module2_p3();
    }
    t4() {
        return this._Module2_p4();
    }
    private _Module1;
    private _Module2;
    constructor() {
        super();
        this._Module1 = new Module1();
        this._Module2 = new Module2();
    }
    private _Module1_p1() {
        return this._Module1.p1();
    }
    private _Module1_p2() {
        return this._Module1.p2(this._Module2_p3());
    }
    private _Module2_p3() {
        return this._Module2.p3();
    }
    private _Module2_p4() {
        return this._Module2.p4(this._Module1_p1());
    }
}
