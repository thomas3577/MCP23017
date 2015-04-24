/**
 * MCP23017
 * @param i2c
 * @constructor
 */
var MCP23017 = function (i2c) {
    this.DIRECTION_GPIOA = 0x00;
    this.DIRECTION_GPIOB = 0x01;
    this.DIRECTION_VALUE = 0xff;
    this.FROM_GPIOA = 0x12;
    this.FROM_GPIOB = 0x13;
    this.TO_GPIOA = 0x14;
    this.TO_GPIOB = 0x15;
    this.ALLOWED_VALUES = [0, 1, true, false];

    this._i2c = i2c;
    this._valueA = 0x0;
    this._valueB = 0x0;

    this._onError = null;

    this._onErrorEvent = function(error) {
        if (this._onError !== null) {
            this._onError(error);
        }
    };

    this._initGpioA = function () {
        this._send([this.DIRECTION_GPIOA, this._directionValueA]);
        this._send([this.TO_GPIOA, 0x0]);
    };

    this._initGpioB = function () {
        this._send([this.DIRECTION_GPIOB, this._directionValueB]);
        this._send([this.TO_GPIOB, 0x0]);
    };

    this._send = function (content) {
        var that = this,
            buffer = new Buffer(content);

        this._i2c.send(buffer, function (error) {
            if (error) {
                that._onErrorEvent(['MCP23017 > send >', error]);
            }
        });
    };

    this._receive = function (content, callback) {
        var that = this;

        this._i2c.transfer(content, content.length, function (error, response) {
            if (error) {
                that._onErrorEvent(['MCP23017 > receive >', error]);
                callback(error, null);
            } else {
                callback(null, response[0]);
            }
        });
    };

    this._parseValue = function(value, callback) {
        var isValid = false,
            error = null,
            parsedValue = value;

        if (value !== undefined && value !== null) {
            for(var i = 0, allowedValue; i < this.ALLOWED_VALUES.length; i++) {
                allowedValue = this.ALLOWED_VALUES[i];

                if (allowedValue === value) {
                    isValid = true;
                }
            }
        }

        if (isValid === true) {
            if (value === false || value === 0) {
                parsedValue = this.LOW;
            } else if (value === true || value === 1) {
                parsedValue = this.HIGH;
            } else {
                isValid = false;
            }
        }

        if (isValid !== true) {
            error = 'invalid value';
        }

        callback(error, parsedValue);
    };

    this._isValidPin = function(pin) {
        var isValid = true;

        if (isNaN(pin) || pin > 15 || pin < 0) {
            isValid = false;
        }

        return isValid;
    };

    this._getPinHexMask = function(pin) {
        return Math.pow(2, pin);
    };

    this._setGPIODirection = function(pin, direction, register) {
        var pinHexMask = this._getPinHexMask(pin),
            registerValue;

        if (register === this.DIRECTION_GPIOA) {
            if (direction === this.OUTPUT) {
                if ((this._directionValueA & pinHexMask) === pinHexMask) {
                    this._directionValueA = this._directionValueA ^ pinHexMask;
                    registerValue = this._directionValueA;
                }
            } else if (direction === this.INPUT) {
                if ((this._directionValueA & pinHexMask) !== pinHexMask) {
                    this._directionValueA = this._directionValueA ^ pinHexMask;
                    registerValue = this._directionValueA;
                }
            }
        }

        if (register === this.DIRECTION_GPIOB) {
            if (direction === this.OUTPUT) {
                if ((this._directionValueB & pinHexMask) === pinHexMask) {
                    this._directionValueB = this._directionValueB ^ pinHexMask;
                    registerValue = this._directionValueB;
                }
            } else if (direction === this.INPUT) {
                if ((this._directionValueB & pinHexMask) !== pinHexMask) {
                    this._directionValueB = this._directionValueB ^ pinHexMask;
                    registerValue = this._directionValueB;
                }
            }
        }

        this._send([register, registerValue]);
    };

    this._setGPIOAPinValue = function (pin, value) {
        var pinHexMask = this._getPinHexMask(pin);

        if (value === 0) {
            if ((this._valueA & pinHexMask) === pinHexMask) {
                this._valueA = this._valueA ^ pinHexMask;
                this._send([this.TO_GPIOA, this._valueA]);
            }
        }

        if (value === 1) {
            if ((this._valueA & pinHexMask) !== pinHexMask) {
                this._valueA = this._valueA ^ pinHexMask;
                this._send([this.TO_GPIOA, this._valueA]);
            }
        }
    };

    this._setGPIOBPinValue = function (pin, value) {
        var pinHexMask = this._getPinHexMask(pin);

        if (value === 0) {
            if ((this._valueB & pinHexMask) === pinHexMask) {
                this._valueB = this._valueB ^ pinHexMask;
                this._send([this.TO_GPIOB, this._valueB]);
            }
        }

        if (value === 1) {
            if ((this._valueB & pinHexMask) !== pinHexMask) {
                this._valueB = this._valueB ^ pinHexMask;
                this._send([this.TO_GPIOB, this._valueB]);
            }
        }
    };

    this.reset();
};

MCP23017.HIGH = 1;
MCP23017.LOW = 0;
MCP23017.INPUT = 1;
MCP23017.OUTPUT = 0;

MCP23017.prototype = {
    reset: function() {
        this._directionValueA = this.DIRECTION_VALUE;
        this._directionValueB = this.DIRECTION_VALUE;
        this._initGpioA();
        this._initGpioB();
    },
    /**
     * @param pin
     * @param direction
     */
    pinMode: function(pin, direction) {
        var register = pin >= 8 ? this.DIRECTION_GPIOB : this.DIRECTION_GPIOA,
            registerPin = pin >= 8 ? pin - 8 : pin;

        this._setGPIODirection(registerPin, direction, register);
    },
    /**
     * @param pin
     * @param value
     */
    digitalWrite: function(pin, value) {
        var that = this;

        this._parseValue(value, function(error, parsedValue) {
            if (error) {
                that._onErrorEvent(['MCP23017 > digital write >', error, parsedValue]);
            } else {
                if (that._isValidPin(pin) === true) {
                    if (pin < 8 ) {
                        that._setGPIOAPinValue(pin, parsedValue);
                    } else {
                        pin -= 8;
                        that._setGPIOBPinValue(pin, parsedValue);
                    }
                }
            }
        });
    },
    /**
     * @param pin
     * @param callback
     */
    digitalRead: function(pin, callback) {
        var register = pin >= 8 ? this.FROM_GPIOB : this.FROM_GPIOA,
            registerPin = pin >= 8 ? pin - 8 : pin,
            pinHexMask = this._getPinHexMask(registerPin);

        this._receive(register, function (error, registerValue) {
            if (error) {
                this._onErrorEvent('MCP23017 > digital read >' + error);
                callback(error, null);
            } else if ((registerValue & pinHexMask) === pinHexMask) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        });
    },
    on: function (event, callback) {
        if (event === 'error') {
            this._onError = callback;
        }
    },
    /**
     * @returns {number|*}
     * @constructor
     */
    get DirectionValueA() {
        return this._directionValueA;
    },
    /**
     * @returns {number|*}
     * @constructor
     */
    get DirectionValueB() {
        return this._directionValueB;
    },
    /**
     * @returns {number}
     * @constructor
     */
    get ValueA() {
        return this._valueA;
    },
    /**
     * @returns {number}
     * @constructor
     */
    get ValueB() {
        return this._valueB;
    }
};

module.exports = MCP23017;