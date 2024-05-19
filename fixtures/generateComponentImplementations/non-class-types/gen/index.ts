import { Component } from "../index.js";
import { Module } from "../index.js";
export class ComponentImpl extends Component {
    getBoolean() {
        return this._Module_provideBoolean();
    }
    getNumber() {
        return this._Module_provideNumber();
    }
    getBigInt() {
        return this._Module_provideBigInt();
    }
    getString() {
        return this._Module_provideString();
    }
    getSymbol() {
        return this._Module_provideSymbol();
    }
    getArray() {
        return this._Module_provideArray();
    }
    getTuple() {
        return this._Module_provideTuple();
    }
    getEnum() {
        return this._Module_provideEnum();
    }
    getUnknown() {
        return this._Module_provideUnknown();
    }
    getAny() {
        return this._Module_provideAny();
    }
    getVoid() {
        return this._Module_provideVoid();
    }
    getNull() {
        return this._Module_provideNull();
    }
    getUndefined() {
        return this._Module_provideUndefined();
    }
    getNever() {
        return this._Module_provideNever();
    }
    getObject() {
        return this._Module_provideObject();
    }
    getObjectShape() {
        return this._Module_provideObjectShape();
    }
    getRecord() {
        return this._Module_provideRecord();
    }
    getMap() {
        return this._Module_provideMap();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
    }
    private _Module_provideBoolean() {
        return this._Module.provideBoolean();
    }
    private _Module_provideNumber() {
        return this._Module.provideNumber(this._Module_provideBoolean());
    }
    private _Module_provideBigInt() {
        return this._Module.provideBigInt(this._Module_provideNumber());
    }
    private _Module_provideString() {
        return this._Module.provideString();
    }
    private _Module_provideSymbol() {
        return this._Module.provideSymbol(this._Module_provideString());
    }
    private _Module_provideArray() {
        return this._Module.provideArray();
    }
    private _Module_provideTuple() {
        return this._Module.provideTuple(this._Module_provideBoolean(), this._Module_provideNumber(), this._Module_provideString());
    }
    private _Module_provideEnum() {
        return this._Module.provideEnum();
    }
    private _Module_provideUnknown() {
        return this._Module.provideUnknown(this._Module_provideAny());
    }
    private _Module_provideAny() {
        return this._Module.provideAny();
    }
    private _Module_provideVoid() {
        return this._Module.provideVoid();
    }
    private _Module_provideNull() {
        return this._Module.provideNull();
    }
    private _Module_provideUndefined() {
        return this._Module.provideUndefined();
    }
    private _Module_provideNever() {
        return this._Module.provideNever();
    }
    private _Module_provideObject() {
        return this._Module.provideObject(this._Module_provideObjectShape());
    }
    private _Module_provideObjectShape() {
        return this._Module.provideObjectShape(this._Module_provideEnum());
    }
    private _Module_provideRecord() {
        return this._Module.provideRecord();
    }
    private _Module_provideMap() {
        return this._Module.provideMap();
    }
}
