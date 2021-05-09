const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const { promisify } = require('util')
const { pipeline } = require('stream')
const pipe = promisify(pipeline);

const parseArgs = () => {
    const flags = {
        shift: ['-s', '--shift'],
        input: ['-i', '--input'],
        output: ['-o', '--output'],
        action: ['-a', '--action'],
    }

    const args = process.argv.slice(2);
    const passedParams = {};

    // Get object of entered params
    Object.entries(flags).forEach(([prop, flagArr]) => {
        flagArr.forEach((flag) => {
            const argvIdx = args.indexOf(flag);
            if (argvIdx > -1 && !!args[argvIdx + 1]) {
                passedParams[prop] = args[argvIdx + 1]
            }
        })
    });

    if (!passedParams.action || !passedParams.shift) {
        throw Error('Action and shift flags are required!')
    }
    if (isNaN(Number(passedParams.shift))) {
        throw Error('Shift must be a number!')
    }
    if (['encode', 'decode'].indexOf(passedParams.action) === -1) {
        throw Error('Action can only be "encode" or "decode"!')
    }

    return passedParams;
}

const encrypt = (text, action, shif) => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const lngth = alphabet.length;
    const lower = alphabet.split('')
    const capital = alphabet.toUpperCase().split('')
    const shift = action === 'decode' ? Number(shif) * -1 :  Number(shif);

    return text.split('').reduce((str, letter) => {
        // lower letter
        if (/[a-z]/.test(letter)) {
            str += lower[(lower.indexOf(letter) + shift + lngth) % lngth];
        }
        // capital letter
        else if (/[A-Z]/.test(letter)) {
            str += capital[(capital.indexOf(letter) + shift + lngth) % lngth];
        }
        // other chars
        else {
            str += letter;
        }

        return str
    }, '');
};

const read = (filePath = '') => {
    const file = path.join(__dirname, filePath)

    if(!filePath || !fs.existsSync(file)) {
        return process.stdin
    }

    return fs.createReadStream(file)
}

const transform = (action, shift) => new Transform({
    transform(chunk, _, cb) {
        cb(null, encrypt(chunk.toString(), action, shift))
    }
});

const write = (filePath = '') => {
    const file = path.join(__dirname, filePath)

    if(!filePath || !fs.existsSync(file)) {
        return process.stdin
    }

    return fs.createWriteStream(file)
}

const run = async () => {
    let conf;
    try {
        conf = parseArgs();
    } catch (err) {
        process.stderr.write(err.message + '\n')
        process.exit(1)
    }

    pipe(
        read(conf.input || ''),
        transform(conf.action, conf.shift),
        write(conf.output || ''),
    )
        .catch((err) => process.stderr.write(err))
}

run()
